import { ApiError } from "./errors";

const hits: number[] = [];

export function assertDemoRateLimit(): void {
  if (process.env.SHOTAPI_DEMO_RATELIMIT === "0") return;
  const now = Date.now();
  const windowMs = 60_000;
  while (hits.length > 0 && hits[0] !== undefined && hits[0] < now - windowMs) hits.shift();
  if (hits.length >= 30) {
    throw new ApiError(429, "rate_limited", "Demo preview is limited to 30 renders per minute on this instance");
  }
  hits.push(now);
}
