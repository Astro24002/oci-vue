import type { RegistryConfig, RegistryType } from "../config/config.types.js";
import type { RegistryAdapter, RepositorySnapshot } from "../registry/registry.types.js";

export type CacheWorker = (registry: RegistryConfig) => Promise<void>;

type CacheWriter = {
  ensureRegistry(registry: RegistryConfig): unknown;
  markSuccess(registry: RegistryConfig, repositories: RepositorySnapshot[]): unknown;
  markFailure(registry: RegistryConfig, err: Error): unknown;
};

type AdapterFactory = (type: RegistryType) => Pick<RegistryAdapter, "listRepositories" | "listTags">;

function registryHost(baseUrl: string): string {
  return new URL(baseUrl).host;
}

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

export function buildCacheWorker(cache: CacheWriter, adapterFactory: AdapterFactory): CacheWorker {
  return async (registry) => {
    try {
      cache.ensureRegistry(registry);
      const adapter = adapterFactory(registry.type);
      const repositories = await adapter.listRepositories(registry);
      const host = registryHost(registry.baseUrl);
      const snapshots: RepositorySnapshot[] = [];

      for (const repository of repositories) {
        let tags;
        try {
          tags = await adapter.listTags(registry, repository.name);
        } catch {
          continue;
        }
        snapshots.push({
          registryId: registry.id,
          name: repository.name,
          imagePrefix: `${host}/${repository.name}`,
          updatedAt: repository.updatedAt,
          tagCount: tags.length,
          tags
        });
      }

      cache.markSuccess(registry, snapshots);
    } catch (err) {
      cache.markFailure(registry, toError(err));
    }
  };
}
