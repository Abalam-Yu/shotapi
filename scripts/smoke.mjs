const base = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000";
const key = process.env.SHOTAPI_DEMO_KEY || "sk_demo_local_dev_only";
const sample = "<!doctype html><html><body><h1>ShotAPI smoke</h1></body></html>";

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
  let json = null;
  const text = bytes.length && (type.includes("json") || bytes[0] === 0x7b) ? bytes.toString("utf8") : "";
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }
  return { status: response.status, bytes, json, text, headers: response.headers };
}

const home = await fetch(`${base}/`);
assert(home.status === 200, `home ${home.status}`);
assert((await home.text()).includes("ShotAPI"), "home copy");

const docs = await fetch(`${base}/docs`);
assert(docs.status === 200, `docs ${docs.status}`);

const health = await request("/api/v1/health");
assert(health.status === 200 && health.json?.ok === true, `health ${health.status} ${health.text}`);

const missing = await request("/api/v1/render", { method: "POST", body: { html: sample } });
assert(missing.status === 401, `expected 401, got ${missing.status}`);

const before = await request("/api/v1/usage", { apiKey: key });
assert(before.status === 200, `usage ${before.status} ${before.text}`);
const usedBefore = before.json.used;

const png = await request("/api/v1/render", {
  method: "POST",
  apiKey: key,
  body: { html: sample, format: "png", viewport: { width: 800, height: 400 } },
});
assert(png.status === 200, `png ${png.status} ${png.text}`);
assert(png.bytes.subarray(0, 4).toString("hex") === "89504e47", "png magic");

const after = await request("/api/v1/usage", { apiKey: key });
assert(after.json.used === usedBefore + 1, `usage did not increment (${before.json.used} -> ${after.json.used})`);

const pdf = await request("/api/v1/render", {
  method: "POST",
  apiKey: key,
  body: { html: sample, format: "pdf" },
});
assert(pdf.status === 200 && pdf.bytes.subarray(0, 4).toString() === "%PDF", `pdf ${pdf.status} ${pdf.text}`);

const blocked = await request("/api/v1/render", {
  method: "POST",
  apiKey: key,
  body: { url: "http://127.0.0.1/" },
});
assert(blocked.status === 400, `ssrf ${blocked.status} ${blocked.text}`);

const checkout = await request("/api/v1/billing/checkout", { method: "POST", apiKey: key });
assert(checkout.status === 200 && checkout.json?.mode === "demo", `checkout ${checkout.status} ${checkout.text}`);
const token = new URL(checkout.json.url).searchParams.get("token");
const confirmed = await request("/api/v1/billing/demo-confirm", { method: "POST", body: { token } });
assert(confirmed.status === 200 && confirmed.json?.plan === "pro", `confirm ${confirmed.status} ${confirmed.text}`);

const plan = await request("/api/v1/usage", { apiKey: key });
assert(plan.json.key.plan === "pro", `plan ${plan.text}`);

const minted = await request("/api/v1/keys/free", {
  method: "POST",
  body: { name: "smoke" },
  headers: { "x-real-ip": `203.0.113.${1 + Math.floor(Math.random() * 200)}` },
});
assert(minted.status === 201 && minted.json?.plan === "demo" && minted.json?.tier === "free", `free key ${minted.status} ${minted.text}`);
assert(typeof minted.json.key === "string" && minted.json.key.startsWith("sk_test_"), "free key secret");
assert(!minted.text.includes("SHOTAPI_ADMIN_TOKEN"), "admin token leaked");

const freePng = await request("/api/v1/render", {
  method: "POST",
  apiKey: minted.json.key,
  body: { url: "https://example.com", format: "png" },
});
assert(freePng.status === 200, `free png ${freePng.status} ${freePng.text}`);
assert(freePng.bytes.subarray(0, 4).toString("hex") === "89504e47", "free png magic");
assert(freePng.headers.get("x-shotapi-plan") === "demo", "free plan header");

const blockedAdmin = await request("/api/v1/keys", { method: "POST", body: { plan: "pro" } });
assert(blockedAdmin.status === 401 || blockedAdmin.status === 503, `admin keys ${blockedAdmin.status}`);

const billingAfter = await request("/api/v1/health");
assert(billingAfter.json?.billing === health.json.billing, "billing changed");

console.log("smoke ok", {
  storage: health.json.storage,
  billing: health.json.billing,
  driver: health.json.driver,
  used: plan.json.used,
});
