import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, test } from "node:test";

import { confirmDemoCheckout, createCheckout, handleStripeEvent, receiveCreemWebhook, signDemoToken, verifyDemoToken } from "../lib/billing";
import { resolveBillingProvider } from "../lib/billing/provider";
import { billingStatus } from "../lib/config";
import { ApiError } from "../lib/errors";
import { createFileStore } from "../lib/file-store";
import { makeKeyRecord } from "../lib/keys";
import type { Store } from "../lib/types";

const ENV_KEYS = [
  "BILLING_PROVIDER",
  "CREEM_API_KEY",
  "CREEM_PRODUCT_ID",
  "CREEM_WEBHOOK_SECRET",
  "CREEM_TEST_MODE",
  "STRIPE_SECRET_KEY",
  "STRIPE_PRICE_ID",
  "STRIPE_WEBHOOK_SECRET",
] as const;

const previousEnv = new Map<string, string | undefined>(ENV_KEYS.map((key) => [key, process.env[key]]));

function setEnv(values: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>>) {
  for (const key of ENV_KEYS) {
    if (!(key in values)) continue;
    const next = values[key];
    if (next === undefined) delete process.env[key];
    else process.env[key] = next;
  }
}

afterEach(() => {
  for (const [key, value] of previousEnv) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

async function withStore(fn: (store: Store, keyId: string) => Promise<void>) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "shotapi-bill-"));
  try {
    const store = await createFileStore(dir);
    const record = makeKeyRecord({ secret: "sk_test_billing_key_value", name: "billing", plan: "demo" });
    await store.insertKey(record);
    await fn(store, record.id);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function creemBody(eventType: string, keyId: string, extra: Record<string, unknown> = {}) {
  return JSON.stringify({
    id: `evt_${eventType}`,
    eventType,
    created_at: Date.now(),
    object: {
      id: eventType === "checkout.completed" ? "ch_1" : "sub_1",
      request_id: keyId,
      metadata: { keyId },
      customer: { id: "cust_1" },
      subscription: { id: "sub_1", metadata: { keyId } },
      ...extra,
    },
  });
}

function signedHeaders(body: string, secret: string) {
  const headers = new Headers();
  headers.set("creem-signature", createHmac("sha256", secret).update(body).digest("hex"));
  return headers;
}

describe("billing providers", { concurrency: 1 }, () => {
  test("mock checkout upgrades a key and rejects a bad token", async () => {
    setEnv({
      BILLING_PROVIDER: undefined,
      CREEM_API_KEY: undefined,
      CREEM_PRODUCT_ID: undefined,
      STRIPE_SECRET_KEY: undefined,
    });
    await withStore(async (store, keyId) => {
      const record = await store.findKeyById(keyId);
      assert.ok(record);
      const checkout = await createCheckout(store, record, "http://localhost:3000");
      assert.equal(checkout.mode, "demo");
      const token = new URL(checkout.url).searchParams.get("token");
      assert.ok(token);
      assert.equal(verifyDemoToken(await store.getSecret(), token).keyId, keyId);
      const upgraded = await confirmDemoCheckout(store, token);
      assert.equal(upgraded.plan, "pro");
      assert.equal((await store.findKeyById(keyId))?.plan, "pro");
      const storeSecret = await store.getSecret();
      assert.throws(
        () => verifyDemoToken(storeSecret, signDemoToken("other-secret", keyId)),
        (error: unknown) => error instanceof ApiError && error.code === "invalid_token",
      );
    });
  });

  test("provider selection prefers an explicit value, then Creem, then Stripe", () => {
    setEnv({ BILLING_PROVIDER: undefined, CREEM_API_KEY: undefined, STRIPE_SECRET_KEY: undefined });
    assert.equal(resolveBillingProvider(), "demo");
    assert.equal(billingStatus(), "demo");

    setEnv({ STRIPE_SECRET_KEY: "sk_test_only" });
    assert.equal(resolveBillingProvider(), "stripe");
    assert.equal(billingStatus(), "stripe_incomplete");

    setEnv({ CREEM_API_KEY: "creem_test_key", STRIPE_SECRET_KEY: "sk_test_only" });
    assert.equal(resolveBillingProvider(), "creem");
    assert.equal(billingStatus(), "creem_incomplete");

    setEnv({
      CREEM_API_KEY: "creem_test_key",
      CREEM_PRODUCT_ID: "prod_123",
      CREEM_WEBHOOK_SECRET: "whsec_test",
    });
    assert.equal(billingStatus(), "creem");

    setEnv({ BILLING_PROVIDER: "stripe", STRIPE_PRICE_ID: "price_123", STRIPE_WEBHOOK_SECRET: "whsec_stripe" });
    assert.equal(resolveBillingProvider(), "stripe");
    assert.equal(billingStatus(), "stripe");

    setEnv({ BILLING_PROVIDER: "demo", CREEM_API_KEY: "creem_test_key", STRIPE_SECRET_KEY: "sk_test_only" });
    assert.equal(resolveBillingProvider(), "demo");

    setEnv({ BILLING_PROVIDER: "paddle" });
    assert.equal(resolveBillingProvider(), "paddle");
    assert.equal(billingStatus(), "paddle");

    setEnv({ BILLING_PROVIDER: "nope" });
    assert.equal(resolveBillingProvider(), null);
    assert.equal(billingStatus(), "invalid");
  });

  test("explicit demo still checks out when other provider keys exist", async () => {
    setEnv({
      BILLING_PROVIDER: "demo",
      CREEM_API_KEY: "creem_test_key",
      STRIPE_SECRET_KEY: "sk_test_only",
    });
    await withStore(async (store, keyId) => {
      const record = await store.findKeyById(keyId);
      assert.ok(record);
      const checkout = await createCheckout(store, record, "http://localhost:3000");
      assert.equal(checkout.mode, "demo");
    });
  });

  test("stripe and paddle do not fall through to demo checkout", async () => {
    setEnv({
      BILLING_PROVIDER: "stripe",
      STRIPE_SECRET_KEY: "sk_test_only",
      STRIPE_PRICE_ID: undefined,
      CREEM_API_KEY: undefined,
    });
    await withStore(async (store, keyId) => {
      const record = await store.findKeyById(keyId);
      assert.ok(record);
      await assert.rejects(
        () => createCheckout(store, record, "http://localhost:3000"),
        (error: unknown) => error instanceof ApiError && error.code === "billing_misconfigured",
      );
    });

    setEnv({ BILLING_PROVIDER: "paddle" });
    await withStore(async (store, keyId) => {
      const record = await store.findKeyById(keyId);
      assert.ok(record);
      await assert.rejects(
        () => createCheckout(store, record, "http://localhost:3000"),
        (error: unknown) => error instanceof ApiError && error.status === 501,
      );
    });

    setEnv({ BILLING_PROVIDER: "creem", CREEM_API_KEY: "creem_test_key", CREEM_PRODUCT_ID: undefined });
    await withStore(async (store, keyId) => {
      const record = await store.findKeyById(keyId);
      assert.ok(record);
      await assert.rejects(
        () => createCheckout(store, record, "http://localhost:3000"),
        (error: unknown) => error instanceof ApiError && error.code === "billing_misconfigured",
      );
    });
  });

  test("stripe webhook still upgrades and downgrades a key", async () => {
    await withStore(async (store, keyId) => {
      await handleStripeEvent(store, {
        type: "checkout.session.completed",
        data: {
          object: {
            metadata: { keyId },
            client_reference_id: keyId,
            customer: "cus_123",
            subscription: "sub_123",
          },
        },
      } as never);
      const upgraded = await store.findKeyById(keyId);
      assert.equal(upgraded?.plan, "pro");
      assert.equal(upgraded?.billingProvider, "stripe");
      assert.equal(upgraded?.stripeCustomerId, "cus_123");
      assert.equal(upgraded?.stripeSubscriptionId, "sub_123");

      await handleStripeEvent(store, {
        type: "customer.subscription.deleted",
        data: { object: { metadata: { keyId } } },
      } as never);
      const downgraded = await store.findKeyById(keyId);
      assert.equal(downgraded?.plan, "demo");
      assert.equal(downgraded?.stripeSubscriptionId, undefined);
      assert.equal(downgraded?.stripeCustomerId, "cus_123");
    });
  });

  test("creem webhook verifies HMAC and applies the plan", async () => {
    const secret = "whsec_creem_test";
    setEnv({ CREEM_WEBHOOK_SECRET: secret });
    await withStore(async (store, keyId) => {
      const paid = creemBody("checkout.completed", keyId);
      const result = await receiveCreemWebhook(store, paid, signedHeaders(paid, secret));
      assert.equal(result.type, "checkout.completed");
      const upgraded = await store.findKeyById(keyId);
      assert.equal(upgraded?.plan, "pro");
      assert.equal(upgraded?.billingProvider, "creem");
      assert.equal(upgraded?.creemCustomerId, "cust_1");
      assert.equal(upgraded?.creemSubscriptionId, "sub_1");

      const renewed = creemBody("subscription.paid", keyId);
      await receiveCreemWebhook(store, renewed, signedHeaders(renewed, secret));
      assert.equal((await store.findKeyById(keyId))?.plan, "pro");

      const scheduled = creemBody("subscription.scheduled_cancel", keyId);
      await receiveCreemWebhook(store, scheduled, signedHeaders(scheduled, secret));
      assert.equal((await store.findKeyById(keyId))?.plan, "pro");

      const canceled = JSON.stringify({
        id: "evt_cancel",
        eventType: "subscription.canceled",
        created_at: Date.now(),
        object: {
          id: "sub_1",
          metadata: { keyId },
          customer: "cust_1",
        },
      });
      await receiveCreemWebhook(store, canceled, signedHeaders(canceled, secret));
      const downgraded = await store.findKeyById(keyId);
      assert.equal(downgraded?.plan, "demo");
      assert.equal(downgraded?.creemSubscriptionId, undefined);
      assert.equal(downgraded?.creemCustomerId, "cust_1");

      const expired = creemBody("subscription.expired", keyId);
      await store.updateKey({ ...downgraded!, plan: "pro", creemSubscriptionId: "sub_1" });
      await receiveCreemWebhook(store, expired, signedHeaders(expired, secret));
      assert.equal((await store.findKeyById(keyId))?.plan, "demo");

      const bad = signedHeaders(paid, secret);
      bad.set("creem-signature", "deadbeef");
      await assert.rejects(
        () => receiveCreemWebhook(store, paid, bad),
        (error: unknown) => error instanceof ApiError && error.code === "invalid_signature",
      );
    });
  });
});
