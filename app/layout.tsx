import type { Metadata, Viewport } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ShotAPI",
    template: "%s · ShotAPI",
  },
  description: "Render a public URL or HTML to PNG, JPEG, or PDF with an API key.",
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
