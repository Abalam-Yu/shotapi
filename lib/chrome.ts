import { existsSync } from "node:fs";

import { ApiError } from "./errors";

const CANDIDATES = [
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
];

export function findChrome(): string | null {
  const fromEnv = process.env.CHROME_PATH;
  if (fromEnv) {
    if (!existsSync(/*turbopackIgnore: true*/ fromEnv)) {
      throw new ApiError(500, "browser_missing", `CHROME_PATH does not exist: ${fromEnv}`);
    }
    return fromEnv;
  }
  for (const candidate of CANDIDATES) {
    if (existsSync(/*turbopackIgnore: true*/ candidate)) return candidate;
  }
  return null;
}

export function chromeLaunchArgs(): string[] {
  const args = [
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--hide-scrollbars",
  ];
  if (process.env.SHOTAPI_CHROME_NO_SANDBOX !== "0") {
    args.push("--no-sandbox", "--disable-setuid-sandbox");
  }
  return args;
}
