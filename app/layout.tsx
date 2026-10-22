import type { Metadata, Viewport } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { PRO_PRICE } from "@/lib/examples";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ShotAPI",
    template: "%s · ShotAPI",
  },
  description: `URL or HTML in, PNG, JPEG, or PDF out. ShotAPI Pro is ${PRO_PRICE}/mo.`,
};

export const viewport: Viewport = {
  themeColor: "#f3efe7",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#content">Skip to content</a>
        <SiteHeader />
        <main id="content">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
