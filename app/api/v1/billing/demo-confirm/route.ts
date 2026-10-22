import { randomUUID } from "node:crypto";

import { confirmDemoCheckout } from "@/lib/billing";
import { ApiError } from "@/lib/errors";
import { empty, errorResponse, json, readJson } from "@/lib/http";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return empty();
}

export async function POST(request: Request) {
  const requestId = randomUUID();
  try {
    const body = await readJson(request, 20_000);
    const token = body && typeof body === "object" && "token" in body && typeof body.token === "string" ? body.token : "";
    if (!token) throw new ApiError(400, "invalid_request", 'Expected { "token": "..." }');
    const store = await getStore();
    const result = await confirmDemoCheckout(store, token);
    return json({ mode: "demo", ...result }, 200, { "x-request-id": requestId });
  } catch (error) {
    console.error(
      JSON.stringify({
        msg: "demo_confirm_error",
        requestId,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return errorResponse(error, requestId);
  }
}
