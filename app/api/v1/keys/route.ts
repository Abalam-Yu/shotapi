import { randomUUID } from "node:crypto";
import { z } from "zod";

import { adminAuthorized, generateKeySecret, makeKeyRecord } from "@/lib/keys";
import { ApiError } from "@/lib/errors";
import { empty, errorResponse, json, readJson } from "@/lib/http";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

const createKeySchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  plan: z.enum(["demo", "pro"]).optional(),
});

export function OPTIONS() {
  return empty();
}

export async function POST(request: Request) {
  const requestId = randomUUID();
  try {
    if (!process.env.SHOTAPI_ADMIN_TOKEN) {
      throw new ApiError(503, "admin_disabled", "Set SHOTAPI_ADMIN_TOKEN to create API keys");
    }
    if (!adminAuthorized(request)) {
      throw new ApiError(401, "unauthorized", "Admin token is invalid");
    }
    const parsed = createKeySchema.safeParse(await readJson(request, 20_000));
    if (!parsed.success) {
      throw new ApiError(400, "invalid_request", parsed.error.issues[0]?.message ?? "Invalid request");
    }
    const plan = parsed.data.plan ?? "demo";
    const secret = generateKeySecret(plan);
    const record = makeKeyRecord({
      secret,
      name: parsed.data.name ?? "API key",
      plan,
    });
    const store = await getStore();
    await store.insertKey(record);
    return json(
      {
        key: secret,
        id: record.id,
        prefix: record.prefix,
        name: record.name,
        plan: record.plan,
      },
      201,
      { "x-request-id": requestId },
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        msg: "keys_error",
        requestId,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return errorResponse(error, requestId);
  }
}
