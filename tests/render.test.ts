import assert from "node:assert/strict";
import { after, describe, test } from "node:test";

import { ApiError } from "../lib/errors";
import { closeBrowser, renderDocument } from "../lib/render";
import type { RenderFormat, RenderInput } from "../lib/types";

function input(format: RenderFormat, html: string): RenderInput {
  return {
    source: { kind: "html", html },
    format,
    fullPage: false,
    quality: 70,
    waitUntil: "domcontentloaded",
    delayMs: 0,
    viewport: { width: 800, height: 420, deviceScaleFactor: 1 },
    pdf: { format: "A4", landscape: false, printBackground: true },
  };
}

describe("render", { concurrency: 1 }, () => {
  after(async () => {
    await closeBrowser();
  });

  test("renders html to png, jpeg, and pdf", { timeout: 90_000 }, async () => {
    const html = "<!doctype html><html><body style='font-family:serif'><h1>ShotAPI</h1></body></html>";
    const png = await renderDocument(input("png", html));
    assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.ok(png.byteLength > 500);

    const jpeg = await renderDocument(input("jpeg", html));
    assert.equal(jpeg[0], 0xff);
    assert.equal(jpeg[1], 0xd8);

    const pdf = await renderDocument(input("pdf", html));
    assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
  });

  test("still renders when a subresource points at a private host", { timeout: 60_000 }, async () => {
    const previous = process.env.ALLOW_PRIVATE_URLS;
    process.env.ALLOW_PRIVATE_URLS = "0";
    try {
      const html = "<!doctype html><html><body><h1>Visible</h1><img src='http://127.0.0.1/secret'></body></html>";
      const png = await renderDocument(input("png", html));
      assert.equal(png.subarray(0, 4).toString("hex"), "89504e47");
    } finally {
      if (previous === undefined) delete process.env.ALLOW_PRIVATE_URLS;
      else process.env.ALLOW_PRIVATE_URLS = previous;
    }
  });

  test("refuses a private navigation target before launching work", async () => {
    const previous = process.env.ALLOW_PRIVATE_URLS;
    process.env.ALLOW_PRIVATE_URLS = "0";
    try {
      const request = input("png", "<p>unused</p>");
      request.source = { kind: "url", url: "http://127.0.0.1/" };
      await assert.rejects(renderDocument(request), (error: unknown) => error instanceof ApiError && error.code === "blocked_url");
    } finally {
      if (previous === undefined) delete process.env.ALLOW_PRIVATE_URLS;
      else process.env.ALLOW_PRIVATE_URLS = previous;
    }
  });

  test("renders a public URL", { timeout: 60_000 }, async () => {
    const png = await renderDocument({
      ...input("png", ""),
      source: { kind: "url", url: "https://example.com" },
    });
    assert.equal(png.subarray(0, 4).toString("hex"), "89504e47");
    assert.ok(png.byteLength > 1000);
  });
});
