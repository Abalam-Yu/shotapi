import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

import {
  PRICE_CHECKED,
  competitors,
  getCompetitor,
  publishedShot,
  resolveCell,
} from "../lib/compare";
import { PRO_PRICE } from "../lib/examples";

const absentOnShot = ["webp", "ads", "cache", "video", "sla", "cookies"];

describe("compare pages", () => {
  test("covers ScreenshotOne, ApiFlash, and Urlbox with sourced prices", () => {
    assert.deepEqual(
      competitors.map((item) => item.slug),
      ["screenshotone", "apiflash", "urlbox"],
    );
    assert.match(PRICE_CHECKED, /27 October 2026/);
    assert.equal(publishedShot.proPrice, PRO_PRICE);
    assert.equal(PRO_PRICE, "$19");

    for (const item of competitors) {
      assert.equal(getCompetitor(item.slug)?.name, item.name);
      assert.ok(item.pickShot.length >= 3);
      assert.ok(item.pickThem.length >= 3);
      assert.ok(item.sources.some((source) => source.href.startsWith("https://")));
      assert.ok(item.sources.some((source) => source.href === "/legal/terms"));
      const joined = [...item.priceRows, ...item.featureRows]
        .map((row) => `${row.feature} ${resolveCell(row.shot, publishedShot)} ${row.other}`)
        .join("\n");
      assert.match(joined, /\$19/);
      assert.doesNotMatch(joined, /best screenshot API/i);
      for (const id of absentOnShot) {
        const row = item.featureRows.find((candidate) => candidate.id === id);
        assert.ok(row, `${item.slug} missing ${id}`);
        assert.match(resolveCell(row.shot, publishedShot), /^(No|Not)\b/);
      }
    }
  });

  test("locks the public prices we read", () => {
    const screenshotone = getCompetitor("screenshotone");
    const apiflash = getCompetitor("apiflash");
    const urlbox = getCompetitor("urlbox");
    assert.ok(screenshotone && apiflash && urlbox);

    const text = (item: NonNullable<typeof screenshotone>) =>
      [...item.priceRows, ...item.featureRows].map((row) => row.other).join("\n");

    const s = text(screenshotone);
    assert.match(s, /\$17\/month for 2,000/);
    assert.match(s, /\$79\/month for 10,000/);
    assert.match(s, /\$259\/month for 50,000/);
    assert.match(s, /\$0\.009/);
    assert.match(s, /exclude VAT/);
    assert.match(s, /within 30 days/);

    const a = text(apiflash);
    assert.match(a, /\$7\/month for 1,000/);
    assert.match(a, /\$35\/month for 10,000/);
    assert.match(a, /\$180\/month for 100,000/);
    assert.match(a, /strictly non-refundable/);
    assert.match(a, /jpeg, png, or webp only/);
    assert.match(a, /20 requests per second/);

    const u = text(urlbox);
    assert.match(u, /\$19\/month/);
    assert.match(u, /\$67/);
    assert.match(u, /\$99/);
    assert.match(u, /\$495 base/);
    assert.match(u, /No ongoing free API quota/);
    assert.match(u, /99\.95%/);
    assert.match(u, /Urlbox Ltd/);
  });

  test("nav, footer, docs, and homepage link the comparisons", () => {
    const header = readFileSync(new URL("../components/site-header.tsx", import.meta.url), "utf8");
    const footer = readFileSync(new URL("../components/site-footer.tsx", import.meta.url), "utf8");
    const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
    const docs = readFileSync(new URL("../app/docs/page.tsx", import.meta.url), "utf8");
    assert.match(header, /href="\/compare"/);
    for (const slug of ["screenshotone", "apiflash", "urlbox"]) {
      assert.match(footer, new RegExp(`/compare/${slug}`));
    }
    assert.match(home, /\/compare\/screenshotone/);
    const render = docs.slice(docs.indexOf('id="render"'), docs.indexOf('id="usage"'));
    assert.match(render, /curlUrlPng/);
    assert.match(render, /URL to PNG/);
  });
});
