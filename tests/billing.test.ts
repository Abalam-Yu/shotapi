import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

import { confirmDemoCheckout, createCheckout, signDemoToken, verifyDemoToken } from "../lib/billing";
import { ApiError } from "../lib/errors";
import { createFileStore } from "../lib/file-store";
import { makeKeyRecord } from "../lib/keys";

describe("demo billing", { concurrency: 1 }, () => {
  test("mock checkout upgrades a key and rejects a bad token", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "shotapi-bill-"));
    const previous = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    try {
      const store = await createFileStore(dir);
      const record = makeKeyRecord({ secret: "sk_test_billing_key_value", name: "billing", plan: "demo" });
      await store.insertKey(record);
      const checkout = await createCheckout(store, record, "http://localhost:3000");
      assert.equal(checkout.mode, "demo");
      const token = new URL(checkout.url).searchParams.get("token");
      assert.ok(token);
      assert.equal(verifyDemoToken(await store.getSecret(), token).keyId, record.id);
      const upgraded = await confirmDemoCheckout(store, token);
      assert.equal(upgraded.plan, "pro");
      assert.equal((await store.findKeyById(record.id))?.plan, "pro");
      const storeSecret = await store.getSecret();
      assert.throws(
        () => verifyDemoToken(storeSecret, signDemoToken("other-secret", record.id)),
        (error: unknown) => error instanceof ApiError && error.code === "invalid_token",
      );
    } finally {
      if (previous === undefined) delete process.env.STRIPE_SECRET_KEY;
      else process.env.STRIPE_SECRET_KEY = previous;
      await rm(dir, { recursive: true, force: true });
    }
  });
});
