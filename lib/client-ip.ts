function normalizeIp(value: string): string | null {
  let ip = value.trim();
  if (!ip || ip.length > 80) return null;
  if (ip.startsWith("[")) {
    const end = ip.indexOf("]");
    if (end > 1) ip = ip.slice(1, end);
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(ip)) {
    ip = ip.slice(0, ip.lastIndexOf(":"));
  }
  if (!/^[a-fA-F0-9:.]+$/.test(ip)) return null;
  return ip.toLowerCase();
}

function hop(header: string | null, which: "first" | "last"): string | null {
  if (!header) return null;
  const parts = header
    .split(",")
    .map((part) => normalizeIp(part))
    .filter((part): part is string => Boolean(part));
  if (parts.length === 0) return null;
  return which === "first" ? parts[0] : parts[parts.length - 1];
}

/**
 * Address used for Free-key mint limits.
 * On Vercel, x-real-ip is the connecting client and wins over a caller-supplied
 * x-forwarded-for. x-vercel-forwarded-for is platform-set; its left-most hop is
 * the client. For other proxies, the right-most x-forwarded-for hop is the one
 * appended closest to the app. Missing headers share the bucket "unknown".
 */
export function clientIp(request: Pick<Request, "headers">): string {
  const real = normalizeIp(request.headers.get("x-real-ip") ?? "");
  if (real) return real;
  const vercel = hop(request.headers.get("x-vercel-forwarded-for"), "first");
  if (vercel) return vercel;
  const forwarded = hop(request.headers.get("x-forwarded-for"), "last");
  if (forwarded) return forwarded;
  return "unknown";
}
