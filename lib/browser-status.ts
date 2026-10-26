import { existsSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { findChrome } from "./chrome";
import { resolveDriver } from "./config";

const runtimeRequire = createRequire(path.join(process.cwd(), "package.json"));

export type BrowserStatus = "sparticuz" | "chrome" | "missing";

export function sparticuzAssetsReady(playwrightRoot: string, chromiumRoot: string): boolean {
  return (
    existsSync(/*turbopackIgnore: true*/ path.join(playwrightRoot, "browsers.json")) &&
    existsSync(/*turbopackIgnore: true*/ path.join(chromiumRoot, "bin", "chromium.br"))
  );
}

function installedRoots(): { playwrightRoot: string; chromiumRoot: string } | null {
  try {
    const playwrightPackage = runtimeRequire.resolve(["playwright-core", "package.json"].join("/"));
    const chromiumEntry = runtimeRequire.resolve(["@sparticuz", "chromium"].join("/"));
    return {
      playwrightRoot: path.dirname(playwrightPackage),
      chromiumRoot: path.resolve(path.dirname(chromiumEntry), ".."),
    };
  } catch {
    return null;
  }
}

function firstChild(dir: string, prefix: string): string | null {
  try {
    const name = readdirSync(/*turbopackIgnore: true*/ dir).find((entry) => entry.startsWith(prefix));
    return name ? path.join(dir, name) : null;
  } catch {
    return null;
  }
}

/**
 * Turbopack externalizes these packages to `.next/node_modules/<name>-<hash>`
 * symlinks. The Vercel trace includes that symlink and the real pnpm directory,
 * not the top-level `node_modules/<name>` link `require.resolve` needs.
 */
export function tracedExternalRoots(
  base = path.join(process.cwd(), ".next", "node_modules"),
): { playwrightRoot: string; chromiumRoot: string } | null {
  const playwrightRoot = firstChild(base, "playwright-core-");
  const chromiumRoot = firstChild(path.join(base, "@sparticuz"), "chromium-");
  if (!playwrightRoot || !chromiumRoot) return null;
  return { playwrightRoot, chromiumRoot };
}

function locateSparticuzRoots(): { playwrightRoot: string; chromiumRoot: string } | null {
  const installed = installedRoots();
  if (installed && sparticuzAssetsReady(installed.playwrightRoot, installed.chromiumRoot)) return installed;
  const traced = tracedExternalRoots();
  if (traced && sparticuzAssetsReady(traced.playwrightRoot, traced.chromiumRoot)) return traced;
  return null;
}

async function sparticuzRuntimeReady(): Promise<boolean> {
  const roots = locateSparticuzRoots();
  if (!roots) return false;
  try {
    // Static specifiers keep the packages in the serverless file trace.
    // Importing Playwright also loads browsers.json the same way a render does.
    await import("playwright-core");
    await import("@sparticuz/chromium");
    return true;
  } catch (error) {
    console.error(
      JSON.stringify({
        msg: "browser_runtime_unavailable",
        error: error instanceof Error ? error.message.slice(0, 500) : String(error),
      }),
    );
    return false;
  }
}

export async function browserStatus(): Promise<BrowserStatus> {
  if (resolveDriver() === "sparticuz") {
    return (await sparticuzRuntimeReady()) ? "sparticuz" : "missing";
  }
  try {
    return findChrome() ? "chrome" : "missing";
  } catch {
    return "missing";
  }
}
