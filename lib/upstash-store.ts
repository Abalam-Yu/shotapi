import { randomBytes } from "node:crypto";
import { Redis } from "@upstash/redis";

import { ApiError } from "./errors";
import type { ApiKeyRecord, RenderEvent, Store, UsageSnapshot } from "./types";

function isKey(value: unknown): value is ApiKeyRecord {
  if (!value || typeof value !== "object") return false;
  const key = value as Partial<ApiKeyRecord>;
  return typeof key.id === "string" && typeof key.keyHash === "string" && typeof key.plan === "string";
}

function isEvent(value: unknown): value is RenderEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<RenderEvent>;
  return typeof event.id === "string" && typeof event.keyId === "string" && typeof event.format === "string";
}

export function createUpstashStore(options: { url: string; token: string }): Store {
  const redis = new Redis({ url: options.url, token: options.token });
  const secretKey = "shotapi:secret";
  const hashKey = (hash: string) => `shotapi:hash:${hash}`;
  const idKey = (id: string) => `shotapi:key:${id}`;
  const usageCountKey = (id: string, period: string) => `shotapi:usage:${id}:${period}`;
  const usageBytesKey = (id: string, period: string) => `shotapi:bytes:${id}:${period}`;
  const eventsKey = (id: string) => `shotapi:events:${id}`;

  async function call<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error(
        JSON.stringify({
          msg: "upstash_error",
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      throw new ApiError(503, "storage_unavailable", "Usage store is unavailable");
    }
  }

  return {
    kind: "upstash",
    persistent: true,
    async getSecret() {
      return call(async () => {
        const current = await redis.get<string>(secretKey);
        if (typeof current === "string" && current.length > 0) return current;
        const created = randomBytes(32).toString("hex");
        await redis.set(secretKey, created, { nx: true });
        const stored = await redis.get<string>(secretKey);
        return typeof stored === "string" && stored.length > 0 ? stored : created;
      });
    },
    async findKeyByHash(hash) {
      return call(async () => {
        const id = await redis.get<string>(hashKey(hash));
        if (typeof id !== "string") return null;
        const record = await redis.get<unknown>(idKey(id));
        return isKey(record) ? record : null;
      });
    },
    async findKeyById(id) {
      return call(async () => {
        const record = await redis.get<unknown>(idKey(id));
        return isKey(record) ? record : null;
      });
    },
    async insertKey(record) {
      return call(async () => {
        const existing = await redis.get<string>(hashKey(record.keyHash));
        if (existing) throw new ApiError(409, "key_exists", "An API key with this hash already exists");
        await redis.set(hashKey(record.keyHash), record.id);
        await redis.set(idKey(record.id), record);
      });
    },
    async updateKey(record) {
      return call(async () => {
        const existing = await redis.get<unknown>(idKey(record.id));
        if (!isKey(existing)) throw new ApiError(404, "not_found", "API key not found");
        await redis.set(idKey(record.id), record);
      });
    },
    async getUsage(keyId, period) {
      return call(async () => {
        const count = Number((await redis.get<number | string>(usageCountKey(keyId, period))) ?? 0);
        const bytes = Number((await redis.get<number | string>(usageBytesKey(keyId, period))) ?? 0);
        return {
          count: Number.isFinite(count) ? count : 0,
          bytes: Number.isFinite(bytes) ? bytes : 0,
        } satisfies UsageSnapshot;
      });
    },
    async addUsage(keyId, period, bytes) {
      return call(async () => {
        const count = await redis.incr(usageCountKey(keyId, period));
        const totalBytes = await redis.incrby(usageBytesKey(keyId, period), bytes);
        return { count: Number(count), bytes: Number(totalBytes) };
      });
    },
    async addEvent(event) {
      return call(async () => {
        await redis.lpush(eventsKey(event.keyId), event);
        await redis.ltrim(eventsKey(event.keyId), 0, 29);
      });
    },
    async listEvents(keyId, limit) {
      return call(async () => {
        const rows = await redis.lrange<unknown>(eventsKey(keyId), 0, Math.max(0, limit - 1));
        return rows.filter(isEvent);
      });
    },
  };
}
