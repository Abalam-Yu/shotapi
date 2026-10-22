import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import type { ApiKeyRecord, Plan } from "./types";

export function hashKey(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function generateKeySecret(plan: Plan): string {
  const kind = plan === "pro" ? "live" : "test";
  return `sk_${kind}_${randomBytes(24).toString("base64url")}`;
}

export function makeKeyRecord(input: {
  secret: string;
  name: string;
  plan: Plan;
  seededDemo?: boolean;
}): ApiKeyRecord {
  return {
    id: `key_${randomBytes(8).toString("hex")}`,
    name: input.name,
    keyHash: hashKey(input.secret),
    prefix: input.secret.slice(0, 16),
    plan: input.plan,
    createdAt: new Date().toISOString(),
    seededDemo: input.seededDemo || undefined,
  };
}

export function readPresentedKey(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (authorization) {
    const match = /^Bearer\s+(\S+)\s*$/i.exec(authorization);
    if (match?.[1]) return match[1];
  }
  const header = request.headers.get("x-api-key");
  if (header?.trim()) return header.trim();
  return null;
}

export function adminAuthorized(request: Request): boolean {
  const expected = process.env.SHOTAPI_ADMIN_TOKEN;
  const presented = readPresentedKey(request);
  if (!expected || !presented) return false;
  const left = Buffer.from(presented);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
