import Link from "next/link";

import { PRO_PRICE } from "@/lib/examples";

export function SiteFooter() {
  return (
    <footer className="footer">
      <p>
        ShotAPI turns a public URL or HTML into PNG, JPEG, or PDF. Pro is {PRO_PRICE}/mo.{" "}
        <Link href="/docs">API docs</Link>
        {" · "}
        <Link href="/docs#checkout">Checkout</Link>
      </p>
    </footer>
  );
}
