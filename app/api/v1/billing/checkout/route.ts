import { randomUUID } from "node:crypto";

import { authenticateRequest } from "@/lib/auth";
import { createCheckout } from "@/lib/billing";
import { empty, errorResponse, json, requestOrigin } from "@/lib/http";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return empty();
}

export async function POST(request: Request) {
  const requestId = randomUUID();
  try {
    const store = await getStore();
    const key = await authenticateRequest(request, store);
    const result = await createCheckout(store, key, requestOrigin(request));
    return json(result, 200, { "x-request-id": requestId });
  } catch (error) {
    console.error(
      JSON.stringify({
        msg: "checkout_error",
        requestId,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return errorResponse(error, requestId);
  }
}
