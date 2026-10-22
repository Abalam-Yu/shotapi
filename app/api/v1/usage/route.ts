import { randomUUID } from "node:crypto";

import { authenticateRequest } from "@/lib/auth";
import { empty, errorResponse, json } from "@/lib/http";
import { getStore } from "@/lib/store";
import { currentPeriod, quotaFor } from "@/lib/usage";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return empty();
}

export async function GET(request: Request) {
  const requestId = randomUUID();
  try {
    const store = await getStore();
    const key = await authenticateRequest(request, store);
    const period = currentPeriod();
    const usage = await store.getUsage(key.id, period);
    const limit = quotaFor(key.plan);
    const recent = await store.listEvents(key.id, 10);
    return json(
      {
        key: { id: key.id, name: key.name, prefix: key.prefix, plan: key.plan },
        period,
        used: usage.count,
        limit,
        remaining: Math.max(0, limit - usage.count),
        bytesOut: usage.bytes,
        storage: store.kind,
        persistent: store.persistent,
        recent,
      },
      200,
      { "x-request-id": requestId },
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        msg: "usage_error",
        requestId,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return errorResponse(error, requestId);
  }
}
