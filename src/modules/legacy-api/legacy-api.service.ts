import type { SyncScheduler } from "../sync/sync.scheduler.js";
import type { SyncState } from "../sync/sync.state.js";

type ConfigRegistry = {
  id: string;
  name: string;
  baseUrl: string;
  enabled: boolean;
};

export class LegacyApiService {
  constructor(
    private readonly listRegistries: () => ConfigRegistry[],
    private readonly syncState: SyncState,
    private readonly scheduler: SyncScheduler
  ) {}

  getRegistries() {
    const statuses = new Map(this.syncState.list().map((s) => [s.registryId, s]));
    return this.listRegistries().map((r) => ({
      id: r.id,
      name: r.name,
      base_url: r.baseUrl,
      enabled: r.enabled,
      status: statuses.get(r.id) ?? null
    }));
  }

  getArtifacts(input: { q?: string; page: number; pageSize: number }) {
    const q = (input.q ?? "").trim().toLowerCase();
    const items = this.listRegistries()
      .filter((r) => (q ? r.name.toLowerCase().includes(q) : true))
      .map((r) => ({
        registry_id: r.id,
        repository: r.name,
        updated_at: new Date(0).toISOString()
      }));
    const start = Math.max(0, (input.page - 1) * input.pageSize);
    return { total: items.length, items: items.slice(start, start + input.pageSize) };
  }

  getTags(_registryId: string, _repository: string) {
    return {
      tags: [],
      tag_count: 0,
      repo_last_synced_at: new Date(0).toISOString(),
      fetched_at: new Date().toISOString(),
      from_cache: true,
      stale: false
    };
  }

  search(_q: string) {
    return [] as string[];
  }

  async refreshRegistry(registryId: string) {
    return this.scheduler.triggerNow(registryId);
  }

  registryExists(registryId: string) {
    return this.listRegistries().some((r) => r.id === registryId);
  }

  getHealthz() {
    return {
      ok: true,
      statuses: Object.fromEntries(this.syncState.list().map((s) => [s.registryId, s]))
    };
  }
}
