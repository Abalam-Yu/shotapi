import { createHash } from "node:crypto";

import { Redis } from "@upstash/redis";

import { config } from "./config";
import { ApiError } from "./errors";

export type MintLimitScope = "cooldown" | "ip" | "email" | "hour" | "day";

export type MintLimitResult =
  | { allowed: true }
  | {
      allowed: false;
      scope: MintLimitScope;
      retryAfterSeconds: number;
      message: string;
    };

type WindowEntry = { count: number; resetAt: number };

const windows = new Map<string, WindowEntry>();
const cooldowns = new Map<string, number>();
let redisClient: Redis | null = null;

export function resetFreeMintLimits(): void {
  windows.clear();
  cooldowns.clear();
  redisClient = null;
}

function digest(kind: string, value: string): string {
  return createHash("sha256").update(`shotapi-free-mint:v1:${kind}:${value}`).digest("hex").slice(0, 32);
}

function waitPhrase(seconds: number): string {
  if (seconds >= 7200) return `${Math.ceil(seconds / 3600)} hours`;
  if (seconds >= 3600) return "1 hour";
  if (seconds >= 120) return `${Math.ceil(seconds / 60)} minutes`;
  if (seconds >= 60) return "1 minute";
  return `${Math.max(1, seconds)} seconds`;
}

function deny(scope: MintLimitScope, retryAfterSeconds: number): MintLimitResult {
  const wait = waitPhrase(retryAfterSeconds);
  const message =
    scope === "cooldown"
      ? `Wait ${wait} before minting another Free key from this network.`
      : scope === "ip"
        ? `This network reached the Free key limit. Try again in ${wait}.`
        : scope === "email"
          ? `This email reached the Free key limit. Try again in ${wait}.`
          : `Free key minting is paused until the public limit resets. Try again in ${wait}.`;
  return { allowed: false, scope, retryAfterSeconds, message };
}

function retryAfterWindow(nowMs: number, windowSec: number): number {
  const windowMs = windowSec * 1000;
  const resetAt = (Math.floor(nowMs / windowMs) + 1) * windowMs;
  return Math.max(1, Math.ceil((resetAt - nowMs) / 1000));
}

type Bucket = {
  scope: Exclude<MintLimitScope, "cooldown">;
  id: string;
  limit: number;
  windowSec: number;
};

function bucketsFor(ip: string, email?: string): Bucket[] {
  const buckets: Bucket[] = [
    {
      scope: "hour",
      id: digest("hour", "global"),
      limit: config.freeKeyGlobalLimit(),
      windowSec: config.freeKeyGlobalWindowSec(),
    },
    {
      scope: "day",
      id: digest("day", "global"),
      limit: config.freeKeyDailyLimit(),
      windowSec: config.freeKeyDailyWindowSec(),
    },
    {
      scope: "ip",
      id: digest("ip", ip || "unknown"),
      limit: config.freeKeyIpLimit(),
      windowSec: config.freeKeyIpWindowSec(),
    },
  ];
  if (email) {
    buckets.push({
      scope: "email",
      id: digest("email", email),
      limit: config.freeKeyEmailLimit(),
      windowSec: config.freeKeyEmailWindowSec(),
    });
  }
  return buckets;
}

function gc(now: number): void {
  if (windows.size <= 4000 && cooldowns.size <= 4000) return;
  for (const [key, entry] of windows) {
    if (entry.resetAt <= now) windows.delete(key);
  }
  for (const [key, until] of cooldowns) {
    if (until <= now) cooldowns.delete(key);
  }
}

function windowKey(id: string, nowMs: number, windowSec: number): { key: string; resetAt: number } {
  const windowMs = windowSec * 1000;
  const slot = Math.floor(nowMs / windowMs);
  return { key: `shotapi:mint:v1:${id}:${slot}`, resetAt: (slot + 1) * windowMs };
}

function consumeMemory(ip: string, email: string | undefined, now: number): MintLimitResult {
  gc(now);
  const ipHash = digest("ip", ip || "unknown");
  const cooldownSec = config.freeKeyCooldownSec();
  if (cooldownSec > 0) {
    const until = cooldowns.get(ipHash) ?? 0;
    if (until > now) {
      return deny("cooldown", Math.max(1, Math.ceil((until - now) / 1000)));
    }
  }

  const buckets = bucketsFor(ip, email);
  const pending: Array<{ key: string; resetAt: number }> = [];
  for (const bucket of buckets) {
    const slot = windowKey(bucket.id, now, bucket.windowSec);
    const entry = windows.get(slot.key);
    const count = entry && entry.resetAt === slot.resetAt ? entry.count : 0;
    if (count >= bucket.limit) {
      return deny(bucket.scope, retryAfterWindow(now, bucket.windowSec));
    }
    pending.push(slot);
  }
  for (const slot of pending) {
    const entry = windows.get(slot.key);
    const count = entry && entry.resetAt === slot.resetAt ? entry.count : 0;
    windows.set(slot.key, { count: count + 1, resetAt: slot.resetAt });
  }
  if (cooldownSec > 0) cooldowns.set(ipHash, now + cooldownSec * 1000);
  return { allowed: true };
}

function upstash(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redisClient ??= new Redis({ url, token });
  return redisClient;
}

async function redisCall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error(
      JSON.stringify({
        msg: "free_mint_limit_error",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    throw new ApiError(503, "storage_unavailable", "Free key minting is temporarily unavailable");
  }
}

async function consumeRedis(redis: Redis, ip: string, email: string | undefined, now: number): Promise<MintLimitResult> {
  const cooldownSec = config.freeKeyCooldownSec();
  const coolKey = `shotapi:mint:v1:cool:${digest("ip", ip || "unknown")}`;
  if (cooldownSec > 0) {
    const ttl = Number(await redis.ttl(coolKey));
    if (Number.isFinite(ttl) && ttl > 0) return deny("cooldown", ttl);
  }

  const taken: string[] = [];
  for (const bucket of bucketsFor(ip, email)) {
    const slot = windowKey(bucket.id, now, bucket.windowSec);
    const count = Number(await redis.incr(slot.key));
    const ttl = Number(await redis.ttl(slot.key));
    if (!Number.isFinite(ttl) || ttl < 1) await redis.expire(slot.key, bucket.windowSec);
    if (!Number.isFinite(count) || count > bucket.limit) {
      await rollback(redis, taken);
      return deny(bucket.scope, retryAfterWindow(now, bucket.windowSec));
    }
    taken.push(slot.key);
  }
  try {
    if (cooldownSec > 0) await redis.set(coolKey, "1", { ex: cooldownSec });
  } catch (error) {
    await rollback(redis, taken);
    throw error;
  }
  return { allowed: true };
}

async function rollback(redis: Redis, keys: string[]): Promise<void> {
  for (const key of keys) {
    try {
      const next = Number(await redis.decr(key));
      if (Number.isFinite(next) && next <= 0) await redis.del(key);
    } catch (error) {
      console.error(
        JSON.stringify({
          msg: "free_mint_limit_rollback",
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }
}

/**
 * Fixed-window counters for public Free key minting.
 * Upstash shares them across instances. Otherwise they live in this process,
 * which matches the file and memory stores: a new instance starts a new window.
 * A denied request does not consume earlier windows. The window that rejected
 * it keeps the increment when Redis is the store.
 */
export async function consumeFreeMint(input: { ip: string; email?: string; now?: number }): Promise<MintLimitResult> {
  const now = input.now ?? Date.now();
  const email = input.email?.trim().toLowerCase() || undefined;
  const redis = upstash();
  if (redis) return redisCall(() => consumeRedis(redis, input.ip, email, now));
  return consumeMemory(input.ip, email, now);
}
