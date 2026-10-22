import type { Metadata } from "next";

import { LegalDocument } from "@/components/legal-document";
import { config } from "@/lib/config";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of Service for ShotAPI, a screenshot and PDF rendering API.",
};

export default function TermsPage() {
  const email = config.supportEmail();
  return (
    <LegalDocument
      title="Terms of Service"
      description="These terms cover the ShotAPI screenshot and PDF rendering API."
    >
      <h2>The service</h2>
      <p>
        ShotAPI is a hosted API that renders a public URL or a snippet of HTML to PNG, JPEG, or PDF.
        You call it with an API key. A successful render counts against that key&apos;s monthly quota.
        The service is operated by 禧柱 于 (Abalam-Yu), an individual seller (&quot;we&quot;, &quot;us&quot;).
      </p>

      <h2>API keys</h2>
      <p>
        Keys are issued by the operator. The full secret is shown once, when the key is created. We store only a hash.
        You are responsible for keeping the secret confidential and for every request made with it. If a secret is lost or
        exposed, contact <a href={`mailto:${email}`}>{email}</a> and we will revoke it and issue a replacement. We cannot
        recover a secret we no longer hold.
      </p>

      <h2>Plans and price</h2>
      <p>
        The published Pro plan is 19 US dollars per month for 10,000 successful renders in a UTC calendar month.
        The free demo plan is 100 successful renders in the same period and does not require a card.
        The quota that applies to a key is the limit returned by <code>GET /api/v1/usage</code>. Failed renders are not counted.
        Taxes, if any, are added by the merchant of record at checkout. We may change the price or quota for future billing
        periods; the price you are charged is the price shown at checkout.
      </p>

      <h2>Payments</h2>
      <p>
        Paid checkout is sold by a merchant of record, not by us directly. Creem is the primary live processor.
        Stripe may be used in sandbox mode. Paddle may be added later and is not available until we say so.
        The merchant of record is the seller of record for the payment, appears on your statement, calculates tax, and
        processes the charge on their checkout page. We do not collect or store card numbers. We attach your API key id
        to the checkout so the matching key can be upgraded after the processor confirms payment.
      </p>
      <p>
        Pro access starts when we receive a completed checkout or a paid subscription event for that key. It returns to
        the demo quota when we receive a cancellation or expiry event. A cancellation that is only scheduled for the end
        of the period does not remove Pro access early. See the <a href="/legal/refund">refund and cancellation policy</a>.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Do not send a URL or HTML you are not allowed to capture.</li>
        <li>Do not use the API to attack, scan, or reach private networks, localhost, or cloud metadata services.</li>
        <li>Do not send malware, or content that is illegal where you or we operate.</li>
        <li>Do not share, resell, or publish your API secret, or try to bypass quotas or authentication.</li>
        <li>Do not overload the service. We may throttle or suspend a key that threatens availability.</li>
      </ul>
      <p>
        Pages behind a login are not supported. We do not forward cookies. Rendered output is returned to you and is not
        a guarantee that the target page is accurate, complete, or lawful to copy.
      </p>

      <h2>Availability</h2>
      <p>
        The API is provided as a best-effort hosted service. Rendering depends on a browser, the target page, and the
        hosting platform. We may suspend the service for maintenance, abuse, or a failure of a provider we rely on.
        We do not promise a particular uptime, and a failed or timed-out render is not itself a billing error.
      </p>

      <h2>Your content and ours</h2>
      <p>
        You keep the rights to the HTML you send and to the files the API returns to you. You give us a limited right
        to process that material solely to perform the render and to operate, secure, and debug the service. The ShotAPI
        name, site, and API are ours. These terms do not grant you a right to our trademarks.
      </p>

      <h2>Disclaimers and liability</h2>
      <p>
        The service is provided &quot;as is&quot;. To the extent the law allows, we disclaim warranties of merchantability,
        fitness for a particular purpose, and non-infringement. We are not liable for lost profits, lost data, or indirect
        or consequential damages, or for what a target website does. Our total liability arising out of the service in any
        twelve-month period is limited to the amount you paid us for ShotAPI in that period, or fifty US dollars if you
        paid nothing. Nothing in these terms limits liability that cannot legally be limited, including liability for
        fraud or for death or personal injury caused by negligence.
      </p>

      <h2>Suspension</h2>
      <p>
        We may suspend or revoke a key that breaks these terms, that we reasonably believe is compromised, or that a
        payment processor tells us not to honor. You may stop using the service at any time. Cancellation of a paid plan
        is described in the refund policy.
      </p>

      <h2>Law</h2>
      <p>
        These terms are governed by the laws of the People&apos;s Republic of China, without limiting mandatory consumer
        protections in your place of residence or the merchant of record&apos;s own terms for the payment. Courts at the
        operator&apos;s place of residence have jurisdiction, except where the law gives you the right to sue elsewhere.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms by posting a new version on this page and changing the date above. Continued use after
        the new date means you accept the update. If you do not accept it, stop using the service and cancel any paid plan.
      </p>
    </LegalDocument>
  );
}
