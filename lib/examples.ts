export const DEMO_KEY_SAMPLE = "sk_demo_local_dev_only";

export const curlPng = `curl -sS -X POST http://localhost:3000/api/v1/render \\
  -H "authorization: Bearer ${DEMO_KEY_SAMPLE}" \\
  -H "content-type: application/json" \\
  -o shot.png \\
  -d '{"html":"<h1>Hello</h1>","format":"png","viewport":{"width":1280,"height":720}}'`;

export const curlPdf = `curl -sS -X POST http://localhost:3000/api/v1/render \\
  -H "authorization: Bearer ${DEMO_KEY_SAMPLE}" \\
  -H "content-type: application/json" \\
  -o page.pdf \\
  -d '{"url":"https://example.com","format":"pdf"}'`;

export const curlUsage = `curl -sS http://localhost:3000/api/v1/usage \\
  -H "authorization: Bearer ${DEMO_KEY_SAMPLE}"`;

export const curlKey = `curl -sS -X POST http://localhost:3000/api/v1/keys \\
  -H "authorization: Bearer $SHOTAPI_ADMIN_TOKEN" \\
  -H "content-type: application/json" \\
  -d '{"name":"acme","plan":"demo"}'`;

export const curlCheckout = `curl -sS -X POST http://localhost:3000/api/v1/billing/checkout \\
  -H "authorization: Bearer ${DEMO_KEY_SAMPLE}"`;
