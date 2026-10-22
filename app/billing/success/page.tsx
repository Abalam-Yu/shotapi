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
          The key moves to Pro when the billing webhook confirms payment.
          Creem posts to <code>/api/v1/billing/webhook/creem</code>. Stripe posts to <code>/api/v1/billing/webhook</code>.
          Check <code>GET /api/v1/usage</code>.
        </p>
      )}
    </section>
  );
}
