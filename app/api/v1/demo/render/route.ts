import { randomUUID } from "node:crypto";

import { authenticateSecret } from "@/lib/auth";
import { config, isDemoMode } from "@/lib/config";
import { assertDemoRateLimit } from "@/lib/demo-limit";
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
    if (!isDemoMode()) {
      throw new ApiError(404, "demo_disabled", "Demo rendering is off. Call POST /api/v1/render with an API key.");
    }
    assertDemoRateLimit();
    const store = await getStore();
    const key = await authenticateSecret(config.demoKey(), store);
    const input = normalizeRenderBody(await readJson(request, 80_000), {
      maxHtmlBytes: 20_000,
      htmlOnly: true,
    });
    return await performRender({ requestId, store, key, input });
  } catch (error) {
    console.error(
      JSON.stringify({
        msg: "demo_render_error",
        requestId,
        code: error instanceof ApiError ? error.code : "internal",
        status: error instanceof ApiError ? error.status : 500,
        ms: Date.now() - started,
      }),
    );
    return errorResponse(error, requestId);
  }
}
