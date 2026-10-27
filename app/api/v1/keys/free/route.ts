import { randomUUID } from "node:crypto";
import { z } from "zod";

import { config } from "@/lib/config";
import { clientIp } from "@/lib/client-ip";
import { ApiError } from "@/lib/errors";
import { consumeFreeMint } from "@/lib/free-mint-limit";
import { empty, errorResponse, json, readJson } from "@/lib/http";
import { generateKeySecret, makeKeyRecord } from "@/lib/keys";
import { getStore } from "@/lib/store";
import { quotaFor } from "@/lib/usage";

export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const freeKeySchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  email: z.string().trim().max(120).optional(),
  plan: z.string().trim().max(20).optional(),
});

function normalizeEmail(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  const email = value.trim().toLowerCase();
  if (email.length > 120 || !EMAIL.test(email)) {
    throw new ApiError(400, "invalid_request", "Email must be a valid address up to 120 characters");
  }
  return email;
}

export function OPTIONS() {
  return empty();
}

/**
 * Public Free-tier mint. Plan is always demo (SHOTAPI_QUOTA_DEMO, default 100).
 * Operator credentials are not read here, and this route cannot create a Pro key.
 */
export async function POST(request: Request) {
  const requestId = randomUUID();
  try {
    if (!config.freeKeysEnabled()) {
      throw new ApiError(404, "free_keys_disabled", "Public Free key minting is turned off");
    }
    const parsed = freeKeySchema.safeParse(await readJson(request, 20_000));
    if (!parsed.success) {
      throw new ApiError(400, "invalid_request", parsed.error.issues[0]?.message ?? "Invalid request");
    }
    const requested = parsed.data.plan?.toLowerCase();
    if (requested && requested !== "demo" && requested !== "free") {
      throw new ApiError(
        400,
        "invalid_request",
        "Public mint creates Free keys only. Upgrade that key with POST /api/v1/billing/checkout.",
      );
    }
    const email = normalizeEmail(parsed.data.email);
    const decision = await consumeFreeMint({ ip: clientIp(request), email });
    if (!decision.allowed) {
      throw new ApiError(429, "rate_limited", decision.message, {
        retryAfterSeconds: decision.retryAfterSeconds,
        scope: decision.scope,
      });
    }

    const plan = "demo" as const;
    const secret = generateKeySecret(plan);
    const record = makeKeyRecord({
      secret,
      name: parsed.data.name ?? "Free key",
      plan,
    });
    const store = await getStore();
    await store.insertKey(record);
    console.log(
      JSON.stringify({
        msg: "free_key_minted",
        requestId,
        keyId: record.id,
        plan: record.plan,
        limit: quotaFor(plan),
      }),
    );
    return json(
      {
        key: secret,
        id: record.id,
        prefix: record.prefix,
        name: record.name,
        plan: record.plan,
        tier: "free",
        limit: quotaFor(plan),
        period: "month",
      },
      201,
      { "x-request-id": requestId },
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        msg: "free_key_error",
        requestId,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return errorResponse(error, requestId);
  }
}
