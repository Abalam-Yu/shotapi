import type Stripe from "stripe";

import { ApiError } from "../errors";
import type { ApiKeyRecord, Store } from "../types";
import type { CheckoutResult } from "./types";
import { applyPlan } from "./plan";

let stripeClient: Promise<Stripe> | null = null;

export async function getStripe(): Promise<Stripe> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new ApiError(501, "billing_disabled", "Stripe is not configured");
  stripeClient ??= import("stripe").then(({ default: StripeCtor }) => new StripeCtor(key, { typescript: true }));
  return stripeClient;
}

function stripeId(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value && typeof value.id === "string") return value.id;
  return undefined;
}

export async function createStripeCheckout(store: Store, key: ApiKeyRecord, origin: string): Promise<CheckoutResult> {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new ApiError(500, "billing_misconfigured", "BILLING_PROVIDER is stripe but STRIPE_SECRET_KEY is missing");
  }
  if (!process.env.STRIPE_PRICE_ID) {
    throw new ApiError(500, "billing_misconfigured", "STRIPE_SECRET_KEY is set but STRIPE_PRICE_ID is missing");
  }

  try {
    const stripe = await getStripe();
    let customerId = key.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: key.name,
        metadata: { keyId: key.id },
      });
      customerId = customer.id;
      key.stripeCustomerId = customerId;
      key.billingProvider = "stripe";
      await store.updateKey(key);
    }
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: key.id,
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing/cancel`,
      metadata: { keyId: key.id },
      subscription_data: { metadata: { keyId: key.id } },
    });
    if (!session.url) throw new ApiError(502, "billing_failed", "Stripe did not return a checkout URL");
    return { mode: "stripe", url: session.url };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error(
      JSON.stringify({
        msg: "stripe_checkout_failed",
        keyId: key.id,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    throw new ApiError(502, "billing_failed", "Stripe could not start a checkout session");
  }
}

export async function handleStripeEvent(store: Store, event: Stripe.Event): Promise<void> {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    await applyPlan(store, session.metadata?.keyId || session.client_reference_id || undefined, "pro", {
      billingProvider: "stripe",
      customerId: stripeId(session.customer),
      subscriptionId: stripeId(session.subscription),
    });
    return;
  }
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    await applyPlan(store, subscription.metadata?.keyId, "demo", { billingProvider: "stripe" });
    return;
  }
  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object;
    if (subscription.status === "canceled" || subscription.status === "unpaid") {
      await applyPlan(store, subscription.metadata?.keyId, "demo", { billingProvider: "stripe" });
    }
  }
}

export async function reportUsage(key: ApiKeyRecord, usageCount: number): Promise<{ reported: boolean }> {
  const eventName = process.env.STRIPE_METER_EVENT_NAME;
  if (!process.env.STRIPE_SECRET_KEY || !eventName || !key.stripeCustomerId) return { reported: false };
  try {
    const stripe = await getStripe();
    const customerKey = process.env.STRIPE_METER_CUSTOMER_PAYLOAD_KEY || "stripe_customer_id";
    const valueKey = process.env.STRIPE_METER_VALUE_PAYLOAD_KEY || "value";
    await stripe.billing.meterEvents.create({
      event_name: eventName,
      identifier: `${key.id}:${usageCount}`,
      payload: {
        [customerKey]: key.stripeCustomerId,
        [valueKey]: "1",
      },
    });
    return { reported: true };
  } catch (error) {
    console.error(
      JSON.stringify({
        msg: "stripe_meter_failed",
        keyId: key.id,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return { reported: false };
  }
}
