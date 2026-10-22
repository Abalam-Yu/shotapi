import { resolveBillingProvider } from "./billing/provider";

function positiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

export function isDemoMode(): boolean {
  const flag = process.env.SHOTAPI_DEMO;
  if (flag === "1" || flag === "true") return true;
  if (flag === "0" || flag === "false") return false;
  return !process.env.VERCEL;
}

export function resolveDriver(): "chrome" | "sparticuz" {
  const raw = process.env.RENDER_DRIVER || "auto";
  if (raw === "chrome" || raw === "sparticuz") return raw;
  return process.env.VERCEL ? "sparticuz" : "chrome";
}

export type BillingStatus =
  | "demo"
  | "stripe"
  | "stripe_incomplete"
  | "creem"
  | "creem_incomplete"
  | "paddle"
  | "invalid";

export function billingStatus(): BillingStatus {
  const provider = resolveBillingProvider();
  if (!provider) return "invalid";
  if (provider === "demo") return "demo";
  if (provider === "paddle") return "paddle";
  if (provider === "creem") {
    if (!process.env.CREEM_API_KEY || !process.env.CREEM_PRODUCT_ID || !process.env.CREEM_WEBHOOK_SECRET) {
      return "creem_incomplete";
    }
    return "creem";
  }
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID || !process.env.STRIPE_WEBHOOK_SECRET) {
    return "stripe_incomplete";
  }
  return "stripe";
}

export const config = {
  demoKey(): string {
    return process.env.SHOTAPI_DEMO_KEY || "sk_demo_local_dev_only";
  },
  dataDir(): string {
    return process.env.SHOTAPI_DATA_DIR || ".data";
  },
  quotaDemo(): number {
    return positiveInt(process.env.SHOTAPI_QUOTA_DEMO, 100);
  },
  quotaPro(): number {
    return positiveInt(process.env.SHOTAPI_QUOTA_PRO, 10_000);
  },
  maxHtmlBytes(): number {
    return positiveInt(process.env.SHOTAPI_MAX_HTML_BYTES, 500_000);
  },
  maxBodyBytes(): number {
    return positiveInt(process.env.SHOTAPI_MAX_BODY_BYTES, 1_000_000);
  },
  renderTimeoutMs(): number {
    return positiveInt(process.env.RENDER_TIMEOUT_MS, 25_000);
  },
  maxResponseBytes(): number {
    return 4_500_000;
  },
  allowPrivateUrls(): boolean {
    return process.env.ALLOW_PRIVATE_URLS === "1";
  },
  corsOrigin(): string {
    return process.env.SHOTAPI_CORS_ORIGIN || "*";
  },
  appUrl(): string | undefined {
    const url = process.env.NEXT_PUBLIC_APP_URL;
    return url ? url.replace(/\/$/, "") : undefined;
  },
  supportEmail(): string {
    const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
    return email || "support@shotapi.dev";
  },
};
