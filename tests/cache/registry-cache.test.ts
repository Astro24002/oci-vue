import { describe, expect, it } from "vitest";

import { RegistryCache } from "../../src/modules/cache/registry-cache.js";
import type { RegistryConfig } from "../../src/modules/config/config.types.js";
import type { RepositorySnapshot } from "../../src/modules/registry/registry.types.js";

const registry: RegistryConfig = {
  id: "reg-1",
  name: "Primary Registry",
  type: "docker-registry",
  baseUrl: "https://registry.example.com",
  username: "user",
  password: "secret",
  enabled: true
};

const repositories: RepositorySnapshot[] = [
  {
    registryId: registry.id,
    name: "team/app",
    imagePrefix: "registry.example.com/team/app",
    tagCount: 1,
    tags: [{ tag: "latest", imageRef: "registry.example.com/team/app:latest" }]
  }
];

describe("RegistryCache", () => {
  it("creates an unknown snapshot for a new registry", () => {
    const cache = new RegistryCache();

    const snapshot = cache.ensureRegistry(registry);

    expect(snapshot).toMatchObject({
      registryId: registry.id,
      registryName: registry.name,
      registryType: registry.type,
      baseUrl: registry.baseUrl,
      status: "unknown",
      consecutiveFailures: 0,
      repositories: []
    });
  });

  it("stores a healthy snapshot on success", () => {
    const cache = new RegistryCache();

    const snapshot = cache.markSuccess(registry, repositories);

    expect(snapshot).toMatchObject({
      registryId: registry.id,
      registryName: registry.name,
      registryType: registry.type,
      baseUrl: registry.baseUrl,
      status: "healthy",
      consecutiveFailures: 0,
      repositories
    });
    expect(snapshot.lastRefreshAt).toBeDefined();
    expect(snapshot.lastSuccessAt).toBeDefined();
    expect(snapshot.lastErrorAt).toBeUndefined();
    expect(snapshot.lastErrorMessage).toBeUndefined();
  });

  it("preserves repositories and degrades after a later failure", () => {
    const cache = new RegistryCache();

    cache.markSuccess(registry, repositories);
    const snapshot = cache.markFailure(registry, new Error("boom"));

    expect(snapshot).toMatchObject({
      registryId: registry.id,
      registryName: registry.name,
      registryType: registry.type,
      baseUrl: registry.baseUrl,
      status: "degraded",
      consecutiveFailures: 1,
      repositories,
      lastErrorMessage: "boom"
    });
    expect(snapshot.lastRefreshAt).toBeDefined();
    expect(snapshot.lastErrorAt).toBeDefined();
    expect(snapshot.lastSuccessAt).toBeDefined();
  });

  it("stores an error snapshot on the first failure", () => {
    const cache = new RegistryCache();

    const snapshot = cache.markFailure(registry, new Error("fail"));

    expect(snapshot).toMatchObject({
      registryId: registry.id,
      registryName: registry.name,
      registryType: registry.type,
      baseUrl: registry.baseUrl,
      status: "error",
      consecutiveFailures: 1,
      repositories: [],
      lastErrorMessage: "fail"
    });
    expect(snapshot.lastRefreshAt).toBeDefined();
    expect(snapshot.lastSuccessAt).toBeUndefined();
    expect(snapshot.lastErrorAt).toBeDefined();
  });

  it("returns copies from getSnapshot and listSnapshots", () => {
    const cache = new RegistryCache();

    cache.markSuccess(registry, repositories);

    const fromGet = cache.getSnapshot(registry.id);
    const fromList = cache.listSnapshots();

    if (!fromGet) {
      throw new Error("expected snapshot");
    }

    fromGet.status = "error";
    fromGet.repositories[0].name = "mutated";
    fromList[0].status = "degraded";
    fromList[0].repositories[0].tags[0].tag = "changed";

    expect(cache.getSnapshot(registry.id)).toMatchObject({
      status: "healthy",
      repositories: [
        {
          name: "team/app",
          tags: [{ tag: "latest" }]
        }
      ]
    });
  });

  it("removes snapshots missing from the active registry ids", () => {
    const cache = new RegistryCache();
    const otherRegistry: RegistryConfig = {
      ...registry,
      id: "reg-2",
      name: "Secondary Registry"
    };

    cache.ensureRegistry(registry);
    cache.ensureRegistry(otherRegistry);

    cache.removeMissing([otherRegistry.id]);

    expect(cache.getSnapshot(registry.id)).toBeUndefined();
    expect(cache.getSnapshot(otherRegistry.id)).toBeDefined();
  });
});
