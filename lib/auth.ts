import { ApiError } from "./errors";
import { isDemoMode } from "./config";
import { hashKey, readPresentedKey } from "./keys";
import type { ApiKeyRecord, Store } from "./types";

export async function authenticateSecret(secret: string, store: Store): Promise<ApiKeyRecord> {
  const record = await store.findKeyByHash(hashKey(secret));
  if (!record) {
    throw new ApiError(401, "unauthorized", "Missing or invalid API key");
  }
  if (record.seededDemo && !isDemoMode()) {
    throw new ApiError(
      401,
      "unauthorized",
      "Demo API key is disabled. Mint a Free key with POST /api/v1/keys/free, or create one with SHOTAPI_ADMIN_TOKEN.",
    );
  }
  return record;
}

export async function authenticateRequest(request: Request, store: Store): Promise<ApiKeyRecord> {
  const secret = readPresentedKey(request);
  if (!secret) {
    throw new ApiError(401, "unauthorized", "Missing API key. Send Authorization: Bearer <key> or X-API-Key.");
  }
  return authenticateSecret(secret, store);
}
