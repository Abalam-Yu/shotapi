import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, describe, test } from "node:test";

import { POST as confirmDemo } from "../app/api/v1/billing/demo-confirm/route";
import { POST as checkout } from "../app/api/v1/billing/checkout/route";
import { GET as health } from "../app/api/v1/health/route";
import { POST as mintFree } from "../app/api/v1/keys/free/route";
import { POST as mintAdmin } from "../app/api/v1/keys/route";
import { POST as render } from "../app/api/v1/render/route";
import { GET as usage } from "../app/api/v1/usage/route";
import { authenticateSecret } from "../lib/auth";
import { clientIp } from "../lib/client-ip";
import { config } from "../lib/config";
import { resetFreeMintLimits } from "../lib/free-mint-limit";
import { hashKey } from "../lib/keys";
import { closeBrowser } from "../lib/render";
import { getStore, resetStoreCache } from "../lib/store";

const TRACKED = [
  "SHOTAPI_DATA_DIR",
  "SHOTAPI_DEMO",
  "SHOTAPI_ADMIN_TOKEN",
  "SHOTAPI_FREE_KEYS",
  "SHOTAPI_FREE_KEY_IP_LIMIT",
  "SHOTAPI_FREE_KEY_IP_WINDOW_SEC",
  "SHOTAPI_FREE_KEY_EMAIL_LIMIT",
  "SHOTAPI_FREE_KEY_EMAIL_WINDOW_SEC",
  "SHOTAPI_FREE_KEY_GLOBAL_LIMIT",
  "SHOTAPI_FREE_KEY_GLOBAL_WINDOW_SEC",
  "SHOTAPI_FREE_KEY_DAILY_LIMIT",
  "SHOTAPI_FREE_KEY_DAILY_WINDOW_SEC",
  "SHOTAPI_FREE_KEY_COOLDOWN_SEC",
  "SHOTAPI_QUOTA_DEMO",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "VERCEL",
  "BILLING_PROVIDER",
  "CREEM_API_KEY",
  "CREEM_PRODUCT_ID",
  "CREEM_WEBHOOK_SECRET",
  "STRIPE_SECRET_KEY",
] as const;

function snapshot(): Map<string, string | undefined> {
  return new Map(TRACKED.map((key) => [key, process.env[key]]));
}

function restore(saved: Map<string, string | undefined>): void {
  for (const [key, value] of saved) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

async function isolate(extra?: () => void): Promise<() => Promise<void>> {
  const saved = snapshot();
  const dir = await mkdtemp(path.join(os.tmpdir(), "shotapi-free-"));
  process.env.SHOTAPI_DATA_DIR = dir;
  process.env.SHOTAPI_DEMO = "0";
  process.env.SHOTAPI_FREE_KEYS = "1";
  process.env.SHOTAPI_FREE_KEY_COOLDOWN_SEC = "0";
  process.env.SHOTAPI_FREE_KEY_IP_LIMIT = "5";
  process.env.SHOTAPI_FREE_KEY_IP_WINDOW_SEC = "86400";
  process.env.SHOTAPI_FREE_KEY_EMAIL_LIMIT = "5";
  process.env.SHOTAPI_FREE_KEY_EMAIL_WINDOW_SEC = "86400";
  process.env.SHOTAPI_FREE_KEY_GLOBAL_LIMIT = "1000";
  process.env.SHOTAPI_FREE_KEY_GLOBAL_WINDOW_SEC = "3600";
  process.env.SHOTAPI_FREE_KEY_DAILY_LIMIT = "5000";
  process.env.SHOTAPI_FREE_KEY_DAILY_WINDOW_SEC = "86400";
  delete process.env.SHOTAPI_ADMIN_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.VERCEL;
  delete process.env.SHOTAPI_QUOTA_DEMO;
  extra?.();
  resetStoreCache();
  resetFreeMintLimits();
  return async () => {
    restore(saved);
    resetStoreCache();
    resetFreeMintLimits();
    await rm(dir, { recursive: true, force: true });
  };
}

function freeRequest(ip: string | null, body: unknown = {}, headers: Record<string, string> = {}): Request {
  return new Request("https://shot-api.test/api/v1/keys/free", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(ip ? { "x-real-ip": ip } : {}),
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

async function read(response: Response): Promise<{ status: number; json: Record<string, unknown>; headers: Headers }> {
  return { status: response.status, json: (await response.json()) as Record<string, unknown>, headers: response.headers };
}

describe("public free key", { concurrency: 1 }, () => {
  after(async () => {
    await closeBrowser();
  });

  test("client IP prefers the platform address over a spoofed forwarded header", () => {
    const headers = new Headers({
      "x-forwarded-for": "1.2.3.4, 203.0.113.9",
      "x-real-ip": "198.51.100.10",
    });
    assert.equal(clientIp({ headers }), "198.51.100.10");
    assert.equal(
      clientIp({ headers: new Headers({ "x-vercel-forwarded-for": "203.0.113.8, 10.0.0.1" }) }),
      "203.0.113.8",
    );
    assert.equal(
      clientIp({ headers: new Headers({ "x-forwarded-for": "1.2.3.4, 203.0.113.7" }) }),
      "203.0.113.7",
    );
    assert.equal(clientIp({ headers: new Headers() }), "unknown");
  });

  test("mints a Free key without an admin token and authorizes a public URL PNG", { timeout: 90_000 }, async () => {
    const done = await isolate();
    try {
      assert.equal(config.quotaDemo(), 100);
      const minted = await read(await mintFree(freeRequest("203.0.113.10", { name: "show-hn" })));
      assert.equal(minted.status, 201);
      const secret = minted.json.key;
      assert.equal(typeof secret, "string");
      assert.match(String(secret), /^sk_test_[A-Za-z0-9_-]+$/);
      assert.equal(minted.json.plan, "demo");
      assert.equal(minted.json.tier, "free");
      assert.equal(minted.json.limit, 100);
      assert.equal(minted.json.period, "month");
      assert.equal(minted.json.name, "show-hn");
      assert.equal(JSON.stringify(minted.json).includes("SHOTAPI_ADMIN_TOKEN"), false);

      const store = await getStore();
      const record = await authenticateSecret(String(secret), store);
      assert.equal(record.plan, "demo");
      assert.equal(record.seededDemo, undefined);
      assert.equal(record.keyHash, hashKey(String(secret)));
      assert.notEqual(record.keyHash, secret);

      const usageResponse = await read(
        await usage(
          new Request("https://shot-api.test/api/v1/usage", {
            headers: { authorization: `Bearer ${secret}` },
          }),
        ),
      );
      assert.equal(usageResponse.status, 200);
      const usageKey = usageResponse.json.key as { plan: string };
      assert.equal(usageKey.plan, "demo");
      assert.equal(usageResponse.json.limit, 100);
      assert.equal(usageResponse.json.used, 0);

      const png = await render(
        new Request("https://shot-api.test/api/v1/render", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${secret}`,
          },
          body: JSON.stringify({ url: "https://example.com", format: "png" }),
        }),
      );
      assert.equal(png.status, 200, await png.clone().text());
      assert.equal(png.headers.get("x-shotapi-plan"), "demo");
      assert.equal(png.headers.get("x-shotapi-limit"), "100");
      const bytes = Buffer.from(await png.arrayBuffer());
      assert.equal(bytes.subarray(0, 4).toString("hex"), "89504e47");

      const after = await read(
        await usage(
          new Request("https://shot-api.test/api/v1/usage", {
            headers: { "x-api-key": String(secret) },
          }),
        ),
      );
      assert.equal(after.json.used, 1);
    } finally {
      await done();
    }
  });

  test("refuses Pro on the public route and keeps the admin route closed", async () => {
    const done = await isolate();
    try {
      const source = readFileSync(new URL("../app/api/v1/keys/free/route.ts", import.meta.url), "utf8");
      assert.equal(source.includes("SHOTAPI_ADMIN_TOKEN"), false);
      assert.equal(source.includes("adminAuthorized"), false);

      const asPro = await read(
        await mintFree(
          freeRequest("203.0.113.11", { plan: "pro" }, { authorization: "Bearer not-the-admin-token" }),
        ),
      );
      assert.equal(asPro.status, 400);
      assert.equal((asPro.json.error as { code: string }).code, "invalid_request");

      const alias = await read(await mintFree(freeRequest("203.0.113.12", { plan: "free" })));
      assert.equal(alias.status, 201);
      assert.equal(alias.json.plan, "demo");

      const noToken = await read(
        await mintAdmin(
          new Request("https://shot-api.test/api/v1/keys", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ plan: "pro", name: "should-fail" }),
          }),
        ),
      );
      assert.equal(noToken.status, 503);
      assert.equal((noToken.json.error as { code: string }).code, "admin_disabled");

      process.env.SHOTAPI_ADMIN_TOKEN = "operator-token";
      const wrong = await read(
        await mintAdmin(
          new Request("https://shot-api.test/api/v1/keys", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: "Bearer operator-token-nope",
            },
            body: JSON.stringify({ plan: "pro" }),
          }),
        ),
      );
      assert.equal(wrong.status, 401);

      const operator = await read(
        await mintAdmin(
          new Request("https://shot-api.test/api/v1/keys", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: "Bearer operator-token",
            },
            body: JSON.stringify({ plan: "pro", name: "comp" }),
          }),
        ),
      );
      assert.equal(operator.status, 201);
      assert.equal(operator.json.plan, "pro");
      assert.match(String(operator.json.key), /^sk_live_/);

      const stillFree = await read(
        await mintFree(
          freeRequest("203.0.113.13", { plan: "pro" }, { authorization: "Bearer operator-token" }),
        ),
      );
      assert.equal(stillFree.status, 400);
    } finally {
      await done();
    }
  });

  test("rate limits by IP, email, cooldown, and the public caps", async () => {
    const done = await isolate(() => {
      process.env.SHOTAPI_FREE_KEY_IP_LIMIT = "2";
      process.env.SHOTAPI_FREE_KEY_EMAIL_LIMIT = "1";
      process.env.SHOTAPI_FREE_KEY_GLOBAL_LIMIT = "100";
      process.env.SHOTAPI_FREE_KEY_DAILY_LIMIT = "100";
    });
    try {
      assert.equal((await read(await mintFree(freeRequest("203.0.113.20")))).status, 201);
      assert.equal((await read(await mintFree(freeRequest("203.0.113.20")))).status, 201);
      const blockedIp = await read(await mintFree(freeRequest("203.0.113.20")));
      assert.equal(blockedIp.status, 429);
      assert.equal((blockedIp.json.error as { code: string; scope: string }).scope, "ip");
      assert.match(blockedIp.headers.get("retry-after") ?? "", /^[1-9][0-9]*$/);
      assert.equal(
        blockedIp.headers.get("retry-after"),
        String((blockedIp.json.error as { retryAfterSeconds: number }).retryAfterSeconds),
      );
      assert.equal((await read(await mintFree(freeRequest("203.0.113.21")))).status, 201);

      const firstEmail = await read(
        await mintFree(freeRequest("203.0.113.30", { email: "Person@Example.com" })),
      );
      assert.equal(firstEmail.status, 201);
      const emailRecord = await authenticateSecret(String(firstEmail.json.key), await getStore());
      assert.equal(JSON.stringify(emailRecord).toLowerCase().includes("example.com"), false);
      assert.equal(JSON.stringify(firstEmail.json).toLowerCase().includes("example.com"), false);
      const sameEmail = await read(
        await mintFree(freeRequest("203.0.113.31", { email: "person@example.com" })),
      );
      assert.equal(sameEmail.status, 429);
      assert.equal((sameEmail.json.error as { scope: string }).scope, "email");
      assert.equal((await read(await mintFree(freeRequest("203.0.113.32", { email: "other@example.com" })))).status, 201);

      const badEmail = await read(await mintFree(freeRequest("203.0.113.40", { email: "not-an-email" })));
      assert.equal(badEmail.status, 400);
      assert.equal((await read(await mintFree(freeRequest("203.0.113.40")))).status, 201);
    } finally {
      await done();
    }

    const cooled = await isolate(() => {
      process.env.SHOTAPI_FREE_KEY_COOLDOWN_SEC = "45";
      process.env.SHOTAPI_FREE_KEY_IP_LIMIT = "5";
    });
    try {
      assert.equal((await read(await mintFree(freeRequest("203.0.113.50")))).status, 201);
      const again = await read(await mintFree(freeRequest("203.0.113.50")));
      assert.equal(again.status, 429);
      assert.equal((again.json.error as { scope: string }).scope, "cooldown");
      const retry = Number(again.headers.get("retry-after"));
      assert.ok(retry >= 1 && retry <= 45);
    } finally {
      await cooled();
    }

    const capped = await isolate(() => {
      process.env.SHOTAPI_FREE_KEY_GLOBAL_LIMIT = "1";
      process.env.SHOTAPI_FREE_KEY_DAILY_LIMIT = "10";
      process.env.SHOTAPI_FREE_KEY_IP_LIMIT = "10";
    });
    try {
      assert.equal((await read(await mintFree(freeRequest("203.0.113.60")))).status, 201);
      const hour = await read(await mintFree(freeRequest("203.0.113.61")));
      assert.equal(hour.status, 429);
      assert.equal((hour.json.error as { scope: string }).scope, "hour");
    } finally {
      await capped();
    }

    const daily = await isolate(() => {
      process.env.SHOTAPI_FREE_KEY_GLOBAL_LIMIT = "10";
      process.env.SHOTAPI_FREE_KEY_DAILY_LIMIT = "1";
      process.env.SHOTAPI_FREE_KEY_IP_LIMIT = "10";
    });
    try {
      assert.equal((await read(await mintFree(freeRequest("203.0.113.70")))).status, 201);
      const day = await read(await mintFree(freeRequest("203.0.113.71")));
      assert.equal(day.status, 429);
      assert.equal((day.json.error as { scope: string }).scope, "day");
    } finally {
      await daily();
    }

    const shared = await isolate(() => {
      process.env.SHOTAPI_FREE_KEY_IP_LIMIT = "1";
    });
    try {
      const spoofed = await read(
        await mintFree(
          freeRequest("198.51.100.8", {}, { "x-forwarded-for": "1.1.1.1" }),
        ),
      );
      assert.equal(spoofed.status, 201);
      const sameReal = await read(
        await mintFree(freeRequest("198.51.100.8", {}, { "x-forwarded-for": "8.8.8.8, 9.9.9.9" })),
      );
      assert.equal(sameReal.status, 429);
      const lastHop = await read(
        await mintFree(
          new Request("https://shot-api.test/api/v1/keys/free", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-forwarded-for": "1.2.3.4, 203.0.113.77",
            },
            body: "{}",
          }),
        ),
      );
      assert.equal(lastHop.status, 201);
    } finally {
      await shared();
    }
  });

  test("Free key checkout still reaches demo confirm, and Creem health stays creem", async () => {
    const done = await isolate(() => {
      process.env.BILLING_PROVIDER = "demo";
    });
    try {
      const minted = await read(await mintFree(freeRequest("203.0.113.80", { name: "upgrade" })));
      assert.equal(minted.status, 201);
      const session = await read(
        await checkout(
          new Request("https://shot-api.test/api/v1/billing/checkout", {
            method: "POST",
            headers: { authorization: `Bearer ${minted.json.key}` },
          }),
        ),
      );
      assert.equal(session.status, 200);
      assert.equal(session.json.mode, "demo");
      const token = new URL(String(session.json.url)).searchParams.get("token");
      assert.ok(token);
      const confirmed = await read(
        await confirmDemo(
          new Request("https://shot-api.test/api/v1/billing/demo-confirm", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ token }),
          }),
        ),
      );
      assert.equal(confirmed.status, 200);
      assert.equal(confirmed.json.plan, "pro");
      const record = await authenticateSecret(String(minted.json.key), await getStore());
      assert.equal(record.plan, "pro");
    } finally {
      await done();
    }

    const creem = await isolate(() => {
      delete process.env.BILLING_PROVIDER;
      process.env.CREEM_API_KEY = "creem_test_key";
      process.env.CREEM_PRODUCT_ID = "prod_test";
      process.env.CREEM_WEBHOOK_SECRET = "whsec_test";
    });
    try {
      const status = await read(await health());
      assert.equal(status.status, 200);
      assert.equal(status.json.billing, "creem");
      assert.equal(typeof status.json.ok, "boolean");
      assert.equal(typeof status.json.driver, "string");
    } finally {
      await creem();
    }
  });

  test("can turn public mint off without affecting stored keys", async () => {
    const done = await isolate();
    try {
      const minted = await read(await mintFree(freeRequest("203.0.113.90")));
      assert.equal(minted.status, 201);
      process.env.SHOTAPI_FREE_KEYS = "0";
      const off = await read(await mintFree(freeRequest("203.0.113.91")));
      assert.equal(off.status, 404);
      assert.equal((off.json.error as { code: string }).code, "free_keys_disabled");
      const still = await authenticateSecret(String(minted.json.key), await getStore());
      assert.equal(still.plan, "demo");
    } finally {
      await done();
    }
  });
});
