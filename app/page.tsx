import Link from "next/link";

import { CodeSample } from "@/components/code-sample";
import { TryIt } from "@/components/try-it";
import { resolveBillingProvider } from "@/lib/billing/provider";
import { config, isDemoMode } from "@/lib/config";
import { curlPng, DEMO_KEY_SAMPLE } from "@/lib/examples";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const demo = isDemoMode();
  const showBuiltInKey = demo && config.demoKey() === DEMO_KEY_SAMPLE;
  const billing = resolveBillingProvider();

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Render API</p>
          <h1>A URL goes in. A picture or a PDF comes out.</h1>
          <p className="zh">截图与 HTML 转 PDF 的渲染 API。</p>
          <p className="lede">
            ShotAPI accepts a public URL or a snippet of HTML and returns PNG, JPEG, or PDF.
            Every successful call is counted against the API key that authorized it.
          </p>
          <div className="actions">
            <Link className="button" href="/docs">Read the API</Link>
            <a className="button secondary" href="#try">Try a snippet</a>
          </div>
        </div>
        <CodeSample label="Quick start" code={curlPng} />
      </section>

      <section className="grid-3" aria-label="How it works">
        <article className="card">
          <p className="step">01</p>
          <h3>Send HTML or a URL</h3>
          <p>POST JSON to <code>/api/v1/render</code>. Pick <code>png</code>, <code>jpeg</code>, or <code>pdf</code>.</p>
        </article>
        <article className="card">
          <p className="step">02</p>
          <h3>Authorize with a key</h3>
          <p>Put the key in <code>Authorization: Bearer</code>. The server stores only a hash.</p>
        </article>
        <article className="card">
          <p className="step">03</p>
          <h3>Usage is recorded</h3>
          <p>Each success increments the key&apos;s month. The response headers show the new count.</p>
        </article>
      </section>

      <section className="section" id="try">
        <h2>Render a snippet</h2>
        {demo ? (
          <>
            <p>
              Demo mode is on. This form calls <code>/api/v1/demo/render</code>, which uses the seeded demo key and counts toward its quota.
              {showBuiltInKey ? <> The built-in key is <code>{DEMO_KEY_SAMPLE}</code>. It stops working when <code>SHOTAPI_DEMO=0</code>.</> : null}
            </p>
            <TryIt />
          </>
        ) : (
          <p>Demo mode is off. Create a key with <code>SHOTAPI_ADMIN_TOKEN</code> and call <code>/api/v1/render</code>.</p>
        )}
      </section>

      <section className="section">
        <h2>Plans</h2>
        <div className="pricing">
          <article className="card">
            <p className="step">DEMO</p>
            <h3>100 renders / month</h3>
            <p>
              {billing === "demo"
                ? "No card on this deployment. Mock checkout upgrades the same key to the Pro quota so you can try the billing path."
                : "Free tier for a key that has not subscribed. Upgrade that same key through checkout."}
            </p>
          </article>
          <article className="card">
            <p className="step">PRO · $19 / month</p>
            <h3>10,000 renders / month</h3>
            {billing === "creem" ? (
              <p>
                Checkout uses Creem. <code>POST /api/v1/billing/checkout</code> with your API key returns the payment URL.
                The key moves to Pro when the Creem webhook confirms payment.
              </p>
            ) : billing === "stripe" ? (
              <p>
                Checkout uses Stripe sandbox. Set <code>STRIPE_SECRET_KEY</code>, <code>STRIPE_PRICE_ID</code>, and <code>STRIPE_WEBHOOK_SECRET</code>.
                Optional meter events report each render.
              </p>
            ) : billing === "paddle" ? (
              <p>Paddle is not available yet. Checkout on this provider returns an error until it is implemented.</p>
            ) : billing === null ? (
              <p><code>BILLING_PROVIDER</code> must be creem, paddle, stripe, or demo.</p>
            ) : (
              <p>
                No card on this deployment. <code>POST /api/v1/billing/checkout</code> returns a mock checkout that upgrades the same key.
              </p>
            )}
          </article>
        </div>
      </section>

      <section className="section">
        <h2>What this MVP will not pretend to do</h2>
        <ul>
          <li>Private hosts are blocked unless you set <code>ALLOW_PRIVATE_URLS=1</code>.</li>
          <li>Pages behind a login are not supported. Cookies are not forwarded.</li>
          <li>Responses stop at 4.5 MB, which is the platform body limit.</li>
          <li>On Vercel, usage stays in memory until you set Upstash Redis.</li>
        </ul>
        <p>Details, environment variables, and the Vercel deploy notes are in the <Link href="/docs">docs</Link> and the README.</p>
      </section>
    </>
  );
}
