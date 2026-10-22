import type { Metadata } from "next";

import { CodeSample } from "@/components/code-sample";
import { curlCheckout, curlKey, curlPdf, curlPng, curlUsage } from "@/lib/examples";

export const metadata: Metadata = {
  title: "API docs",
  description: "How to call the ShotAPI render, usage, key, and billing endpoints.",
};

export default function DocsPage() {
  return (
    <article className="section">
      <p className="eyebrow">Reference</p>
      <h1>API docs</h1>
      <p className="lede">
        All authenticated routes take <code>Authorization: Bearer &lt;key&gt;</code> or <code>X-API-Key</code>.
        Responses that fail are JSON: <code>{`{ "error": { "code", "message", "requestId" } }`}</code>.
      </p>

      <h2>POST /api/v1/render</h2>
      <p>Returns <code>image/png</code>, <code>image/jpeg</code>, or <code>application/pdf</code>. Send exactly one of <code>url</code> or <code>html</code>.</p>
      <div className="panel">
        <table>
          <thead>
            <tr><th>Field</th><th>Default</th><th>Notes</th></tr>
          </thead>
          <tbody>
            <tr><td><code>url</code></td><td></td><td>Public http(s) URL. Private networks are rejected.</td></tr>
            <tr><td><code>html</code></td><td></td><td>Document to load with <code>setContent</code>. Max 500 KB.</td></tr>
            <tr><td><code>format</code></td><td><code>png</code></td><td><code>png</code>, <code>jpeg</code>, <code>jpg</code>, or <code>pdf</code>.</td></tr>
            <tr><td><code>viewport.width</code></td><td><code>1280</code></td><td>320–1920.</td></tr>
            <tr><td><code>viewport.height</code></td><td><code>800</code></td><td>240–4000.</td></tr>
            <tr><td><code>viewport.deviceScaleFactor</code></td><td><code>1</code></td><td>1–2.</td></tr>
            <tr><td><code>fullPage</code></td><td><code>false</code></td><td>PNG and JPEG only.</td></tr>
            <tr><td><code>quality</code></td><td><code>80</code></td><td>JPEG quality, 1–100.</td></tr>
            <tr><td><code>waitUntil</code></td><td><code>load</code></td><td><code>load</code>, <code>domcontentloaded</code>, or <code>networkidle</code>.</td></tr>
            <tr><td><code>delayMs</code></td><td><code>0</code></td><td>Extra wait after load, max 5000.</td></tr>
            <tr><td><code>pdf.format</code></td><td><code>A4</code></td><td><code>A4</code>, <code>Letter</code>, or <code>Legal</code>.</td></tr>
            <tr><td><code>pdf.landscape</code></td><td><code>false</code></td><td></td></tr>
            <tr><td><code>pdf.printBackground</code></td><td><code>true</code></td><td></td></tr>
          </tbody>
        </table>
      </div>
      <p>
        Success headers: <code>x-shotapi-usage</code>, <code>x-shotapi-limit</code>, <code>x-shotapi-plan</code>, <code>x-request-id</code>.
        A target page that returns 404 is still rendered. The API does not forward cookies or your API key to the target.
      </p>
      <CodeSample label="HTML to PNG" code={curlPng} />
      <CodeSample label="URL to PDF" code={curlPdf} />

      <h2>GET /api/v1/usage</h2>
      <p>Returns the key&apos;s plan, the UTC month, used count, limit, bytes written, storage driver, and the last few renders. URLs are not stored.</p>
      <CodeSample code={curlUsage} />

      <h2>POST /api/v1/keys</h2>
      <p>
        Mints a key. Requires <code>Authorization: Bearer $SHOTAPI_ADMIN_TOKEN</code>.
        The full secret is returned once. Later requests only see the prefix. Body: <code>{`{ "name": "acme", "plan": "demo" }`}</code>.
        <code>plan</code> is <code>demo</code> or <code>pro</code>.
      </p>
      <CodeSample code={curlKey} />

      <h2>POST /api/v1/demo/render</h2>
      <p>
        Open HTML preview used by the landing page. It only exists when demo mode is on, accepts <code>html</code> up to 20 KB, and is limited to 30 requests a minute per instance.
        It still counts against the demo key.
      </p>

      <h2>Billing</h2>
      <p>
        <code>POST /api/v1/billing/checkout</code> with the API key returns <code>{`{ "mode", "url" }`}</code>.
        The provider is <code>BILLING_PROVIDER</code> when set (<code>creem</code>, <code>paddle</code>, <code>stripe</code>, or <code>demo</code>).
        Otherwise Creem is used when <code>CREEM_API_KEY</code> is set, then Stripe when <code>STRIPE_SECRET_KEY</code> is set, then demo.
      </p>
      <CodeSample label="Start checkout" code={curlCheckout} />
      <p>
        Demo mode returns a mock checkout URL. Confirming it sets that key&apos;s plan to <code>pro</code>.
        You can also POST the token to <code>/api/v1/billing/demo-confirm</code>.
      </p>
      <p>
        Creem checkout sends <code>metadata.keyId</code> and <code>request_id</code> equal to the API key id.
        Set <code>CREEM_TEST_MODE=1</code> to call <code>https://test-api.creem.io</code>.
        Point the webhook at <code>POST /api/v1/billing/webhook/creem</code> and set <code>CREEM_WEBHOOK_SECRET</code>.
        The route checks the <code>creem-signature</code> HMAC.
        <code>checkout.completed</code> and <code>subscription.paid</code> set the plan to <code>pro</code>.
        <code>subscription.canceled</code> and <code>subscription.expired</code> return it to <code>demo</code>.
        A scheduled cancellation does not change the plan.
      </p>
      <p>
        With Stripe configured, checkout is a subscription for <code>STRIPE_PRICE_ID</code> (a recurring price).
        Point the webhook at <code>POST /api/v1/billing/webhook</code> and set <code>STRIPE_WEBHOOK_SECRET</code>.
        <code>checkout.session.completed</code> upgrades the key. <code>customer.subscription.deleted</code>, or an update to <code>canceled</code> / <code>unpaid</code>, returns it to <code>demo</code>.
      </p>
      <p>
        <code>BILLING_PROVIDER=paddle</code> is reserved. Checkout returns 501 until that provider is implemented.
      </p>
      <p>
        If <code>STRIPE_METER_EVENT_NAME</code> is set and the key has a Stripe customer id, each successful render also sends a Billing Meter event.
        The meter should read <code>stripe_customer_id</code> and <code>value</code>, unless you override those payload keys.
        A meter failure is logged and does not fail the render.
      </p>

      <h2>Errors</h2>
      <div className="panel">
        <table>
          <thead>
            <tr><th>Status</th><th>Code</th><th>When</th></tr>
          </thead>
          <tbody>
            <tr><td>400</td><td><code>invalid_request</code></td><td>Body failed validation.</td></tr>
            <tr><td>400</td><td><code>invalid_url</code> / <code>blocked_url</code></td><td>URL is not public http(s).</td></tr>
            <tr><td>401</td><td><code>unauthorized</code></td><td>Missing or unknown key.</td></tr>
            <tr><td>402</td><td><code>quota_exceeded</code></td><td>Monthly quota is used up.</td></tr>
            <tr><td>413</td><td><code>payload_too_large</code></td><td>HTML or the rendered file is too large.</td></tr>
            <tr><td>429</td><td><code>rate_limited</code></td><td>Demo preview limit.</td></tr>
            <tr><td>502 / 504</td><td><code>render_failed</code> / <code>render_timeout</code></td><td>Browser error or timeout.</td></tr>
            <tr><td>500</td><td><code>browser_missing</code></td><td>Chrome or serverless Chromium did not launch.</td></tr>
          </tbody>
        </table>
      </div>

      <h2>Limits</h2>
      <ul>
        <li>Default render timeout is 25 seconds. The route <code>maxDuration</code> is 60 seconds.</li>
        <li>Platform response bodies cap at 4.5 MB. Full-page screenshots of long documents can hit that and return 413.</li>
        <li>Local renders use installed Chrome via <code>playwright-core</code>. Vercel uses <code>@sparticuz/chromium</code>, which cold-starts by unpacking Chromium into <code>/tmp</code> and wants about 2 GB of memory.</li>
        <li><code>networkidle</code> waits until the network is quiet and can consume the whole timeout.</li>
        <li>Subresource requests to private hosts are aborted. DNS rebinding is a residual risk.</li>
        <li>Chrome&apos;s sandbox is off unless <code>SHOTAPI_CHROME_NO_SANDBOX=0</code>. Run the process in a container if you render untrusted pages.</li>
      </ul>
    </article>
  );
}
