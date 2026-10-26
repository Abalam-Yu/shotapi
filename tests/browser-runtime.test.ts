import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, test } from "node:test";

import { browserStatus, sparticuzAssetsReady, tracedExternalRoots } from "../lib/browser-status";
import { browserRuntimeIncludes, chromiumPackageRoot, playwrightPackageRoot } from "../lib/server-assets";

const envKeys = ["RENDER_DRIVER", "CHROME_PATH", "VERCEL"] as const;
const previous = new Map<string, string | undefined>();

function saveEnv(): void {
  for (const key of envKeys) previous.set(key, process.env[key]);
}

function restoreEnv(): void {
  if (previous.size === 0) return;
  for (const key of envKeys) {
    const value = previous.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  previous.clear();
}

describe("browser runtime packaging", () => {
  afterEach(() => {
    restoreEnv();
  });

  test("traces browsers.json from the directory Playwright actually loads", () => {
    const root = playwrightPackageRoot();
    const browsers = path.join(root, "browsers.json");
    const includes = browserRuntimeIncludes();
    const listed = includes.find((item) => item.endsWith("/browsers.json"));
    assert.ok(listed);
    assert.equal(path.resolve(listed), browsers);
    assert.equal(path.basename(root), "playwright-core");
    assert.match(root, /\.pnpm[/\\]playwright-core@/);
  });

  test("traces the sparticuz bin directory next to the package entry", () => {
    const root = chromiumPackageRoot();
    assert.equal(path.basename(root), "chromium");
    const glob = browserRuntimeIncludes().find((item) => item.endsWith("/**/*"));
    assert.ok(glob);
    assert.equal(path.resolve(glob.slice(0, -"/**/*".length)), root);
    assert.equal(existsSync(path.join(root, "bin", "chromium.br")), true);
  });

  test("sparticuz is ready only when browsers.json and chromium.br both exist", () => {
    const root = mkdtempSync(path.join(tmpdir(), "shotapi-assets-"));
    const playwright = path.join(root, "playwright-core");
    const chromium = path.join(root, "chromium", "bin");
    mkdirSync(playwright, { recursive: true });
    mkdirSync(chromium, { recursive: true });
    try {
      assert.equal(sparticuzAssetsReady(playwright, path.join(root, "chromium")), false);
      writeFileSync(path.join(playwright, "browsers.json"), "{}");
      assert.equal(sparticuzAssetsReady(playwright, path.join(root, "chromium")), false);
      writeFileSync(path.join(chromium, "chromium.br"), "pack");
      assert.equal(sparticuzAssetsReady(playwright, path.join(root, "chromium")), true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("traced externals point at the sparticuz pack without the pnpm symlink", () => {
    const root = mkdtempSync(path.join(tmpdir(), "shotapi-externals-"));
    const playwright = path.join(root, "playwright-real");
    const chromium = path.join(root, "chromium-real");
    const base = path.join(root, "node_modules");
    mkdirSync(playwright, { recursive: true });
    mkdirSync(path.join(chromium, "bin"), { recursive: true });
    mkdirSync(path.join(base, "@sparticuz"), { recursive: true });
    writeFileSync(path.join(playwright, "browsers.json"), "{}");
    writeFileSync(path.join(chromium, "bin", "chromium.br"), "pack");
    symlinkSync(playwright, path.join(base, "playwright-core-test"));
    symlinkSync(chromium, path.join(base, "@sparticuz", "chromium-test"));
    try {
      const found = tracedExternalRoots(base);
      assert.ok(found);
      assert.equal(found.playwrightRoot, path.join(base, "playwright-core-test"));
      assert.equal(found.chromiumRoot, path.join(base, "@sparticuz", "chromium-test"));
      assert.equal(sparticuzAssetsReady(found.playwrightRoot, found.chromiumRoot), true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("browser status matches what the installed runtime can load", async () => {
    saveEnv();
    process.env.RENDER_DRIVER = "sparticuz";
    delete process.env.VERCEL;
    assert.equal(await browserStatus(), "sparticuz");

    process.env.RENDER_DRIVER = "chrome";
    process.env.CHROME_PATH = path.join(tmpdir(), "shotapi-missing-chrome");
    assert.equal(await browserStatus(), "missing");
  });

  test("health ok is false when the selected browser cannot start", async () => {
    saveEnv();
    process.env.RENDER_DRIVER = "chrome";
    process.env.CHROME_PATH = path.join(tmpdir(), "shotapi-missing-chrome");
    const { GET } = await import("../app/api/v1/health/route");
    const missing = await GET();
    const missingBody = await missing.json();
    assert.equal(missing.status, 200);
    assert.equal(missingBody.driver, "chrome");
    assert.equal(missingBody.browser, "missing");
    assert.equal(missingBody.ok, false);

    process.env.RENDER_DRIVER = "sparticuz";
    delete process.env.CHROME_PATH;
    const ready = await GET();
    const readyBody = await ready.json();
    assert.equal(ready.status, 200);
    assert.equal(readyBody.driver, "sparticuz");
    assert.equal(readyBody.browser, "sparticuz");
    assert.equal(readyBody.ok, true);
  });
});
