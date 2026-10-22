import { randomUUID } from "node:crypto";

import { receiveCreemWebhook } from "@/lib/billing";
import { errorResponse, json } from "@/lib/http";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = randomUUID();
  try {
    const raw = await request.text();
    const store = await getStore();
    const event = await receiveCreemWebhook(store, raw, request.headers);
    console.log(JSON.stringify({ msg: "creem_webhook", requestId, type: event.type }));
    return json({ received: true }, 200, { "x-request-id": requestId });
  } catch (error) {
    console.error(
      JSON.stringify({
        msg: "creem_webhook_error",
        requestId,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return errorResponse(error, requestId);
  }
}
