export const DEMO_KEY_SAMPLE = "sk_demo_local_dev_only";

/** Published Pro price. Stripe charges the recurring price in STRIPE_PRICE_ID. */
export const PRO_PRICE = "$19";

/**
 * Host used in public landing and docs samples.
 * Set NEXT_PUBLIC_APP_URL to override (same origin Stripe uses for return URLs).
 */
export const APP_BASE =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://shotapi-three.vercel.app";

export const curlFreeKey = `curl -sS -X POST ${APP_BASE}/api/v1/keys/free \\
  -H "content-type: application/json" \\
  -d '{"name":"show-hn"}'`;

export const curlUrlPng = `curl -sS -X POST ${APP_BASE}/api/v1/render \\
  -H "authorization: Bearer $SHOTAPI_KEY" \\
  -H "content-type: application/json" \\
  -o shot.png \\
  -d '{"url":"https://example.com","format":"png"}'`;

export const curlQuickStart = `# Mint a Free key. No admin token. Copy the key field from the JSON.
${curlFreeKey}

# Render a public URL to PNG.
${curlUrlPng}`;

export const curlPng = `curl -sS -X POST ${APP_BASE}/api/v1/render \\
  -H "authorization: Bearer $SHOTAPI_KEY" \\
  -H "content-type: application/json" \\
  -o shot.png \\
  -d '{"html":"<h1>Hello</h1>","format":"png","viewport":{"width":1280,"height":720}}'`;

export const curlPdf = `curl -sS -X POST ${APP_BASE}/api/v1/render \\
  -H "authorization: Bearer $SHOTAPI_KEY" \\
  -H "content-type: application/json" \\
  -o page.pdf \\
  -d '{"url":"https://example.com","format":"pdf"}'`;

export const curlUsage = `curl -sS ${APP_BASE}/api/v1/usage \\
  -H "x-api-key: $SHOTAPI_KEY"`;

export const curlKey = `curl -sS -X POST ${APP_BASE}/api/v1/keys \\
  -H "authorization: Bearer $SHOTAPI_ADMIN_TOKEN" \\
  -H "content-type: application/json" \\
  -d '{"name":"acme","plan":"demo"}'`;

export const curlCheckout = `curl -sS -X POST ${APP_BASE}/api/v1/billing/checkout \\
  -H "authorization: Bearer $SHOTAPI_KEY"`;
