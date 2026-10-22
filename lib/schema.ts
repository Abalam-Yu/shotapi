import { z } from "zod";

import { ApiError } from "./errors";
import type { RenderFormat, RenderInput } from "./types";

const bodySchema = z.object({
  url: z.string().trim().min(1).max(2048).optional(),
  html: z.string().min(1).optional(),
  format: z.enum(["png", "jpeg", "jpg", "pdf"]).optional(),
  fullPage: z.boolean().optional(),
  quality: z.number().int().min(1).max(100).optional(),
  waitUntil: z.enum(["load", "domcontentloaded", "networkidle"]).optional(),
  delayMs: z.number().int().min(0).max(5_000).optional(),
  viewport: z
    .object({
      width: z.number().int().min(320).max(1920).optional(),
      height: z.number().int().min(240).max(4_000).optional(),
      deviceScaleFactor: z.number().min(1).max(2).optional(),
    })
    .optional(),
  pdf: z
    .object({
      format: z.enum(["A4", "Letter", "Legal"]).optional(),
      landscape: z.boolean().optional(),
      printBackground: z.boolean().optional(),
    })
    .optional(),
});

function fromZod(error: z.ZodError): ApiError {
  return new ApiError(400, "invalid_request", error.issues[0]?.message ?? "Invalid request", {
    issues: error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  });
}

export function normalizeRenderBody(
  body: unknown,
  options: { maxHtmlBytes: number; htmlOnly?: boolean },
): RenderInput {
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) throw fromZod(parsed.error);

  const hasUrl = Boolean(parsed.data.url);
  const hasHtml = Boolean(parsed.data.html);
  if (hasUrl === hasHtml) {
    throw new ApiError(400, "invalid_request", "Send exactly one of url or html");
  }
  if (options.htmlOnly && hasUrl) {
    throw new ApiError(400, "invalid_request", "This endpoint accepts html, not url");
  }
  if (parsed.data.html && parsed.data.html.length > options.maxHtmlBytes) {
    throw new ApiError(413, "payload_too_large", `HTML exceeds ${options.maxHtmlBytes} bytes`);
  }

  const requested = parsed.data.format;
  const format: RenderFormat = requested === "jpg" || requested === "jpeg" ? "jpeg" : requested === "pdf" ? "pdf" : "png";

  return {
    source: parsed.data.url
      ? { kind: "url", url: parsed.data.url }
      : { kind: "html", html: parsed.data.html ?? "" },
    format,
    fullPage: parsed.data.fullPage ?? false,
    quality: parsed.data.quality ?? 80,
    waitUntil: parsed.data.waitUntil ?? "load",
    delayMs: parsed.data.delayMs ?? 0,
    viewport: {
      width: parsed.data.viewport?.width ?? 1280,
      height: parsed.data.viewport?.height ?? 800,
      deviceScaleFactor: parsed.data.viewport?.deviceScaleFactor ?? 1,
    },
    pdf: {
      format: parsed.data.pdf?.format ?? "A4",
      landscape: parsed.data.pdf?.landscape ?? false,
      printBackground: parsed.data.pdf?.printBackground ?? true,
    },
  };
}

export function contentTypeFor(format: RenderFormat): string {
  if (format === "pdf") return "application/pdf";
  if (format === "jpeg") return "image/jpeg";
  return "image/png";
}

export function extensionFor(format: RenderFormat): string {
  if (format === "pdf") return "pdf";
  if (format === "jpeg") return "jpg";
  return "png";
}
