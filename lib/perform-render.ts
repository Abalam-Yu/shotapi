import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { reportUsage } from "./billing";
import { config } from "./config";
import { ApiError } from "./errors";
import { corsHeaders } from "./http";
import { contentTypeFor, extensionFor } from "./schema";
import { renderDocument } from "./render";
import type { ApiKeyRecord, RenderInput, Store } from "./types";
import { currentPeriod, quotaFor } from "./usage";

function responseBody(bytes: Buffer): Blob {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy]);
}

export async function performRender(options: {
  requestId: string;
  store: Store;
  key: ApiKeyRecord;
  input: RenderInput;
}): Promise<Response> {
  const { requestId, store, key, input } = options;
  const period = currentPeriod();
  const limit = quotaFor(key.plan);
  const before = await store.getUsage(key.id, period);
  if (before.count >= limit) {
    throw new ApiError(402, "quota_exceeded", "Monthly render quota is used up", {
      used: before.count,
      limit,
      plan: key.plan,
      period,
    });
  }

  const started = Date.now();
  const bytes = await renderDocument(input);
  if (bytes.byteLength === 0) {
    throw new ApiError(502, "render_failed", "The browser returned an empty file");
  }
  if (bytes.byteLength > config.maxResponseBytes()) {
    throw new ApiError(
      413,
      "payload_too_large",
      "Rendered file exceeds the 4.5 MB platform response limit. Use a smaller viewport or turn off fullPage.",
    );
  }

  const usage = await store.addUsage(key.id, period, bytes.byteLength);
  const ms = Date.now() - started;
  await store.addEvent({
    id: randomUUID(),
    keyId: key.id,
    source: input.source.kind,
    format: input.format,
    status: 200,
    bytes: bytes.byteLength,
    ms,
    createdAt: new Date().toISOString(),
  });
  await reportUsage(key, usage.count);

  console.log(
    JSON.stringify({
      msg: "render",
      requestId,
      keyId: key.id,
      format: input.format,
      source: input.source.kind,
      bytes: bytes.byteLength,
      ms,
      used: usage.count,
      status: 200,
    }),
  );

  return new NextResponse(responseBody(bytes), {
    status: 200,
    headers: {
      ...corsHeaders(),
      "content-type": contentTypeFor(input.format),
      "content-length": String(bytes.byteLength),
      "cache-control": "no-store",
      "content-disposition": `inline; filename="shot.${extensionFor(input.format)}"`,
      "x-request-id": requestId,
      "x-shotapi-usage": String(usage.count),
      "x-shotapi-limit": String(limit),
      "x-shotapi-plan": key.plan,
      "x-shotapi-storage": store.kind,
    },
  });
}
