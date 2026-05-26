import type { RegistryConfig } from "../config/config.types.js";
import type { RegistrySnapshot, RepositorySnapshot, RegistryStatus } from "../registry/registry.types.js";

function cloneSnapshot(snapshot: RegistrySnapshot): RegistrySnapshot {
  return {
    ...snapshot,
    repositories: snapshot.repositories.map((repository) => ({
      ...repository,
      tags: repository.tags.map((tag) => ({ ...tag }))
    }))
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

function createBaseSnapshot(registry: RegistryConfig, status: RegistryStatus): RegistrySnapshot {
  return {
    registryId: registry.id,
    registryName: registry.name,
    registryType: registry.type,
    baseUrl: registry.baseUrl,
    status,
    consecutiveFailures: 0,
    repositories: []
  };
}

export class RegistryCache {
  private readonly byRegistry = new Map<string, RegistrySnapshot>();

  ensureRegistry(registry: RegistryConfig): RegistrySnapshot {
    const existing = this.byRegistry.get(registry.id);
    if (existing) {
      const refreshed = cloneSnapshot(existing);
      refreshed.registryName = registry.name;
      refreshed.registryType = registry.type;
      refreshed.baseUrl = registry.baseUrl;
      this.byRegistry.set(registry.id, refreshed);
      return cloneSnapshot(refreshed);
    }

    const snapshot = createBaseSnapshot(registry, "unknown");
    this.byRegistry.set(registry.id, snapshot);
    return cloneSnapshot(snapshot);
  }

  markSuccess(registry: RegistryConfig, repositories: RepositorySnapshot[]): RegistrySnapshot {
    const snapshot: RegistrySnapshot = {
      registryId: registry.id,
      registryName: registry.name,
      registryType: registry.type,
      baseUrl: registry.baseUrl,
      status: "healthy",
      lastRefreshAt: nowIso(),
      lastSuccessAt: nowIso(),
      consecutiveFailures: 0,
      repositories: repositories.map((repository) => ({
        ...repository,
        tags: repository.tags.map((tag) => ({ ...tag }))
      }))
    };

    this.byRegistry.set(registry.id, snapshot);
    return cloneSnapshot(snapshot);
  }

  markFailure(registry: RegistryConfig, err: Error): RegistrySnapshot {
    const existing = this.byRegistry.get(registry.id);
    const hasSuccessfulData = Boolean(existing?.lastSuccessAt);
    const consecutiveFailures = (existing?.consecutiveFailures ?? 0) + 1;
    const lastRefreshAt = nowIso();
    const lastErrorAt = nowIso();

    const snapshot: RegistrySnapshot = {
      registryId: registry.id,
      registryName: registry.name,
      registryType: registry.type,
      baseUrl: registry.baseUrl,
      status: hasSuccessfulData ? "degraded" : "error",
      lastRefreshAt,
      lastSuccessAt: existing?.lastSuccessAt,
      lastErrorAt,
      lastErrorMessage: err.message,
      consecutiveFailures,
      repositories: hasSuccessfulData && existing ? cloneSnapshot(existing).repositories : []
    };

    this.byRegistry.set(registry.id, snapshot);
    return cloneSnapshot(snapshot);
  }

  getSnapshot(registryId: string): RegistrySnapshot | undefined {
    const snapshot = this.byRegistry.get(registryId);
    return snapshot ? cloneSnapshot(snapshot) : undefined;
  }

  listSnapshots(): RegistrySnapshot[] {
    return [...this.byRegistry.values()].map((snapshot) => cloneSnapshot(snapshot));
  }

  removeMissing(activeIds: string[]): void {
    const active = new Set(activeIds);
    for (const registryId of this.byRegistry.keys()) {
      if (!active.has(registryId)) {
        this.byRegistry.delete(registryId);
      }
    }
  }
}
