import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

import { authenticateSecret } from "../lib/auth";
import { ApiError } from "../lib/errors";
import { createFileStore } from "../lib/file-store";
import { hashKey, makeKeyRecord } from "../lib/keys";
import { ensureDemoKey } from "../lib/store";

describe("file store", { concurrency: 1 }, () => {
  test("persists usage, the server secret, and the demo key", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "shotapi-"));
    const previousDemo = process.env.SHOTAPI_DEMO;
    const previousKey = process.env.SHOTAPI_DEMO_KEY;
    process.env.SHOTAPI_DEMO = "1";
    delete process.env.SHOTAPI_DEMO_KEY;
    try {
      const store = await createFileStore(dir);
      const record = makeKeyRecord({ secret: "sk_test_example_key_value", name: "acme", plan: "demo" });
      await store.insertKey(record);
      assert.equal((await store.getUsage(record.id, "2026-10")).count, 0);
      await Promise.all(Array.from({ length: 20 }, () => store.addUsage(record.id, "2026-10", 10)));
      const usage = await store.getUsage(record.id, "2026-10");
      assert.equal(usage.count, 20);
      assert.equal(usage.bytes, 200);

      const secret = await store.getSecret();
      const reopened = await createFileStore(dir);
      assert.equal(await reopened.getSecret(), secret);
      assert.equal((await reopened.findKeyByHash(hashKey("sk_test_example_key_value")))?.id, record.id);

      await ensureDemoKey(store);
      await ensureDemoKey(store);
      const demo = await authenticateSecret("sk_demo_local_dev_only", store);
      assert.equal(demo.seededDemo, true);
      process.env.SHOTAPI_DEMO = "0";
      await assert.rejects(
        authenticateSecret("sk_demo_local_dev_only", store),
        (error: unknown) => error instanceof ApiError && error.status === 401,
      );
      const kept = await authenticateSecret("sk_test_example_key_value", store);
      assert.equal(kept.name, "acme");
    } finally {
      if (previousDemo === undefined) delete process.env.SHOTAPI_DEMO;
      else process.env.SHOTAPI_DEMO = previousDemo;
      if (previousKey === undefined) delete process.env.SHOTAPI_DEMO_KEY;
      else process.env.SHOTAPI_DEMO_KEY = previousKey;
      await rm(dir, { recursive: true, force: true });
    }
  });
});
