import type { Metadata } from "next";

import { LegalDocument } from "@/components/legal-document";
import { config } from "@/lib/config";

export const metadata: Metadata = {
  title: "Refund and cancellation policy",
  description: "How to cancel a ShotAPI Pro subscription and when a refund is available.",
};

export default function RefundPage() {
  const email = config.supportEmail();
  return (
    <LegalDocument
      title="Refund and cancellation"
      description="This policy covers the ShotAPI Pro subscription, a digital rendering API billed monthly."
    >
      <h2>What you are buying</h2>
      <p>
        Pro is a monthly subscription for the ShotAPI rendering API at 19 US dollars per month, before any tax the
        merchant of record adds at checkout. The current Pro quota is 10,000 successful renders per UTC calendar month.
        Access is delivered immediately, over the API, as soon as payment is confirmed. There is no physical good to return.
      </p>

      <h2>How to cancel</h2>
      <p>
        Email <a href={`mailto:${email}`}>{email}</a> from the address you used at checkout. Include the API key prefix
        (the short prefix, not the full secret) and, if you have it, the receipt or subscription id from the merchant of
        record. You can also cancel in that processor&apos;s customer portal when they provide one.
      </p>
      <p>
        Cancellation stops the next renewal. It does not delete the API key. When the subscription is actually canceled
        or it expires, the key returns to the free demo quota. If cancellation is scheduled for the end of the period you
        already paid, Pro access continues until that cancellation or expiry takes effect. We apply the change when the
        processor sends the matching webhook.
      </p>

      <h2>Refunds</h2>
      <p>
        Because Pro is a digital service that starts as soon as checkout completes, a billing period that has already
        been paid is not refunded merely because you stopped using it, except where the law requires a refund.
      </p>
      <p>Email us within 14 days of the charge and we will refund that charge when any of these is true:</p>
      <ul>
        <li>You were charged twice, or charged after a cancellation we had already confirmed.</li>
        <li>You could not use the API for a reason on our side, and we cannot fix it within a reasonable time.</li>
        <li>The law where you live requires a refund for this kind of purchase.</li>
      </ul>
      <p>
        A render that fails because the target page is private, slow, or blocked, or because the monthly quota is used
        up, is not a billing error. Partial months are not prorated.
      </p>
      <p>
        Approved refunds are sent by the merchant of record (Creem today; Paddle if we enable it later; Stripe only when
        that sandbox path was the processor) back to the original payment method. Banks and card networks can take
        several business days to show the credit. We do not refund to a different instrument.
      </p>

      <h2>How to ask</h2>
      <p>
        Write to <a href={`mailto:${email}`}>{email}</a> with the key prefix, the approximate charge date, and the
        payment email. We will answer and, when a refund is due, ask the merchant of record to process it. Do not send
        the full API secret or a card number.
      </p>
    </LegalDocument>
  );
}