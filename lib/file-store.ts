import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { ApiError } from "./errors";
import { createStateStore, type State } from "./state-store";
import type { Store } from "./types";

/**
 * Local single-process store. getStore() skips this driver on Vercel unless
 * SHOTAPI_ALLOW_FILE_STORE=1. Serverless disks do not keep this file.
 * Set Upstash Redis when usage must survive a new instance.
 */
function freshState(): State {
  return {
    version: 1,
    secret: randomBytes(32).toString("hex"),
    keys: [],
    usage: {},
    events: [],
  };
}

function isState(value: unknown): value is State {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<State>;
  return state.version === 1 && typeof state.secret === "string" && Array.isArray(state.keys);
}

async function readState(file: string): Promise<State | null> {
  try {
    const parsed: unknown = JSON.parse(await readFile(file, "utf8"));
    if (!isState(parsed)) {
      throw new ApiError(500, "storage_corrupt", "The local usage store could not be read");
    }
    parsed.usage ??= {};
    parsed.events ??= [];
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "storage_corrupt", "The local usage store could not be read");
  }
}

async function writeState(file: string, state: State): Promise<void> {
  const directory = path.dirname(file);
  await mkdir(directory, { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(state, null, 2));
  await rename(temporary, file);
}

export async function createFileStore(dir: string): Promise<Store> {
  const file = path.join(dir, "store.json");
  let state = (await readState(file)) ?? freshState();
  await writeState(file, state);
  return createStateStore({
    kind: "file",
    persistent: true,
    load: async () => state,
    save: async (next) => {
      state = next;
      await writeState(file, state);
    },
  });
}
