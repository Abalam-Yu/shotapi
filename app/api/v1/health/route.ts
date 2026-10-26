import { randomUUID } from "node:crypto";

import { browserStatus } from "@/lib/browser-status";
import { billingStatus, isDemoMode, resolveDriver } from "@/lib/config";
import { errorResponse, json } from "@/lib/http";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = randomUUID();
  try {
    const store = await getStore();
    const browser = await browserStatus();
    return json(
      {
        ok: browser !== "missing",
        driver: resolveDriver(),
        browser,
        billing: billingStatus(),
        storage: store.kind,
        persistent: store.persistent,
        demo: isDemoMode(),
      },
      200,
      { "x-request-id": requestId },
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        msg: "health_error",
        requestId,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return errorResponse(error, requestId);
  }
}
