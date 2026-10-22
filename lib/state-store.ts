import { ApiError } from "./errors";
import type { ApiKeyRecord, RenderEvent, Store, StoreKind, UsageSnapshot } from "./types";

export type State = {
  version: 1;
  secret: string;
  keys: ApiKeyRecord[];
  usage: Record<string, UsageSnapshot>;
  events: RenderEvent[];
};

function cloneKey(record: ApiKeyRecord): ApiKeyRecord {
  return { ...record };
}

export function createStateStore(options: {
  kind: Exclude<StoreKind, "upstash">;
  persistent: boolean;
  load: () => Promise<State>;
  save: (state: State) => Promise<void>;
}): Store {
  let chain = Promise.resolve();
  const exclusive = <T>(fn: () => Promise<T>): Promise<T> => {
    const run = chain.then(fn, fn);
    chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };

  return {
    kind: options.kind,
    persistent: options.persistent,
    getSecret() {
      return exclusive(async () => (await options.load()).secret);
    },
    findKeyByHash(hash) {
      return exclusive(async () => {
        const found = (await options.load()).keys.find((key) => key.keyHash === hash);
        return found ? cloneKey(found) : null;
      });
    },
    findKeyById(id) {
      return exclusive(async () => {
        const found = (await options.load()).keys.find((key) => key.id === id);
        return found ? cloneKey(found) : null;
      });
    },
    insertKey(record) {
      return exclusive(async () => {
        const state = await options.load();
        if (state.keys.some((key) => key.keyHash === record.keyHash || key.id === record.id)) {
          throw new ApiError(409, "key_exists", "An API key with this id or hash already exists");
        }
        state.keys.push(cloneKey(record));
        await options.save(state);
      });
    },
    updateKey(record) {
      return exclusive(async () => {
        const state = await options.load();
        const index = state.keys.findIndex((key) => key.id === record.id);
        if (index < 0) throw new ApiError(404, "not_found", "API key not found");
        state.keys[index] = cloneKey(record);
        await options.save(state);
      });
    },
    getUsage(keyId, period) {
      return exclusive(async () => {
        const current = (await options.load()).usage[`${keyId}:${period}`];
        return current ? { ...current } : { count: 0, bytes: 0 };
      });
    },
    addUsage(keyId, period, bytes) {
      return exclusive(async () => {
        const state = await options.load();
        const id = `${keyId}:${period}`;
        const current = state.usage[id] ?? { count: 0, bytes: 0 };
        const next = { count: current.count + 1, bytes: current.bytes + bytes };
        state.usage[id] = next;
        await options.save(state);
        return { ...next };
      });
    },
    addEvent(event) {
      return exclusive(async () => {
        const state = await options.load();
        state.events.push({ ...event });
        if (state.events.length > 200) state.events.splice(0, state.events.length - 200);
        await options.save(state);
      });
    },
    listEvents(keyId, limit) {
      return exclusive(async () => {
        const events = (await options.load()).events.filter((event) => event.keyId === keyId);
        return events.slice(-limit).reverse().map((event) => ({ ...event }));
      });
    },
  };
}
