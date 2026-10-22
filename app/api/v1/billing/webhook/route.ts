import { randomUUID } from "node:crypto";

import { getStripe, handleStripeEvent } from "@/lib/billing";
import { ApiError } from "@/lib/errors";
import { errorResponse, json } from "@/lib/http";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = randomUUID();
  try {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
      throw new ApiError(
        501,
        "billing_disabled",
        "Stripe webhook is not configured. In demo mode, POST /api/v1/billing/checkout and open the mock checkout URL.",
      );
    }
    const signature = request.headers.get("stripe-signature");
    if (!signature) throw new ApiError(400, "invalid_signature", "Missing Stripe-Signature header");
    const raw = await request.text();
    const stripe = await getStripe();
    const event = stripe.webhooks.constructEvent(raw, signature, process.env.STRIPE_WEBHOOK_SECRET);
    const store = await getStore();
    await handleStripeEvent(store, event);
    console.log(JSON.stringify({ msg: "stripe_webhook", requestId, type: event.type }));
    return json({ received: true }, 200, { "x-request-id": requestId });
  } catch (error) {
    if (!(error instanceof ApiError) && error instanceof Error && /signature/i.test(error.message)) {
      console.error(JSON.stringify({ msg: "stripe_signature_failed", requestId, error: error.message }));
      return errorResponse(new ApiError(400, "invalid_signature", "Stripe signature verification failed"), requestId);
    }
    console.error(
      JSON.stringify({
        msg: "webhook_error",
        requestId,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return errorResponse(error, requestId);
  }
}
