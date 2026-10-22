export const dynamic = "force-dynamic";

export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  return (
    <section className="section">
      <p className="eyebrow">Billing</p>
      <h1>Checkout finished</h1>
      {mode === "demo" ? (
        <p>Demo upgrade applied. This key is on the Pro quota. No payment was collected.</p>
      ) : (
        <p>
          If Stripe is configured, the key upgrades when <code>checkout.session.completed</code> reaches the webhook.
          Check <code>GET /api/v1/usage</code>.
        </p>
      )}
    </section>
  );
}
