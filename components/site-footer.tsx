import Link from "next/link";

import { config } from "@/lib/config";

export function SiteFooter() {
  const email = config.supportEmail();
  return (
    <footer className="footer">
      <p>ShotAPI renders a public URL or a snippet of HTML. Operated by 禧柱 于 (Abalam-Yu).</p>
      <nav aria-label="Legal">
        <Link href="/legal/terms">Terms</Link>
        <Link href="/legal/privacy">Privacy</Link>
        <Link href="/legal/refund">Refunds</Link>
        <a href={`mailto:${email}`}>{email}</a>
      </nav>
    </footer>
  );
}
