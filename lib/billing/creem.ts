import { Creem } from "creem";
import { constructWebhookEvent, WebhookVerificationError, type CreemWebhookEvent } from "creem/webhooks";

import { ApiError } from "../errors";
import type { Store } from "../types";
import type { CheckoutResult } from "./types";
import { applyPlan } from "./plan";

type CreemRef = { id?: string; metadata?: Record<string, unknown> | null } | string | null;

type CreemObject = {
  id?: string;
  request_id?: string;
  requestId?: string;
  metadata?: Record<string, unknown> | null;
  customer?: CreemRef;
  subscription?: CreemRef;
};

let creemClient: Creem | null = null;
let creemClientKey = "";

export function creemTestMode(): boolean {
  const raw = process.env.CREEM_TEST_MODE?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export function getCreem(): Creem {
  const apiKey = process.env.CREEM_API_KEY;
  if (!apiKey) throw new ApiError(501, "billing_disabled", "Creem is not configured");
  const cacheKey = `${creemTestMode()}:${apiKey}`;
  if (!creemClient || creemClientKey !== cacheKey) {
    creemClient = new Creem({
      apiKey,
      ...(creemTestMode() ? { server: "test" as const } : {}),
    });
    creemClientKey = cacheKey;
  }
  return creemClient;
}

function metadataValue(metadata: Record<string, unknown> | null | undefined, key: string): string | undefined {
  const value = metadata?.[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function refMetadata(value: CreemRef | undefined): Record<string, unknown> | undefined {
  if (!value || typeof value === "string") return undefined;
  return value.metadata ?? undefined;
}

function entityId(value: CreemRef | undefined): string | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  if (value && typeof value === "object" && typeof value.id === "string" && value.id.length > 0) return value.id;
  return undefined;
}

function readKeyId(object: CreemObject): string | undefined {
  return (
    metadataValue(object.metadata, "keyId") ||
    metadataValue(object.metadata, "referenceId") ||
    metadataValue(refMetadata(object.subscription), "keyId") ||
    metadataValue(refMetadata(object.subscription), "referenceId") ||
    (typeof object.request_id === "string" && object.request_id.length > 0 ? object.request_id : undefined) ||
    (typeof object.requestId === "string" && object.requestId.length > 0 ? object.requestId : undefined)
  );
}

function asObject(value: unknown): CreemObject {
  if (!value || typeof value !== "object") return {};
  return value as CreemObject;
}

/**
 * Server-side checkout via the creem SDK. The Next.js adapter's Checkout() route is a GET
 * handler fed by query parameters, which does not fit the authenticated POST checkout API.
 */
export async function createCreemCheckout(keyId: string, origin: string): Promise<CheckoutResult> {
  const productId = process.env.CREEM_PRODUCT_ID;
  if (!process.env.CREEM_API_KEY || !productId) {
    throw new ApiError(500, "billing_misconfigured", "Creem checkout needs CREEM_API_KEY and CREEM_PRODUCT_ID");
  }

  try {
    const session = await getCreem().checkouts.create({
      productId,
      requestId: keyId,
      successUrl: `${origin}/billing/success?provider=creem`,
      metadata: { keyId, referenceId: keyId },
    });
    if (!session.checkoutUrl) throw new ApiError(502, "billing_failed", "Creem did not return a checkout URL");
    return { mode: "creem", url: session.checkoutUrl };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error(
      JSON.stringify({
        msg: "creem_checkout_failed",
        keyId,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    throw new ApiError(502, "billing_failed", "Creem could not start a checkout session");
  }
}

export async function handleCreemEvent(store: Store, event: CreemWebhookEvent): Promise<void> {
  const object = asObject(event.data);
  const keyId = readKeyId(object);
  const creemCustomerId = entityId(object.customer);
  const subscriptionId = event.type === "checkout.completed" ? entityId(object.subscription) : object.id;

  if (event.type === "checkout.completed" || event.type === "subscription.paid") {
    await applyPlan(store, keyId, "pro", {
      billingProvider: "creem",
      creemCustomerId,
      creemSubscriptionId: subscriptionId,
    });
    return;
  }
  if (event.type === "subscription.canceled" || event.type === "subscription.expired") {
    await applyPlan(store, keyId, "demo", {
      billingProvider: "creem",
      creemCustomerId,
    });
  }
}

export async function receiveCreemWebhook(
  store: Store,
  rawBody: string,
  headers: Headers,
): Promise<{ type: string }> {
  const secret = process.env.CREEM_WEBHOOK_SECRET;
  if (!secret) {
    throw new ApiError(
      501,
      "billing_disabled",
      "Creem webhook is not configured. Set CREEM_WEBHOOK_SECRET and point Creem at /api/v1/billing/webhook/creem.",
    );
  }
  let event: CreemWebhookEvent;
  try {
    event = await constructWebhookEvent(rawBody, headers, { secret });
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      throw new ApiError(400, "invalid_signature", "Creem signature verification failed");
    }
    throw new ApiError(400, "invalid_request", "Creem webhook payload is invalid");
  }
  await handleCreemEvent(store, event);
  return { type: event.type };
}
