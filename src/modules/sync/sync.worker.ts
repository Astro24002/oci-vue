import type { RegistryConfig } from "../config/config.types.js";

import type { SyncState } from "./sync.state.js";

export type WorkerFn = (registry: RegistryConfig) => Promise<void>;

export function buildWorker(state: SyncState, runRegistrySync: WorkerFn): WorkerFn {
  return async (registry) => {
    const started = Date.now();
    try {
      await runRegistrySync(registry);
      state.set({
        registryId: registry.id,
        success: true,
        lastSyncAt: new Date().toISOString(),
        durationMs: Date.now() - started
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      state.set({
        registryId: registry.id,
        success: false,
        lastSyncAt: new Date().toISOString(),
        durationMs: Date.now() - started,
        errorMessage: message
      });
    }
  };
}
