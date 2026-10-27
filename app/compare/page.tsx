import type { Metadata } from "next";
import Link from "next/link";

import { CompareCta } from "@/components/compare-article";
import { compareIndex, competitors, PRICE_CHECKED, publishedShot } from "@/lib/compare";
import { config } from "@/lib/config";
import { PRO_PRICE } from "@/lib/examples";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: compareIndex.title,
  description: compareIndex.description,
  alternates: { canonical: "/compare" },
};

const highlights: { slug?: string; name: string; free: string; entry: string; tenK: string; gap: string }[] = [
  {
    name: "ShotAPI",
    free: `${publishedShot.freeQuota} / month, no account`,
    entry: `${PRO_PRICE} for ${publishedShot.proQuota} renders`,
    tenK: `${PRO_PRICE}, then HTTP 402`,
    gap: "No WebP, cache, ad block, S3, video, or SLA",
  },
  {
    slug: "screenshotone",
    name: "ScreenshotOne",
    free: "100 / month, with an account",
    entry: "$17 for 2,000",
    tenK: "$79 Growth, or Basic plus extras",
    gap: "Cache, blocking, WebP, webhooks, video on Growth",
  },
  {
    slug: "apiflash",
    name: "ApiFlash",
    free: "100 / month, via sign-up",
    entry: "$7 for 1,000",
    tenK: "$35 Medium",
    gap: "WebP, blocking, cache, S3. No PDF in their format list",
  },
  {
    slug: "urlbox",
    name: "Urlbox",
    free: "No free quota. 7-day trial",
    entry: "$19 Lo-Fi for about 2,000",
    tenK: "$67 Hi-Fi or $99 Ultra",
    gap: "Stealth, video, SLA on Business. Lo-Fi limits third-party sites",
  },
];

export default function CompareIndexPage() {
  const freeQuota = config.quotaDemo().toLocaleString("en-US");
  const proQuota = config.quotaPro().toLocaleString("en-US");
  const liveDiffers = freeQuota !== publishedShot.freeQuota || proQuota !== publishedShot.proQuota;

  return (
    <article className="section compare">
      <p className="eyebrow">Comparison</p>
      <h1>Screenshot API prices, in public</h1>
      <p className="lede">{compareIndex.lede}</p>
      <p className="fineprint">
        Checked {PRICE_CHECKED}. ShotAPI is operated by 禧柱 于 (Abalam-Yu), an individual seller in
        mainland China, with English docs and Creem checkout.{" "}
        <Link href="/legal/terms">Terms</Link> use the law of the People&apos;s Republic of China.
      </p>
      {liveDiffers ? (
        <p>
          This deployment&apos;s live quotas are {freeQuota} free and {proQuota} Pro. The ShotAPI
          row below is the published default. Each comparison page uses the live quota.
        </p>
      ) : null}

      <div className="panel table-wrap">
        <table className="compare-table">
          <caption>List-price snapshot</caption>
          <thead>
            <tr>
              <th scope="col">API</th>
              <th scope="col">Free</th>
              <th scope="col">Paid entry</th>
              <th scope="col">About 10,000 renders</th>
              <th scope="col">The part ShotAPI does not match</th>
            </tr>
          </thead>
          <tbody>
            {highlights.map((row) => (
              <tr key={row.name}>
                <th scope="row">
                  {row.slug ? <Link href={`/compare/${row.slug}`}>{row.name}</Link> : row.name}
                </th>
                <td>{row.free}</td>
                <td>{row.entry}</td>
                <td>{row.tenK}</td>
                <td>{row.gap}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid-3">
        {competitors.map((item) => (
          <article className="card" key={item.slug}>
            <p className="step">VS</p>
            <h3>
              <Link href={`/compare/${item.slug}`}>{item.name}</Link>
            </h3>
            <p>{item.lede}</p>
          </article>
        ))}
      </div>

      <CompareCta />
    </article>
  );
}
