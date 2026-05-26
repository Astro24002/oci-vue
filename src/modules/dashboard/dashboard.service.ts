import type { RegistryType } from "../config/config.types.js";
import type { RegistrySnapshot, RegistryStatus, TagSnapshot } from "../registry/registry.types.js";

type CacheLike = {
  listSnapshots(): RegistrySnapshot[];
  getSnapshot(registryId: string): RegistrySnapshot | undefined;
};

type DashboardSummary = Record<RegistryStatus, number> & {
  registries: number;
  repositories: number;
  tags: number;
};

type RegistryStatusMetadata = {
  registryId: string;
  registryName: string;
  registryType: RegistryType;
  baseUrl: string;
  status: RegistryStatus;
  lastRefreshAt?: string;
  lastSuccessAt?: string;
  lastErrorAt?: string;
  lastErrorMessage?: string;
  consecutiveFailures: number;
  repositoryCount: number;
  tagCount: number;
};

type RepositoryTags = {
  registryId: string;
  repository: string;
  tagCount: number;
  tags: TagSnapshot[];
};

export class DashboardService {
  constructor(private readonly cache: CacheLike) {}

  getDashboardSnapshot() {
    const registries = this.cache.listSnapshots();
    return {
      generatedAt: new Date().toISOString(),
      summary: this.summarize(registries),
      registries
    };
  }

  getRegistryStatuses(): RegistryStatusMetadata[] {
    return this.cache.listSnapshots().map((snapshot) => ({
      registryId: snapshot.registryId,
      registryName: snapshot.registryName,
      registryType: snapshot.registryType,
      baseUrl: snapshot.baseUrl,
      status: snapshot.status,
      lastRefreshAt: snapshot.lastRefreshAt,
      lastSuccessAt: snapshot.lastSuccessAt,
      lastErrorAt: snapshot.lastErrorAt,
      lastErrorMessage: snapshot.lastErrorMessage,
      consecutiveFailures: snapshot.consecutiveFailures,
      repositoryCount: snapshot.repositories.length,
      tagCount: snapshot.repositories.reduce((sum, repository) => sum + repository.tags.length, 0)
    }));
  }

  getTags(registryId: string, repository: string): RepositoryTags | undefined {
    const snapshot = this.cache.getSnapshot(registryId);
    const repo = snapshot?.repositories.find((candidate) => candidate.name === repository);
    if (!repo) {
      return undefined;
    }

    return {
      registryId,
      repository,
      tagCount: repo.tags.length,
      tags: repo.tags
    };
  }

  private summarize(registries: RegistrySnapshot[]): DashboardSummary {
    const summary: DashboardSummary = {
      registries: registries.length,
      healthy: 0,
      degraded: 0,
      error: 0,
      unknown: 0,
      repositories: 0,
      tags: 0
    };

    for (const registry of registries) {
      summary[registry.status] += 1;
      summary.repositories += registry.repositories.length;
      summary.tags += registry.repositories.reduce((sum, repository) => sum + repository.tags.length, 0);
    }

    return summary;
  }
}
