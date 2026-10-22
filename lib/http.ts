import { config } from "./config";
import { ApiError } from "./errors";

export function corsHeaders(): Record<string, string> {
  return {
    "access-control-allow-origin": config.corsOrigin(),
    "access-control-allow-headers": "authorization, content-type, x-api-key",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-max-age": "86400",
  };
}

export function requestOrigin(request: Request): string {
  return config.appUrl() ?? new URL(request.url).origin;
}

export function json(body: unknown, status = 200, extra?: Record<string, string>): Response {
  return Response.json(body, {
    status,
    headers: {
      ...corsHeaders(),
      "cache-control": "no-store",
      ...extra,
    },
  });
}

export function empty(status = 204): Response {
  return new Response(null, { status, headers: corsHeaders() });
}

export function errorResponse(error: unknown, requestId: string): Response {
  if (error instanceof ApiError) {
    return json(
      {
        error: {
          code: error.code,
          message: error.message,
          requestId,
          ...error.details,
        },
      },
      error.status,
      {
        "x-request-id": requestId,
        ...(error.status === 429 ? { "retry-after": "30" } : {}),
      },
    );
  }

  console.error(
    JSON.stringify({
      msg: "unhandled",
      requestId,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  return json(
    { error: { code: "internal", message: "Unexpected server error", requestId } },
    500,
    { "x-request-id": requestId },
  );
}

export async function readJson(request: Request, maxBodyBytes: number): Promise<unknown> {
  const type = request.headers.get("content-type");
  if (type && !type.includes("application/json") && !type.includes("text/json")) {
    throw new ApiError(400, "invalid_request", "Content-Type must be application/json");
  }
  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > maxBodyBytes) {
    throw new ApiError(413, "payload_too_large", "Request body is too large");
  }
  const text = await request.text();
  if (text.length > maxBodyBytes) {
    throw new ApiError(413, "payload_too_large", "Request body is too large");
  }
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError(400, "invalid_request", "Body must be JSON");
  }
}
