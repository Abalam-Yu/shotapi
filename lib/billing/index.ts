import type { ApiKeyRecord, Store } from "../types";
import { createCreemCheckout } from "./creem";
import { confirmDemoCheckout, createDemoCheckout, signDemoToken, verifyDemoToken } from "./demo";
import { createPaddleCheckout } from "./paddle";
import { applyPlan } from "./plan";
import { requireBillingProvider } from "./provider";
import { createStripeCheckout, getStripe, handleStripeEvent, reportUsage } from "./stripe";
import type { CheckoutResult } from "./types";

export type { CheckoutResult };

export async function createCheckout(store: Store, key: ApiKeyRecord, origin: string): Promise<CheckoutResult> {
  const provider = requireBillingProvider();
  if (provider === "demo") return createDemoCheckout(store, key, origin);
  if (provider === "stripe") return createStripeCheckout(store, key, origin);
  if (provider === "creem") return createCreemCheckout(key.id, origin);
  return createPaddleCheckout();
}

export { applyPlan, confirmDemoCheckout, getStripe, handleStripeEvent, reportUsage, signDemoToken, verifyDemoToken };
export { receiveCreemWebhook } from "./creem";
export { resolveBillingProvider } from "./provider";
