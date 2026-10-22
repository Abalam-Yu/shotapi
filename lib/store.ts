import { config, isDemoMode } from "./config";
import { createFileStore } from "./file-store";
import { hashKey, makeKeyRecord } from "./keys";
import { createMemoryStore } from "./memory-store";
import type { Store } from "./types";
import { createUpstashStore } from "./upstash-store";

let cached: Promise<Store> | null = null;

export async function ensureDemoKey(store: Store): Promise<void> {
  if (!isDemoMode()) return;
  const secret = config.demoKey();
  const existing = await store.findKeyByHash(hashKey(secret));
  if (existing) return;
  await store.insertKey(
    makeKeyRecord({
      secret,
      name: "Local demo",
      plan: "demo",
      seededDemo: true,
    }),
  );
}

async function openStore(): Promise<Store> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return createUpstashStore({ url, token });
  if (process.env.VERCEL && process.env.SHOTAPI_ALLOW_FILE_STORE !== "1") return createMemoryStore();
  return createFileStore(config.dataDir());
}

async function createDefaultStore(): Promise<Store> {
  const store = await openStore();
  await ensureDemoKey(store);
  return store;
}

export function getStore(): Promise<Store> {
  cached ??= createDefaultStore();
  return cached;
}

export function resetStoreCache(): void {
  cached = null;
}
