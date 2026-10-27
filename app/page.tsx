import Link from "next/link";

import { CodeSample } from "@/components/code-sample";
import { MintKey } from "@/components/mint-key";
import { TryIt } from "@/components/try-it";
import { resolveBillingProvider } from "@/lib/billing/provider";
import { config, isDemoMode } from "@/lib/config";
import { APP_BASE, curlQuickStart, DEMO_KEY_SAMPLE, PRO_PRICE } from "@/lib/examples";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const demo = isDemoMode();
  const showBuiltInKey = demo && config.demoKey() === DEMO_KEY_SAMPLE;
  const billing = resolveBillingProvider();
  const demoQuota = config.quotaDemo().toLocaleString("en-US");
  const proQuota = config.quotaPro().toLocaleString("en-US");

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Screenshot &amp; PDF API</p>
          <h1>A URL or HTML snippet in. PNG, JPEG, or PDF out.</h1>
          <p className="zh">把公开 URL 或 HTML 渲染成 PNG、JPEG 或 PDF。</p>
          <p className="lede">
            ShotAPI is an HTTP API. Send a public URL or a piece of HTML and get an image or a PDF
            back. Authorize with an API key. ShotAPI Pro is {PRO_PRICE}/month.
          </p>
          <div className="actions">
            <a className="button" href="#free-key">
              Mint a free key
            </a>
            <Link className="button secondary" href="/docs">
              Read the docs
            </Link>
            <a className="button secondary" href="#pricing">
              Pro · {PRO_PRICE}/mo
            </a>
          </div>
        </div>
        <CodeSample label="Quick start" code={curlQuickStart} />
      </section>

      <section className="grid-3" aria-label="How it works">
        <article className="card">
          <p className="step">01</p>
          <h3>Send HTML or a URL</h3>
          <p>
            POST JSON to <code>/api/v1/render</code>. Set <code>format</code> to <code>png</code>,{" "}
            <code>jpeg</code>, or <code>pdf</code>.
          </p>
        </article>
        <article className="card">
          <p className="step">02</p>
          <h3>Authorize with a key</h3>
          <p>
            Send <code>Authorization: Bearer</code> or <code>X-API-Key</code>. The server stores a
            hash of the secret.
          </p>
        </article>
        <article className="card">
          <p className="step">03</p>
          <h3>Usage is recorded</h3>
          <p>
            Each success increments that key&apos;s UTC month. Response headers show usage, limit,
            and plan.
          </p>
        </article>
      </section>

      <section className="section" id="pricing">
        <h2>Pricing</h2>
        <p className="lede">
          Two monthly quotas. Upgrade the key that calls the API by starting checkout.
        </p>
        <div className="pricing">
          <article className="card">
            <p className="step">DEMO</p>
            <h3>Free</h3>
            <div className="price-tag">
              <span className="price-amount">$0</span>
              <span className="price-period">/ month</span>
            </div>
            <ul className="feature-list">
              <li>{demoQuota} renders / month</li>
              <li>PNG, JPEG, and PDF</li>
              <li>No card required</li>
            </ul>
            <a className="button secondary" href="#free-key">
              Mint a free key
            </a>
          </article>
          <article className="card card-pro">
            <p className="step">PRO</p>
            <h3>ShotAPI Pro</h3>
            <div className="price-tag">
              <span className="price-amount">{PRO_PRICE}</span>
              <span className="price-period">/ month</span>
            </div>
            <ul className="feature-list">
              <li>{proQuota} renders / month</li>
              <li>Same render API, higher quota</li>
              <li>
                {billing === "creem"
                  ? "Checkout through Creem"
                  : billing === "stripe"
                    ? "Stripe sandbox subscription"
                    : billing === "paddle"
                      ? "Paddle checkout is not available yet"
                      : billing === null
                        ? "Billing provider is misconfigured"
                        : "Mock checkout when live billing is off"}
              </li>
            </ul>
            <Link className="button" href="/docs#checkout">
              Start checkout
            </Link>
            <p className="fineprint">
              {billing === "creem" ? (
                <>
                  <code>POST /api/v1/billing/checkout</code> with your API key returns a Creem URL.
                  The key moves to Pro when the webhook confirms payment. Published price: {PRO_PRICE}/month.
                </>
              ) : billing === "stripe" ? (
                <>
                  <code>POST /api/v1/billing/checkout</code> opens a Stripe subscription for{" "}
                  <code>STRIPE_PRICE_ID</code>. Publish that price as {PRO_PRICE}/month.
                </>
              ) : billing === "paddle" ? (
                <>Paddle checkout is not available yet. The published price is {PRO_PRICE}/month.</>
              ) : billing === null ? (
                <><code>BILLING_PROVIDER</code> must be creem, paddle, stripe, or demo.</>
              ) : (
                <>
                  <code>POST /api/v1/billing/checkout</code> with your API key returns a mock Checkout URL.
                  The published price is {PRO_PRICE}/month.
                </>
              )}
            </p>
          </article>
        </div>
      </section>

      <section className="section" id="free-key">
        <h2>Mint a free key</h2>
        <p className="lede">
          No account and no admin token. A Free key is plan <code>demo</code>: {demoQuota} renders
          per UTC month. The full secret is shown once. Pro checkout still uses the key you already
          have.
        </p>
        <MintKey origin={APP_BASE} limit={config.quotaDemo()} />
      </section>

      <section className="section" id="try">
        <h2>Render a snippet</h2>
        {demo ? (
          <>
            <p>
              Demo mode is on. This form calls <code>/api/v1/demo/render</code>, which uses the
              seeded demo key and counts toward its quota.
              {showBuiltInKey ? (
                <>
                  {" "}
                  The built-in key is <code>{DEMO_KEY_SAMPLE}</code>. It stops working when{" "}
                  <code>SHOTAPI_DEMO=0</code>. Use a Free key from above for a key of your own.
                </>
              ) : null}
            </p>
            <TryIt />
          </>
        ) : (
          <p>
            The shared preview form is off. Mint a Free key above, then call{" "}
            <code>POST {APP_BASE}/api/v1/render</code>. The request shape is in the{" "}
            <Link href="/docs#render">docs</Link>.
          </p>
        )}
      </section>

      <section className="section">
        <h2>What this API does not do</h2>
        <ul>
          <li>Private hosts are blocked unless you set <code>ALLOW_PRIVATE_URLS=1</code>.</li>
          <li>Pages behind a login are not supported. Cookies are not forwarded.</li>
          <li>Responses stop at 4.5 MB, which is the platform body limit.</li>
          <li>On Vercel, usage stays in memory until you set Upstash Redis.</li>
        </ul>
        <p>
          Auth, the render fields, billing, and rate limits are in the{" "}
          <Link href="/docs">API docs</Link>.
        </p>
      </section>
    </>
  );
}
