import { randomBytes } from "node:crypto";

import { createStateStore, type State } from "./state-store";
import type { Store } from "./types";

export function createMemoryStore(): Store {
  let state: State = {
    version: 1,
    secret: randomBytes(32).toString("hex"),
    keys: [],
    usage: {},
    events: [],
  };
  return createStateStore({
    kind: "memory",
    persistent: false,
    load: async () => state,
    save: async (next) => {
      state = next;
    },
  });
}
