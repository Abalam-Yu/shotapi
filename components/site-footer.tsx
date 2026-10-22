import Link from "next/link";

import { config } from "@/lib/config";
import { PRO_PRICE } from "@/lib/examples";

export function SiteFooter() {
  const email = config.supportEmail();
  return (
    <footer className="footer">
      <p>
        ShotAPI turns a public URL or HTML into PNG, JPEG, or PDF. Pro is {PRO_PRICE}/mo.
        Operated by 禧柱 于 (Abalam-Yu).
      </p>
      <nav aria-label="Legal">
        <Link href="/docs">API docs</Link>
        <Link href="/docs#checkout">Checkout</Link>
        <Link href="/legal/terms">Terms</Link>
        <Link href="/legal/privacy">Privacy</Link>
        <Link href="/legal/refund">Refunds</Link>
        <a href={`mailto:${email}`}>{email}</a>
      </nav>
    </footer>
  );
}
