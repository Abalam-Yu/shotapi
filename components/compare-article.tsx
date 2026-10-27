import Link from "next/link";

import { CodeSample } from "@/components/code-sample";
import {
  type CompareRow,
  type Competitor,
  type ShotContext,
  PRICE_CHECKED,
  competitors,
  publishedShot,
  resolveCell,
} from "@/lib/compare";
import { curlUrlPng } from "@/lib/examples";

function CompareTable({
  caption,
  name,
  rows,
  ctx,
}: {
  caption: string;
  name: string;
  rows: CompareRow[];
  ctx: ShotContext;
}) {
  return (
    <div className="panel table-wrap">
      <table className="compare-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Topic</th>
            <th scope="col">ShotAPI</th>
            <th scope="col">{name}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th scope="row">{row.feature}</th>
              <td>{resolveCell(row.shot, ctx)}</td>
              <td>{row.other}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CompareCta() {
  return (
    <section className="section" aria-labelledby="compare-try">
      <h2 id="compare-try">Try a public URL</h2>
      <p>
        Mint a Free key on the homepage. No account and no card. The full secret is in that response
        only. The docs describe auth, the render body, and Pro checkout for the same key.
      </p>
      <div className="actions">
        <Link className="button" href="/#free-key">
          Mint a free key
        </Link>
        <Link className="button secondary" href="/docs">
          API docs
        </Link>
      </div>
      <CodeSample label="URL to PNG" code={curlUrlPng} />
    </section>
  );
}

function SourceList({ sources }: { sources: Competitor["sources"] }) {
  return (
    <ul>
      {sources.map((source) => (
        <li key={source.href}>
          {source.href.startsWith("/") ? (
            <Link href={source.href}>{source.label}</Link>
          ) : (
            <a href={source.href}>{source.label}</a>
          )}
        </li>
      ))}
    </ul>
  );
}

export function CompareArticle({ item, ctx }: { item: Competitor; ctx: ShotContext }) {
  const quotaDrift =
    ctx.freeQuota !== publishedShot.freeQuota || ctx.proQuota !== publishedShot.proQuota;
  const others = competitors.filter((candidate) => candidate.slug !== item.slug);

  return (
    <article className="section compare">
      <p className="crumbs">
        <Link href="/">ShotAPI</Link>
        <span aria-hidden="true"> / </span>
        <Link href="/compare">Compare</Link>
        <span aria-hidden="true"> / </span>
        {item.name}
      </p>
      <p className="eyebrow">Comparison</p>
      <h1>{item.title}</h1>
      <p className="lede">{item.lede}</p>
      <p className="fineprint">
        List prices checked {PRICE_CHECKED}. Confirm them on the linked pages before you pay.
        ShotAPI is operated by 禧柱 于 (Abalam-Yu), an individual seller in mainland China. The site
        and the API are in English. Pro is charged by Creem, the merchant of record. The terms use
        the law of the People&apos;s Republic of China, without limiting mandatory consumer
        protections where you live.
      </p>
      {quotaDrift ? (
        <p>
          This deployment&apos;s quotas are {ctx.freeQuota} free and {ctx.proQuota} Pro per UTC
          month. The ShotAPI column uses those numbers. Competitor prices are their public list
          prices.
        </p>
      ) : null}

      <div className="pick-grid">
        <article className="card">
          <p className="step">SHOTAPI</p>
          <h2>Pick ShotAPI when</h2>
          <ul className="feature-list">
            {item.pickShot.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </article>
        <article className="card">
          <p className="step">{item.name.toUpperCase()}</p>
          <h2>Pick {item.name} when</h2>
          <ul className="feature-list">
            {item.pickThem.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </article>
      </div>

      <h2>Prices</h2>
      <p>
        ShotAPI Pro is {ctx.proPrice}/month for {ctx.proQuota} successful renders, then the API
        returns 402. {item.volumeNote}
      </p>
      <CompareTable caption="Published monthly prices" name={item.name} rows={item.priceRows} ctx={ctx} />

      <h2>Features</h2>
      <CompareTable
        caption="What the public docs actually list"
        name={item.name}
        rows={item.featureRows}
        ctx={ctx}
      />

      <CompareCta />

      <h2>Sources</h2>
      <p>
        {item.name} is a trademark of its owner. Figures below are what we read on {PRICE_CHECKED},
        not a quote from their sales team.
      </p>
      <SourceList sources={item.sources} />
      <p>
        Other notes:{" "}
        {others.map((other, index) => (
          <span key={other.slug}>
            {index > 0 ? ", " : null}
            <Link href={`/compare/${other.slug}`}>{other.name}</Link>
          </span>
        ))}
        . All three are on the <Link href="/compare">comparison index</Link>.
      </p>
    </article>
  );
}
