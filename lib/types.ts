export type Plan = "demo" | "pro";

export type BillingProviderName = "creem" | "paddle" | "stripe" | "demo";

export type RenderFormat = "png" | "jpeg" | "pdf";

export type WaitUntil = "load" | "domcontentloaded" | "networkidle";

export type ApiKeyRecord = {
  id: string;
  name: string;
  keyHash: string;
  prefix: string;
  plan: Plan;
  createdAt: string;
  seededDemo?: boolean;
  billingProvider?: BillingProviderName;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  creemCustomerId?: string;
  creemSubscriptionId?: string;
};

export type UsageSnapshot = {
  count: number;
  bytes: number;
};

export type RenderEvent = {
  id: string;
  keyId: string;
  source: "url" | "html";
  format: RenderFormat;
  status: number;
  bytes: number;
  ms: number;
  createdAt: string;
};

export type RenderInput = {
  source: { kind: "url"; url: string } | { kind: "html"; html: string };
  format: RenderFormat;
  fullPage: boolean;
  quality: number;
  waitUntil: WaitUntil;
  delayMs: number;
  viewport: {
    width: number;
    height: number;
    deviceScaleFactor: number;
  };
  pdf: {
    format: "A4" | "Letter" | "Legal";
    landscape: boolean;
    printBackground: boolean;
  };
};

export type StoreKind = "file" | "memory" | "upstash";

export interface Store {
  readonly kind: StoreKind;
  readonly persistent: boolean;
  getSecret(): Promise<string>;
  findKeyByHash(hash: string): Promise<ApiKeyRecord | null>;
  findKeyById(id: string): Promise<ApiKeyRecord | null>;
  insertKey(record: ApiKeyRecord): Promise<void>;
  updateKey(record: ApiKeyRecord): Promise<void>;
  getUsage(keyId: string, period: string): Promise<UsageSnapshot>;
  addUsage(keyId: string, period: string, bytes: number): Promise<UsageSnapshot>;
  addEvent(event: RenderEvent): Promise<void>;
  listEvents(keyId: string, limit: number): Promise<RenderEvent[]>;
}
