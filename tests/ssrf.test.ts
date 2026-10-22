import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { ApiError } from "../lib/errors";
import { assertPublicUrl, isPrivateIp } from "../lib/ssrf";

describe("ssrf", { concurrency: 1 }, () => {
  test("classifies private addresses", () => {
    assert.equal(isPrivateIp("127.0.0.1"), true);
    assert.equal(isPrivateIp("10.1.2.3"), true);
    assert.equal(isPrivateIp("192.168.0.10"), true);
    assert.equal(isPrivateIp("169.254.169.254"), true);
    assert.equal(isPrivateIp("172.16.0.1"), true);
    assert.equal(isPrivateIp("::1"), true);
    assert.equal(isPrivateIp("8.8.8.8"), false);
  });

  test("blocks private and non-http URLs", async () => {
    const previous = process.env.ALLOW_PRIVATE_URLS;
    process.env.ALLOW_PRIVATE_URLS = "0";
    try {
      const blocked = [
        "http://127.0.0.1/",
        "http://169.254.169.254/latest/meta-data",
        "http://10.0.0.5/",
        "http://localhost/",
        "http://[::1]/",
        "http://2130706433/",
        "file:///etc/passwd",
        "https://user:pass@example.com/",
      ];
      for (const url of blocked) {
        await assert.rejects(assertPublicUrl(url), (error: unknown) => error instanceof ApiError);
      }
      const url = await assertPublicUrl("https://1.1.1.1/");
      assert.equal(url.hostname, "1.1.1.1");
      const example = await assertPublicUrl("https://example.com/docs");
      assert.equal(example.hostname, "example.com");
    } finally {
      if (previous === undefined) delete process.env.ALLOW_PRIVATE_URLS;
      else process.env.ALLOW_PRIVATE_URLS = previous;
    }
  });

  test("allow-private flag keeps protocol checks", async () => {
    const previous = process.env.ALLOW_PRIVATE_URLS;
    process.env.ALLOW_PRIVATE_URLS = "1";
    try {
      const url = await assertPublicUrl("http://127.0.0.1:3000/health");
      assert.equal(url.hostname, "127.0.0.1");
      await assert.rejects(assertPublicUrl("file:///tmp/x"), (error: unknown) => error instanceof ApiError);
    } finally {
      if (previous === undefined) delete process.env.ALLOW_PRIVATE_URLS;
      else process.env.ALLOW_PRIVATE_URLS = previous;
    }
  });
});
