import type { Browser } from "playwright-core";

import { chromeLaunchArgs, findChrome } from "./chrome";
import { config, resolveDriver } from "./config";
import { ApiError } from "./errors";
import { assertPublicUrl } from "./ssrf";
import type { RenderInput } from "./types";

let browserPromise: Promise<Browser> | null = null;

function mapLaunchError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ msg: "browser_launch_failed", driver: resolveDriver(), error: message.slice(0, 500) }));
  if (resolveDriver() === "chrome") {
    return new ApiError(
      500,
      "browser_missing",
      "Could not launch Chrome. Install Google Chrome or set CHROME_PATH. On Vercel, leave RENDER_DRIVER=auto so the function uses @sparticuz/chromium.",
    );
  }
  return new ApiError(
    500,
    "browser_missing",
    "Could not launch serverless Chromium. Use a function with at least 2 GB of memory, and include @sparticuz/chromium in the deployment.",
  );
}

async function launchBrowser(): Promise<Browser> {
  const { chromium: playwright } = await import("playwright-core");
  if (resolveDriver() === "sparticuz") {
    const imported = await import("@sparticuz/chromium");
    const chromium = imported.default;
    chromium.setGraphicsMode = false;
    const packUrl = process.env.CHROMIUM_PACK_URL;
    return playwright.launch({
      args: chromium.args,
      executablePath: packUrl ? await chromium.executablePath(packUrl) : await chromium.executablePath(),
      headless: true,
    });
  }

  const executablePath = findChrome();
  if (!executablePath) {
    throw new ApiError(
      500,
      "browser_missing",
      "No local Chrome found. Set CHROME_PATH to the Chrome executable. Vercel deploys should use RENDER_DRIVER=auto.",
    );
  }
  return playwright.launch({
    executablePath,
    headless: true,
    args: chromeLaunchArgs(),
    env: { ...process.env, HOME: process.env.HOME || "/tmp" },
  });
}

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = launchBrowser()
      .then((browser) => {
        browser.on("disconnected", () => {
          browserPromise = null;
        });
        return browser;
      })
      .catch((error: unknown) => {
        browserPromise = null;
        throw mapLaunchError(error);
      });
  }
  const browser = await browserPromise;
  if (!browser.isConnected()) {
    browserPromise = null;
    return getBrowser();
  }
  return browser;
}

export async function closeBrowser(): Promise<void> {
  const pending = browserPromise;
  browserPromise = null;
  if (!pending) return;
  const browser = await pending.catch(() => null);
  await browser?.close().catch(() => undefined);
}

async function guardNavigation(rawUrl: string, cache: Map<string, Promise<void>>): Promise<void> {
  if (rawUrl.startsWith("data:") || rawUrl.startsWith("blob:") || rawUrl.startsWith("about:")) return;
  let host = rawUrl;
  try {
    host = new URL(rawUrl).host;
  } catch {
    throw new ApiError(400, "blocked_url", "Blocked a non-HTTP request from the page");
  }
  const pending = cache.get(host);
  if (pending) return pending;
  const next = assertPublicUrl(rawUrl).then(() => undefined);
  cache.set(host, next);
  return next;
}

function mapRenderError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ msg: "browser_error", error: message.slice(0, 500) }));
  if (/timeout/i.test(message)) {
    return new ApiError(504, "render_timeout", "Rendering timed out before the page was ready");
  }
  return new ApiError(502, "render_failed", "The browser could not render that page");
}

export async function renderDocument(input: RenderInput): Promise<Buffer> {
  if (input.source.kind === "url") await assertPublicUrl(input.source.url);

  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: input.viewport.width, height: input.viewport.height },
    deviceScaleFactor: input.viewport.deviceScaleFactor,
    javaScriptEnabled: true,
    ignoreHTTPSErrors: false,
    colorScheme: "light",
    userAgent: "ShotAPI/0.1",
  });

  let blockedDocument = false;
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(config.renderTimeoutMs());
    page.setDefaultNavigationTimeout(config.renderTimeoutMs());
    const cache = new Map<string, Promise<void>>();
    await page.route("**/*", async (route) => {
      const request = route.request();
      try {
        await guardNavigation(request.url(), cache);
        await route.continue();
      } catch {
        if (request.resourceType() === "document") blockedDocument = true;
        await route.abort().catch(() => undefined);
      }
    });

    const timeout = config.renderTimeoutMs();
    if (input.source.kind === "url") {
      await page.goto(input.source.url, { waitUntil: input.waitUntil, timeout });
    } else {
      await page.setContent(input.source.html, { waitUntil: input.waitUntil, timeout });
    }
    if (input.delayMs > 0) await page.waitForTimeout(input.delayMs);
    await Promise.race([
      page.evaluate(async () => {
        await document.fonts.ready;
      }),
      new Promise((resolve) => setTimeout(resolve, 2_000)),
    ]);

    if (input.format === "pdf") {
      await page.emulateMedia({ media: "print" });
      return Buffer.from(
        await page.pdf({
          format: input.pdf.format,
          landscape: input.pdf.landscape,
          printBackground: input.pdf.printBackground,
        }),
      );
    }

    await page.emulateMedia({ media: "screen" });
    if (input.format === "jpeg") {
      return Buffer.from(
        await page.screenshot({ type: "jpeg", quality: input.quality, fullPage: input.fullPage }),
      );
    }
    return Buffer.from(await page.screenshot({ type: "png", fullPage: input.fullPage }));
  } catch (error) {
    if (blockedDocument) {
      throw new ApiError(400, "blocked_url", "The page tried to reach a private or non-HTTP address");
    }
    throw mapRenderError(error);
  } finally {
    await context.close().catch(() => undefined);
  }
}
