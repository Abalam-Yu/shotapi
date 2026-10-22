import { createHmac, timingSafeEqual } from "node:crypto";

import { ApiError } from "../errors";
import type { ApiKeyRecord, Store } from "../types";
import type { CheckoutResult } from "./types";
import { resolveBillingProvider } from "./provider";

type DemoPayload = {
  keyId: string;
  exp: number;
  purpose: "demo-checkout";
};

export function signDemoToken(secret: string, keyId: string, now = Date.now()): string {
  const body = Buffer.from(
    JSON.stringify({ keyId, exp: now + 30 * 60 * 1000, purpose: "demo-checkout" } satisfies DemoPayload),
  ).toString("base64url");
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifyDemoToken(secret: string, token: string): { keyId: string } {
  const [body, signature] = token.split(".");
  if (!body || !signature || token.split(".").length !== 2) {
    throw new ApiError(400, "invalid_token", "Checkout token is invalid");
  }
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new ApiError(400, "invalid_token", "Checkout token is invalid");
  }
  let payload: Partial<DemoPayload>;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString()) as Partial<DemoPayload>;
  } catch {
    throw new ApiError(400, "invalid_token", "Checkout token is invalid");
  }
  if (payload.purpose !== "demo-checkout" || typeof payload.keyId !== "string" || typeof payload.exp !== "number") {
    throw new ApiError(400, "invalid_token", "Checkout token is invalid");
  }
  if (payload.exp < Date.now()) throw new ApiError(400, "invalid_token", "Checkout token has expired");
  return { keyId: payload.keyId };
}

export async function createDemoCheckout(store: Store, key: ApiKeyRecord, origin: string): Promise<CheckoutResult> {
  const token = signDemoToken(await store.getSecret(), key.id);
  return { mode: "demo", url: `${origin}/billing/mock?token=${encodeURIComponent(token)}` };
}

export async function confirmDemoCheckout(store: Store, token: string): Promise<{ id: string; prefix: string; plan: "pro" }> {
  if (resolveBillingProvider() !== "demo") {
    throw new ApiError(404, "not_found", "Demo checkout is disabled because the billing provider is not demo");
  }
  const { keyId } = verifyDemoToken(await store.getSecret(), token);
  const key = await store.findKeyById(keyId);
  if (!key) throw new ApiError(404, "not_found", "API key for this checkout no longer exists");
  key.plan = "pro";
  await store.updateKey(key);
  return { id: key.id, prefix: key.prefix, plan: "pro" };
}
