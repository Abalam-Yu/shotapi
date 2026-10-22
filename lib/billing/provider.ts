import { ApiError } from "../errors";
import type { BillingProviderName } from "../types";

export type BillingProvider = BillingProviderName;

function explicitProvider(value: string): BillingProvider | null {
  if (value === "creem" || value === "paddle" || value === "stripe" || value === "demo") return value;
  return null;
}

/**
 * BILLING_PROVIDER wins when it is set.
 * Otherwise Creem is selected when CREEM_API_KEY is present, then Stripe, then demo.
 * An unknown explicit value returns null so callers can fail closed.
 */
export function resolveBillingProvider(): BillingProvider | null {
  const raw = process.env.BILLING_PROVIDER?.trim().toLowerCase();
  if (raw) return explicitProvider(raw);
  if (process.env.CREEM_API_KEY) return "creem";
  if (process.env.STRIPE_SECRET_KEY) return "stripe";
  return "demo";
}

export function requireBillingProvider(): BillingProvider {
  const provider = resolveBillingProvider();
  if (!provider) {
    throw new ApiError(500, "billing_misconfigured", "BILLING_PROVIDER must be creem, paddle, stripe, or demo");
  }
  return provider;
}
