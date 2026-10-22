import { randomUUID } from "node:crypto";

import { authenticateRequest } from "@/lib/auth";
import { config } from "@/lib/config";
import { ApiError } from "@/lib/errors";
import { empty, errorResponse, readJson } from "@/lib/http";
import { performRender } from "@/lib/perform-render";
import { normalizeRenderBody } from "@/lib/schema";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function OPTIONS() {
  return empty();
}

export async function POST(request: Request) {
  const requestId = randomUUID();
  const started = Date.now();
  try {
    const store = await getStore();
    const key = await authenticateRequest(request, store);
    const input = normalizeRenderBody(await readJson(request, config.maxBodyBytes()), {
      maxHtmlBytes: config.maxHtmlBytes(),
    });
    return await performRender({ requestId, store, key, input });
  } catch (error) {
    console.error(
      JSON.stringify({
        msg: "render_error",
        requestId,
        code: error instanceof ApiError ? error.code : "internal",
        status: error instanceof ApiError ? error.status : 500,
        ms: Date.now() - started,
      }),
    );
    return errorResponse(error, requestId);
  }
}
