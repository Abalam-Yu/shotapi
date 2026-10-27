/**
 * Proves the public Free key flow against a running server.
 *
 *   pnpm dev
 *   pnpm verify:free-key
 *
 * After deploy:
 *   SMOKE_BASE_URL=https://shot-api.com pnpm verify:free-key
 *
 * SMOKE_SKIP_BROWSER=1 skips the homepage click-through.
 * The script mints real Free keys on the target. It does not send SHOTAPI_ADMIN_TOKEN.
 */
import { chromium } from "playwright-core";

const base = (process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const chromePath = process.env.CHROME_PATH || "/usr/bin/google-chrome";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, { method = "GET", apiKey, body, headers = {} } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  const type = response.headers.get("content-type") || "";
  const text = bytes.length && (type.includes("json") || bytes[0] === 0x7b) ? bytes.toString("utf8") : "";
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }
  return { status: response.status, bytes, json, text, headers: response.headers };
}

const before = await request("/api/v1/health");
assert(before.status === 200 && before.json && "billing" in before.json, `health ${before.status} ${before.text}`);

const home = await fetch(`${base}/`);
assert(home.status === 200, `home ${home.status}`);
const homeHtml = await home.text();
assert(homeHtml.includes("Mint a free key"), "homepage CTA missing");
assert(homeHtml.includes("Mint free key"), "homepage form missing");
assert(!homeHtml.includes("Mint a key with"), "homepage still tells visitors to use the admin token");

const docs = await fetch(`${base}/docs`);
assert(docs.status === 200, `docs ${docs.status}`);
const docsHtml = await docs.text();
assert(docsHtml.includes("/api/v1/keys/free"), "docs omit the public mint");
assert(docsHtml.includes("SHOTAPI_ADMIN_TOKEN"), "docs dropped the operator route");

const ip = `203.0.113.${1 + Math.floor(Math.random() * 200)}`;
const minted = await request("/api/v1/keys/free", {
  method: "POST",
  body: { name: "verify" },
  headers: { "x-real-ip": ip },
});
assert(minted.status === 201, `mint ${minted.status} ${minted.text}`);
assert(minted.json.plan === "demo" && minted.json.tier === "free", `plan ${minted.text}`);
assert(minted.json.limit === 100, `limit ${minted.text}`);
assert(typeof minted.json.key === "string" && minted.json.key.startsWith("sk_test_"), "secret shape");
assert(!minted.text.includes("SHOTAPI_ADMIN_TOKEN"), "admin token leaked");

const png = await request("/api/v1/render", {
  method: "POST",
  apiKey: minted.json.key,
  body: { url: "https://example.com", format: "png" },
});
assert(png.status === 200, `png ${png.status} ${png.text}`);
assert(png.bytes.subarray(0, 4).toString("hex") === "89504e47", "png magic");
assert(png.headers.get("x-shotapi-plan") === "demo", "plan header");

const usage = await request("/api/v1/usage", { apiKey: minted.json.key });
assert(usage.status === 200 && usage.json.used === 1 && usage.json.limit === 100, `usage ${usage.text}`);
assert(usage.json.key.plan === "demo", `usage plan ${usage.text}`);

const pro = await request("/api/v1/keys/free", {
  method: "POST",
  body: { plan: "pro" },
  headers: { "x-real-ip": ip, authorization: "Bearer not-an-admin-token" },
});
assert(pro.status === 400, `public pro ${pro.status} ${pro.text}`);

const admin = await request("/api/v1/keys", { method: "POST", body: { plan: "pro" } });
assert(admin.status === 401 || admin.status === 503, `admin route ${admin.status} ${admin.text}`);

const after = await request("/api/v1/health");
assert(after.json.billing === before.json.billing, `billing changed ${before.json.billing} -> ${after.json.billing}`);

if (process.env.SMOKE_SKIP_BROWSER === "1") {
  console.log("verify:free-key ok", { billing: after.json.billing, browser: "skipped", prefix: minted.json.prefix });
  process.exit(0);
}

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
});
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: base });
  const page = await context.newPage();
  await page.goto(`${base}/#free-key`, { waitUntil: "domcontentloaded" });
  const mobileButton = page.getByRole("button", { name: "Mint free key" });
  await mobileButton.waitFor();
  const mobileBox = await mobileButton.boundingBox();
  assert(mobileBox && mobileBox.x >= 0 && mobileBox.x + mobileBox.width <= 390, "mint button overflows the phone viewport");
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByLabel("Name (optional)").fill("browser-verify");
  await page.getByRole("button", { name: "Mint free key" }).click();
  await page.getByRole("heading", { name: "Copy this Free key now" }).waitFor();
  const secret = (await page.locator(".mint-secret").innerText()).trim();
  assert(secret.startsWith("sk_test_"), `ui secret ${secret}`);
  await page.getByRole("button", { name: "Copy key" }).click();
  await page.getByRole("button", { name: "Copied" }).waitFor();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  assert(copied === secret, "copy button did not copy the key");
  const stored = await page.evaluate(() => `${localStorage.length}:${sessionStorage.length}`);
  assert(stored === "0:0", `key persisted in web storage (${stored})`);
  const uiPng = await request("/api/v1/render", {
    method: "POST",
    apiKey: secret,
    body: { url: "https://example.com", format: "png" },
  });
  assert(uiPng.status === 200, `ui key png ${uiPng.status} ${uiPng.text}`);
  assert(uiPng.bytes.subarray(0, 4).toString("hex") === "89504e47", "ui png magic");
  console.log("verify:free-key ok", {
    billing: after.json.billing,
    browser: "clicked",
    prefix: minted.json.prefix,
    uiPrefix: secret.slice(0, 16),
  });
} finally {
  await browser.close();
}
