import { randomUUID } from "node:crypto";

import { findChrome } from "@/lib/chrome";
import { billingStatus, isDemoMode, resolveDriver } from "@/lib/config";
import { errorResponse, json } from "@/lib/http";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

function browser(): "sparticuz" | "chrome" | "missing" {
  if (resolveDriver() === "sparticuz") return "sparticuz";
  try {
    return findChrome() ? "chrome" : "missing";
  } catch {
    return "missing";
  }
}

export async function GET() {
  const requestId = randomUUID();
  try {
    const store = await getStore();
    return json(
      {
        ok: true,
        driver: resolveDriver(),
        browser: browser(),
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
