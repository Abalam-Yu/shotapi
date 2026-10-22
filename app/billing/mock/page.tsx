import { redirect } from "next/navigation";

import { confirmDemoCheckout, verifyDemoToken } from "@/lib/billing";
import { ApiError } from "@/lib/errors";
import { quotaFor } from "@/lib/usage";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

async function confirmAction(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "");
  try {
    const store = await getStore();
    await confirmDemoCheckout(store, token);
  } catch (error) {
    if (error instanceof ApiError) {
      redirect(`/billing/mock?token=${encodeURIComponent(token)}&error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }
  redirect("/billing/success?mode=demo");
}

export default async function MockCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token = "", error = "" } = await searchParams;
  if (process.env.STRIPE_SECRET_KEY) {
    return (
      <section className="section">
        <h1>Demo checkout is off</h1>
        <p>Stripe is configured. Plan changes come from Checkout and the webhook.</p>
      </section>
    );
  }

  let summary: { prefix: string; name: string; plan: string } | null = null;
  let invalid = error;
  if (token) {
    try {
      const store = await getStore();
      const { keyId } = verifyDemoToken(await store.getSecret(), token);
      const key = await store.findKeyById(keyId);
      if (!key) invalid = "This key no longer exists.";
      else summary = { prefix: key.prefix, name: key.name, plan: key.plan };
    } catch (caught) {
      invalid = caught instanceof ApiError ? caught.message : "Invalid checkout token.";
    }
  }

  return (
    <section className="section">
      <p className="eyebrow">Demo billing</p>
      <h1>Mock checkout</h1>
      <p>
        This deployment has no <code>STRIPE_SECRET_KEY</code>, so nothing is charged.
        Marking the checkout paid moves the key to the Pro quota ({quotaFor("pro").toLocaleString()} renders / month).
      </p>
      {invalid ? <p className="status error" role="status">{invalid}</p> : null}
      {summary ? (
        <form className="panel" action={confirmAction}>
          <p>Key <code>{summary.prefix}…</code> ({summary.name}) is currently <code>{summary.plan}</code>.</p>
          <input type="hidden" name="token" value={token} />
          <button type="submit">Mark as paid</button>
        </form>
      ) : (
        <p>Start from <code>POST /api/v1/billing/checkout</code> to get a tokenized link.</p>
      )}
    </section>
  );
}
