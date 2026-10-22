import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import { config } from "./config";
import { ApiError } from "./errors";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata.internal",
]);

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }
  const a = parts[0] ?? 0;
  const b = parts[1] ?? 0;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

export function isPrivateIp(ip: string): boolean {
  const normalized = ip.toLowerCase().split("%")[0] ?? ip;
  if (normalized.startsWith("::ffff:")) return isPrivateIp(normalized.slice(7));
  if (normalized.includes(".")) return isPrivateIpv4(normalized);
  if (normalized === "::1" || normalized === "::") return true;
  if (/^f[cd][0-9a-f]{2}:/.test(normalized)) return true;
  if (/^fe[89ab][0-9a-f]:/.test(normalized)) return true;
  return false;
}

export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ApiError(400, "invalid_url", "URL is not valid");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ApiError(400, "invalid_url", "Only http and https URLs are allowed");
  }
  if (url.username || url.password) {
    throw new ApiError(400, "invalid_url", "URLs with credentials are not allowed");
  }

  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || BLOCKED_HOSTS.has(host) || host.endsWith(".localhost") || host.endsWith(".local")) {
    throw new ApiError(400, "blocked_url", "That host is not allowed");
  }
  if (/^\d+$/.test(host)) {
    throw new ApiError(400, "blocked_url", "Numeric hostnames are not allowed");
  }
  if (config.allowPrivateUrls()) return url;

  if (isIP(host)) {
    if (isPrivateIp(host)) {
      throw new ApiError(400, "blocked_url", "Private network URLs are not allowed");
    }
    return url;
  }

  let records: { address: string }[];
  try {
    records = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new ApiError(400, "invalid_url", "Host did not resolve");
  }
  if (records.length === 0 || records.some((record) => isPrivateIp(record.address))) {
    throw new ApiError(400, "blocked_url", "Host resolves to a private network address");
  }
  return url;
}
