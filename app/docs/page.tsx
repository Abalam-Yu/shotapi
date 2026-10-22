import type { Metadata } from "next";
import Link from "next/link";

import { CodeSample } from "@/components/code-sample";
import { config } from "@/lib/config";
import { APP_BASE, curlCheckout, curlKey, curlPdf, curlPng, curlUsage, DEMO_KEY_SAMPLE, PRO_PRICE } from "@/lib/examples";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "API docs",
  description: "Authenticate with Bearer or X-API-Key, render PNG, JPEG, or PDF, and start checkout.",
};

export default function DocsPage() {
  const demoQuota = config.quotaDemo().toLocaleString("en-US");
  const proQuota = config.quotaPro().toLocaleString("en-US");

  return (
    <article className="section">
      <p className="eyebrow">Reference</p>
      <h1>API docs</h1>
      <p className="lede">
        Base URL: <code>{APP_BASE}</code>. Send a public URL or HTML to{" "}
        <code>POST /api/v1/render</code> and get PNG, JPEG, or PDF back. ShotAPI Pro is {PRO_PRICE}/month{" "}
        (<Link href="/#pricing">{proQuota} renders</Link>; demo is {demoQuota}/month).
      </p>
      <nav className="toc" aria-label="On this page">
        <a href="#auth">Auth</a>
        <a href="#render">Screenshots &amp; PDF</a>
        <a href="#usage">Usage</a>
        <a href="#keys">Keys</a>
        <a href="#demo">Demo preview</a>
        <a href="#checkout">Billing</a>
        <a href="#errors">Errors</a>
        <a href="#limits">Rate limits</a>
        <a href="#health">Health</a>
      </nav>

      <h2 id="auth">Auth</h2>
      <p>
        Customer routes accept either header. The value is the raw secret, with no extra prefix on{" "}
        <code>X-API-Key</code>:
      </p>
      <ul>
        <li>
          <code>Authorization: Bearer &lt;key&gt;</code>
        </li>
        <li>
          <code>X-API-Key: &lt;key&gt;</code>
        </li>
      </ul>
      <p>
        A missing key returns <code>401 unauthorized</code>. The server stores a SHA-256 hash and
        shows a prefix (the first 16 characters) on later reads. The sample secret{" "}
        <code>{DEMO_KEY_SAMPLE}</code> works only while demo mode is on. On Vercel, demo mode is off
        unless <code>SHOTAPI_DEMO=1</code>. Mint a real key with the admin token below.
      </p>
      <p>
        <code>POST /api/v1/keys</code> uses <code>SHOTAPI_ADMIN_TOKEN</code> in those same headers.
        That token is not a customer API key. Browser callers may POST cross-origin; CORS allows{" "}
        <code>Authorization</code>, <code>Content-Type</code>, and <code>X-API-Key</code>.
      </p>
      <p>
        Failures are JSON: <code>{`{ "error": { "code", "message", "requestId" } }`}</code>, with{" "}
        <code>x-request-id</code> on the response.
      </p>

      <h2 id="render">POST /api/v1/render</h2>
      <p>
        One route covers both. <code>format: &quot;png&quot;</code> or <code>&quot;jpeg&quot;</code>{" "}
        returns a screenshot (<code>image/png</code> or <code>image/jpeg</code>).{" "}
        <code>format: &quot;pdf&quot;</code> returns <code>application/pdf</code>. Send exactly one of{" "}
        <code>url</code> or <code>html</code>. <code>jpg</code> is accepted and stored as JPEG.
      </p>
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Field</th>
              <th>Default</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>url</code></td>
              <td></td>
              <td>Public http(s) URL, max 2048 characters. Credentials, localhost, and private networks are rejected.</td>
            </tr>
            <tr>
              <td><code>html</code></td>
              <td></td>
              <td>Document loaded with <code>setContent</code>. Default max 500 KB (<code>SHOTAPI_MAX_HTML_BYTES</code>).</td>
            </tr>
            <tr>
              <td><code>format</code></td>
              <td><code>png</code></td>
              <td><code>png</code>, <code>jpeg</code>, <code>jpg</code>, or <code>pdf</code>.</td>
            </tr>
            <tr>
              <td><code>viewport.width</code></td>
              <td><code>1280</code></td>
              <td>320–1920.</td>
            </tr>
            <tr>
              <td><code>viewport.height</code></td>
              <td><code>800</code></td>
              <td>240–4000.</td>
            </tr>
            <tr>
              <td><code>viewport.deviceScaleFactor</code></td>
              <td><code>1</code></td>
              <td>1–2.</td>
            </tr>
            <tr>
              <td><code>fullPage</code></td>
              <td><code>false</code></td>
              <td>PNG and JPEG only. PDF uses the paper size below.</td>
            </tr>
            <tr>
              <td><code>quality</code></td>
              <td><code>80</code></td>
              <td>JPEG quality, 1–100. Ignored for PNG and PDF.</td>
            </tr>
            <tr>
              <td><code>waitUntil</code></td>
              <td><code>load</code></td>
              <td><code>load</code>, <code>domcontentloaded</code>, or <code>networkidle</code>.</td>
            </tr>
            <tr>
              <td><code>delayMs</code></td>
              <td><code>0</code></td>
              <td>Extra wait after load, max 5000.</td>
            </tr>
            <tr>
              <td><code>pdf.format</code></td>
              <td><code>A4</code></td>
              <td><code>A4</code>, <code>Letter</code>, or <code>Legal</code>. PDF is rendered with print media.</td>
            </tr>
            <tr>
              <td><code>pdf.landscape</code></td>
              <td><code>false</code></td>
              <td></td>
            </tr>
            <tr>
              <td><code>pdf.printBackground</code></td>
              <td><code>true</code></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Success headers: <code>content-type</code>, <code>content-disposition</code> (
        <code>inline; filename=&quot;shot.png&quot;</code>, <code>shot.jpg</code>, or <code>shot.pdf</code>
        ), <code>x-shotapi-usage</code>, <code>x-shotapi-limit</code>, <code>x-shotapi-plan</code>,{" "}
        <code>x-shotapi-storage</code>, and <code>x-request-id</code>. A target page that returns 404
        is still rendered. The API does not forward cookies or your API key. The browser user agent
        is <code>ShotAPI/0.1</code>. Request bodies must be JSON, up to 1 MB by default (
        <code>SHOTAPI_MAX_BODY_BYTES</code>).
      </p>
      <CodeSample label="HTML to PNG" code={curlPng} />
      <CodeSample label="URL to PDF" code={curlPdf} />
      <p>
        Replace <code>{DEMO_KEY_SAMPLE}</code> with a key from <a href="#keys">POST /api/v1/keys</a>{" "}
        when demo mode is off.
      </p>

      <h2 id="usage">GET /api/v1/usage</h2>
      <p>
        Requires a customer key. Returns <code>key</code> (id, name, prefix, plan), <code>period</code>{" "}
        (UTC <code>YYYY-MM</code>), <code>used</code>, <code>limit</code>, <code>remaining</code>,{" "}
        <code>bytesOut</code>, <code>storage</code> (<code>file</code>, <code>memory</code>, or{" "}
        <code>upstash</code>), <code>persistent</code>, and <code>recent</code> (up to 10 renders:
        source kind, format, status, bytes, duration). Target URLs and HTML are not stored.
      </p>
      <CodeSample label="Usage with X-API-Key" code={curlUsage} />

      <h2 id="keys">POST /api/v1/keys</h2>
      <p>
        Mints a key. Requires <code>SHOTAPI_ADMIN_TOKEN</code>. Returns <code>201</code> with{" "}
        <code>key</code>, <code>id</code>, <code>prefix</code>, <code>name</code>, and <code>plan</code>.
        The full secret is in this response only. Body fields are optional:{" "}
        <code>{`{ "name": "acme", "plan": "demo" }`}</code>. <code>name</code> defaults to{" "}
        <code>API key</code> (1–80 characters). <code>plan</code> is <code>demo</code> or{" "}
        <code>pro</code>, default <code>demo</code>. If the admin token is unset the route returns{" "}
        <code>503 admin_disabled</code>.
      </p>
      <CodeSample code={curlKey} />

      <h2 id="demo">POST /api/v1/demo/render</h2>
      <p>
        Open HTML preview used by the landing page. It exists only when demo mode is on (
        <code>SHOTAPI_DEMO=1</code>, or any process that is not running on Vercel). It accepts{" "}
        <code>html</code> only, up to 20 KB, and is limited to 30 requests a minute per instance.
        Over the limit it returns <code>429 rate_limited</code> and <code>Retry-After: 30</code>.
        The render still counts against the seeded demo key. When demo mode is off the route returns{" "}
        <code>404 demo_disabled</code>.
      </p>

      <div id="billing">
      <h2 id="checkout">Billing and checkout</h2>
      <p>
        <strong>ShotAPI Pro</strong> is <strong>{PRO_PRICE}/month</strong> for {proQuota} renders.
        Demo includes {demoQuota} renders. Quotas follow <code>SHOTAPI_QUOTA_DEMO</code> and{" "}
        <code>SHOTAPI_QUOTA_PRO</code> (defaults 100 and 10,000). Publish the Creem product, and
        Stripe&apos;s <code>STRIPE_PRICE_ID</code> when that sandbox is in use, at {PRO_PRICE}.
      </p>
      <p>
        <code>POST /api/v1/billing/checkout</code> with a customer API key returns{" "}
        <code>{`{ "mode", "url" }`}</code>. The provider is <code>BILLING_PROVIDER</code> when set
        (<code>creem</code>, <code>paddle</code>, <code>stripe</code>, or <code>demo</code>).
        Otherwise Creem is used when <code>CREEM_API_KEY</code> is set, then Stripe when{" "}
        <code>STRIPE_SECRET_KEY</code> is set, then demo.
      </p>
      <ul>
        <li>
          In demo mode, <code>mode</code> is <code>demo</code> and <code>url</code> opens{" "}
          <code>/billing/mock</code>. Confirming that page, or POSTing <code>{`{ "token" }`}</code>{" "}
          to <code>/api/v1/billing/demo-confirm</code>, sets the key&apos;s plan to <code>pro</code>.
          The token expires after 30 minutes. Demo confirm returns <code>404</code> when the billing
          provider is not demo.
        </li>
        <li>
          With Creem, <code>mode</code> is <code>creem</code>. Checkout sends <code>metadata.keyId</code>{" "}
          and <code>request_id</code> equal to the API key id. Set <code>CREEM_TEST_MODE=1</code> to
          call <code>https://test-api.creem.io</code>. Success returns to <code>/billing/success</code>.
          Point the webhook at <code>POST /api/v1/billing/webhook/creem</code> and set{" "}
          <code>CREEM_WEBHOOK_SECRET</code>. The route checks the <code>creem-signature</code> HMAC.{" "}
          <code>checkout.completed</code> and <code>subscription.paid</code> set the plan to{" "}
          <code>pro</code> and store the Creem customer and subscription ids.{" "}
          <code>subscription.canceled</code> and <code>subscription.expired</code> return the key to{" "}
          <code>demo</code>. A scheduled cancellation does not change the plan.
        </li>
        <li>
          With Stripe, <code>mode</code> is <code>stripe</code> and <code>url</code> is a subscription
          Checkout session for <code>STRIPE_PRICE_ID</code>. Success returns to{" "}
          <code>/billing/success</code>; cancel returns to <code>/billing/cancel</code>. Set{" "}
          <code>NEXT_PUBLIC_APP_URL</code> so those URLs use the public origin. Point Stripe at{" "}
          <code>POST /api/v1/billing/webhook</code> and set <code>STRIPE_WEBHOOK_SECRET</code>. The
          webhook authenticates with <code>Stripe-Signature</code>, not an API key.{" "}
          <code>checkout.session.completed</code> upgrades the key to <code>pro</code>.{" "}
          <code>customer.subscription.deleted</code>, or an update whose status is <code>canceled</code>{" "}
          or <code>unpaid</code>, returns it to <code>demo</code>. Calling that webhook before Stripe
          is configured returns <code>501 billing_disabled</code>.
        </li>
        <li>
          <code>BILLING_PROVIDER=paddle</code> is reserved. Checkout returns <code>501 billing_disabled</code>{" "}
          until that provider is implemented.
        </li>
      </ul>
      <CodeSample label="Start checkout" code={curlCheckout} />
      <p>
        If <code>STRIPE_METER_EVENT_NAME</code> is set and the key has a Stripe customer id, each
        successful render also sends a Billing Meter event. The payload keys default to{" "}
        <code>stripe_customer_id</code> and <code>value</code> (override with{" "}
        <code>STRIPE_METER_CUSTOMER_PAYLOAD_KEY</code> and <code>STRIPE_METER_VALUE_PAYLOAD_KEY</code>
        ). A meter failure is logged and does not fail the render.
      </p>
      </div>

      <h2 id="errors">Errors</h2>
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Code</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>400</td>
              <td><code>invalid_request</code></td>
              <td>Body failed validation, was not JSON, or included both or neither of url and html.</td>
            </tr>
            <tr>
              <td>400</td>
              <td><code>invalid_url</code> / <code>blocked_url</code></td>
              <td>URL is not public http(s), or the page requests a private host.</td>
            </tr>
            <tr>
              <td>400</td>
              <td><code>invalid_token</code></td>
              <td>Demo checkout token is missing, invalid, or expired.</td>
            </tr>
            <tr>
              <td>400</td>
              <td><code>invalid_signature</code></td>
              <td>Stripe or Creem webhook signature is missing or invalid.</td>
            </tr>
            <tr>
              <td>401</td>
              <td><code>unauthorized</code></td>
              <td>Missing or unknown API key, or the admin token does not match.</td>
            </tr>
            <tr>
              <td>402</td>
              <td><code>quota_exceeded</code></td>
              <td>Monthly render quota is used up.</td>
            </tr>
            <tr>
              <td>404</td>
              <td><code>demo_disabled</code></td>
              <td>Demo preview was called while demo mode is off.</td>
            </tr>
            <tr>
              <td>413</td>
              <td><code>payload_too_large</code></td>
              <td>HTML, the request body, or the rendered file is too large.</td>
            </tr>
            <tr>
              <td>429</td>
              <td><code>rate_limited</code></td>
              <td>Demo preview exceeded 30 requests in a minute. <code>Retry-After: 30</code>.</td>
            </tr>
            <tr>
              <td>500</td>
              <td><code>browser_missing</code></td>
              <td>Chrome or serverless Chromium did not launch.</td>
            </tr>
            <tr>
              <td>500</td>
              <td><code>billing_misconfigured</code></td>
              <td>
                The selected provider is missing a required setting, such as <code>STRIPE_PRICE_ID</code>,{" "}
                <code>CREEM_PRODUCT_ID</code>, or a valid <code>BILLING_PROVIDER</code>.
              </td>
            </tr>
            <tr>
              <td>501</td>
              <td><code>billing_disabled</code></td>
              <td>Stripe or Creem webhook secret is unset, or Paddle checkout was requested.</td>
            </tr>
            <tr>
              <td>502 / 504</td>
              <td><code>render_failed</code> / <code>render_timeout</code></td>
              <td>Browser error, empty file, or the render exceeded the timeout. Checkout failures use <code>billing_failed</code> (502).</td>
            </tr>
            <tr>
              <td>503</td>
              <td><code>admin_disabled</code></td>
              <td><code>POST /api/v1/keys</code> while <code>SHOTAPI_ADMIN_TOKEN</code> is unset.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="limits">Rate limits and hard caps</h2>
      <ul>
        <li>
          <code>POST /api/v1/render</code> has no per-minute rate limit. The cap is the monthly quota:
          demo {demoQuota}, Pro {proQuota}. Past that, the route returns 402. The quota is checked
          before rendering, so concurrent calls can finish slightly over the limit.
        </li>
        <li>
          <code>POST /api/v1/demo/render</code> allows 30 requests per minute per instance. The counter
          is in memory and does not span instances. Set <code>SHOTAPI_DEMO_RATELIMIT=0</code> to turn
          it off. A 429 includes <code>Retry-After: 30</code>.
        </li>
        <li>Default render timeout is 25 seconds (<code>RENDER_TIMEOUT_MS</code>). The route <code>maxDuration</code> is 60 seconds.</li>
        <li>Platform response bodies cap at 4.5 MB. Full-page screenshots of long documents can hit that and return 413.</li>
        <li>
          Local renders use installed Chrome via <code>playwright-core</code>. Vercel uses{" "}
          <code>@sparticuz/chromium</code>, which cold-starts by unpacking Chromium into <code>/tmp</code>{" "}
          and wants about 2 GB of memory.
        </li>
        <li><code>networkidle</code> waits until the network is quiet and can consume the whole timeout.</li>
        <li>Subresource requests to private hosts are aborted. DNS rebinding is a residual risk.</li>
        <li>
          Chrome&apos;s sandbox is off unless <code>SHOTAPI_CHROME_NO_SANDBOX=0</code>. Run the process
          in a container if you render untrusted pages.
        </li>
      </ul>

      <h2 id="health">GET /api/v1/health</h2>
      <p>
        No API key. Returns <code>ok</code>, <code>driver</code>, <code>browser</code>,{" "}
        <code>billing</code> (<code>demo</code>, <code>creem</code>, <code>creem_incomplete</code>,{" "}
        <code>stripe</code>, <code>stripe_incomplete</code>, <code>paddle</code>, or <code>invalid</code>
        ), <code>storage</code>, <code>persistent</code>, and <code>demo</code>.
      </p>
    </article>
  );
}
