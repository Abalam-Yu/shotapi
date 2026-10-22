import type { BillingProviderName, Plan, Store } from "../types";

export type PlanIds = {
  billingProvider?: BillingProviderName;
  customerId?: string;
  subscriptionId?: string;
  creemCustomerId?: string;
  creemSubscriptionId?: string;
};

export async function applyPlan(
  store: Store,
  keyId: string | undefined,
  plan: Plan,
  ids?: PlanIds,
): Promise<void> {
  if (!keyId) return;
  const key = await store.findKeyById(keyId);
  if (!key) {
    console.error(JSON.stringify({ msg: "billing_unknown_key", keyId, plan, provider: ids?.billingProvider }));
    return;
  }
  key.plan = plan;
  if (ids?.billingProvider) key.billingProvider = ids.billingProvider;
  if (ids?.customerId) key.stripeCustomerId = ids.customerId;
  if (ids?.creemCustomerId) key.creemCustomerId = ids.creemCustomerId;
  if (plan === "pro") {
    if (ids?.subscriptionId) key.stripeSubscriptionId = ids.subscriptionId;
    if (ids?.creemSubscriptionId) key.creemSubscriptionId = ids.creemSubscriptionId;
  }
  if (plan === "demo") {
    if (!ids?.billingProvider || ids.billingProvider === "stripe") key.stripeSubscriptionId = undefined;
    if (ids?.billingProvider === "creem") key.creemSubscriptionId = undefined;
  }
  await store.updateKey(key);
}
