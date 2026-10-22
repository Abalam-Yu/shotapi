import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { ApiError } from "../lib/errors";
import { normalizeRenderBody } from "../lib/schema";

describe("schema", () => {
  test("defaults a png render and rejects mixed sources", () => {
    const input = normalizeRenderBody({ html: "<h1>Hi</h1>", format: "jpg" }, { maxHtmlBytes: 1000 });
    assert.equal(input.format, "jpeg");
    assert.equal(input.viewport.width, 1280);
    assert.equal(input.source.kind, "html");
    assert.throws(
      () => normalizeRenderBody({ html: "<p>a</p>", url: "https://example.com" }, { maxHtmlBytes: 1000 }),
      (error: unknown) => error instanceof ApiError && error.code === "invalid_request",
    );
    assert.throws(
      () => normalizeRenderBody({ html: "x".repeat(20) }, { maxHtmlBytes: 8 }),
      (error: unknown) => error instanceof ApiError && error.status === 413,
    );
    assert.throws(
      () => normalizeRenderBody({ url: "https://example.com" }, { maxHtmlBytes: 1000, htmlOnly: true }),
      (error: unknown) => error instanceof ApiError && error.code === "invalid_request",
    );
  });
});
