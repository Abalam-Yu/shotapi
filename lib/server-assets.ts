import { createRequire } from "node:module";
import path from "node:path";

const runtimeRequire = createRequire(path.join(process.cwd(), "package.json"));

function relativeInclude(file: string): string {
  const relative = path.relative(process.cwd(), file).split(path.sep).join("/");
  if (relative.startsWith("./") || relative.startsWith("../")) return relative;
  return `./${relative}`;
}

/** Directory Node actually loads, after pnpm's node_modules symlink. */
export function playwrightPackageRoot(): string {
  return path.dirname(runtimeRequire.resolve("playwright-core/package.json"));
}

/** Directory of @sparticuz/chromium, after pnpm's node_modules symlink. */
export function chromiumPackageRoot(): string {
  const entry = runtimeRequire.resolve("@sparticuz/chromium");
  return path.resolve(path.dirname(entry), "..");
}

/**
 * Files the render and health functions must contain.
 * Playwright does `require(path.join(packageRoot, "browsers.json"))` and
 * Sparticuz reads `bin/*.br` from `import.meta.url`. Both are computed paths,
 * so Next's file tracer does not follow them. The traced path has to be the
 * real package directory (`node_modules/.pnpm/...` under pnpm). Listing the
 * `node_modules/<pkg>` symlink does not put the file next to the module that
 * runs in the Vercel function.
 */
export function browserRuntimeIncludes(): string[] {
  const playwright = playwrightPackageRoot();
  const chromium = chromiumPackageRoot();
  return [
    relativeInclude(path.join(playwright, "browsers.json")),
    relativeInclude(path.join(playwright, "package.json")),
    `${relativeInclude(chromium)}/**/*`,
  ];
}
