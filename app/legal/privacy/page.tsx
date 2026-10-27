import type { Metadata } from "next";

import { LegalDocument } from "@/components/legal-document";
import { config } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for ShotAPI, describing what the API stores and what payment processors receive.",
};

export default function PrivacyPage() {
  const email = config.supportEmail();
  return (
    <LegalDocument
      title="Privacy Policy"
      description="This policy explains what ShotAPI stores when you use the rendering API and the public website."
      updated="27 October 2026"
    >
      <h2>Who we are</h2>
      <p>
        ShotAPI is operated by 禧柱 于 (Abalam-Yu), an individual seller. For privacy requests, email{" "}
        <a href={`mailto:${email}`}>{email}</a>. The public site and API are hosted on Vercel.
      </p>

      <h2>What we collect</h2>
      <p>We keep the data needed to authenticate a key, count usage, and apply a paid plan.</p>
      <ul>
        <li>API key records: an id, a display name, a prefix, a hash of the secret, the plan, and the time the key was created. The plaintext secret is not stored after it is shown once.</li>
        <li>Usage: a monthly count and byte total, plus a short event with the format, whether the source was a URL or HTML, the HTTP status, the byte size, and how long the render took. We do not store the URL, the HTML body, or the rendered file.</li>
        <li>Billing identifiers, when you pay: the billing provider, and the customer id and subscription id that provider sends us. We also send the API key id to that provider as checkout metadata so the webhook can find the key.</li>
        <li>Operational logs: request ids and error messages. Logs are for debugging and are not a customer database.</li>
        <li>
          Free-key mint: a short-lived hash of the client IP address, and a hash of the email if you type one. These
          hashes enforce the mint rate limit. They are not written onto the API key record. The window is 24 hours by
          default, then the counter expires. We do not store the raw IP or the raw email.
        </li>
      </ul>
      <p>
        The marketing site does not run advertising cookies and does not ask you to create an account. The API is called
        with an <code>Authorization</code> header or <code>X-API-Key</code>, not a browser session.
      </p>

      <h2>Payments</h2>
      <p>
        Card details are entered on the merchant of record&apos;s checkout page. Creem is the primary live processor.
        Stripe may be used in sandbox mode. Paddle may be added later. Those companies receive the payment data you submit
        to them, and they send us a webhook with the result, their customer id, and the key id we attached. We do not
        receive your full card number. Their privacy notices govern what they do with payment data.
      </p>

      <h2>Why we use it</h2>
      <ul>
        <li>To authenticate requests and enforce the monthly quota.</li>
        <li>To turn a paid subscription on or off for the key that started checkout.</li>
        <li>To keep the service reliable, investigate abuse, and fix failures.</li>
        <li>To meet tax, accounting, and dispute duties that apply to the operator or the merchant of record.</li>
      </ul>
      <p>
        We do not sell personal information. We do not use render contents to train models. We do not build advertising profiles.
      </p>

      <h2>Who else processes it</h2>
      <ul>
        <li>Vercel hosts the application and may process request metadata as our infrastructure provider.</li>
        <li>Upstash Redis stores key and usage records when it is configured. Without it, usage may stay in memory on the server and disappear when the instance stops.</li>
        <li>Creem, Stripe, or Paddle, when that provider is the one configured for checkout.</li>
      </ul>
      <p>
        A render fetches the URL you submit, or loads the HTML you submit, inside a browser we operate. That request is
        visible to the site you asked us to capture. We do not forward your API key or cookies to that site.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Key and usage records are kept while the key exists. Email <a href={`mailto:${email}`}>{email}</a> to ask us to
        delete a key. We will remove our copy of the key record and its usage. Billing identifiers may be retained for as
        long as the merchant of record, tax rules, or a payment dispute requires. Server logs are kept for a short
        operational period and then discarded by the host.
      </p>

      <h2>International transfers</h2>
      <p>
        The operator is an individual in mainland China. Hosting, Redis, and payment processors may store data in other
        countries, including the United States and the European Union. Those processors act under their own terms and
        data-processing commitments.
      </p>

      <h2>Your requests</h2>
      <p>
        Depending on where you live, you may have the right to access, correct, or delete personal information we hold,
        or to object to a particular use. Email <a href={`mailto:${email}`}>{email}</a> with the key prefix (not the full
        secret) and the email you used at checkout. We may need to confirm that you control the key. Payment records held
        only by the merchant of record have to be requested from them as well.
      </p>
      <p>
        The service is not directed at children under 16, and we do not knowingly collect their personal information.
      </p>

      <h2>Changes</h2>
      <p>
        We will post changes on this page and update the date above. A change that materially expands what we collect
        will be reflected here before we rely on it for new processing.
      </p>
    </LegalDocument>
  );
}
