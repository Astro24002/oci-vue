import { describe, expect, it, vi } from "vitest";

import { buildCacheWorker } from "../../src/modules/cache/cache.worker.js";
import type { RegistryConfig } from "../../src/modules/config/config.types.js";
import type { RegistryAdapter } from "../../src/modules/registry/registry.types.js";

const registry: RegistryConfig = {
  id: "reg-1",
  name: "Registry",
  type: "docker-registry",
  baseUrl: "https://registry.example.com",
  enabled: true
};

describe("buildCacheWorker", () => {
  it("builds repository snapshots with repositories and tags", async () => {
    const cache = {
      ensureRegistry: vi.fn(),
      markSuccess: vi.fn(),
      markFailure: vi.fn()
    };
    const adapter: Pick<RegistryAdapter, "listRepositories" | "listTags"> = {
      listRepositories: vi.fn().mockResolvedValue([
        { name: "team/app", updatedAt: "2026-01-01T00:00:00.000Z" },
        { name: "library/db" }
      ]),
      listTags: vi
        .fn()
        .mockResolvedValueOnce([
          {
            tag: "latest",
            imageRef: "registry.example.com/team/app:latest",
            updatedAt: "2026-01-02T00:00:00.000Z"
          }
        ])
        .mockResolvedValueOnce([])
    };
    const adapterFactory = vi.fn().mockReturnValue(adapter);
    const worker = buildCacheWorker(cache, adapterFactory);

    await worker(registry);

    expect(cache.ensureRegistry).toHaveBeenCalledWith(registry);
    expect(adapterFactory).toHaveBeenCalledWith("docker-registry");
    expect(adapter.listRepositories).toHaveBeenCalledWith(registry);
    expect(adapter.listTags).toHaveBeenCalledWith(registry, "team/app");
    expect(adapter.listTags).toHaveBeenCalledWith(registry, "library/db");
    expect(cache.markSuccess).toHaveBeenCalledWith(registry, [
      {
        registryId: "reg-1",
        name: "team/app",
        imagePrefix: "registry.example.com/team/app",
        updatedAt: "2026-01-01T00:00:00.000Z",
        tagCount: 1,
        tags: [
          {
            tag: "latest",
            imageRef: "registry.example.com/team/app:latest",
            updatedAt: "2026-01-02T00:00:00.000Z"
          }
        ]
      },
      {
        registryId: "reg-1",
        name: "library/db",
        imagePrefix: "registry.example.com/library/db",
        updatedAt: undefined,
        tagCount: 0,
        tags: []
      }
    ]);
    expect(cache.markFailure).not.toHaveBeenCalled();
  });

  it("marks cache failure and does not throw when refresh fails", async () => {
    const cache = {
      ensureRegistry: vi.fn(),
      markSuccess: vi.fn(),
      markFailure: vi.fn()
    };
    const err = new Error("registry unavailable");
    const adapter: Pick<RegistryAdapter, "listRepositories" | "listTags"> = {
      listRepositories: vi.fn().mockRejectedValue(err),
      listTags: vi.fn()
    };
    const worker = buildCacheWorker(cache, vi.fn().mockReturnValue(adapter));

    await expect(worker(registry)).resolves.toBeUndefined();

    expect(cache.ensureRegistry).toHaveBeenCalledWith(registry);
    expect(cache.markSuccess).not.toHaveBeenCalled();
    expect(cache.markFailure).toHaveBeenCalledWith(registry, err);
  });

  it("skips repositories whose tags cannot be listed without failing the registry", async () => {
    const cache = {
      ensureRegistry: vi.fn(),
      markSuccess: vi.fn(),
      markFailure: vi.fn()
    };
    const adapter: Pick<RegistryAdapter, "listRepositories" | "listTags"> = {
      listRepositories: vi.fn().mockResolvedValue([
        { name: "good/app" },
        { name: "missing/app" }
      ]),
      listTags: vi
        .fn()
        .mockResolvedValueOnce([{ tag: "latest", imageRef: "registry.example.com/good/app:latest" }])
        .mockRejectedValueOnce(new Error("registry request failed with status 404"))
    };
    const worker = buildCacheWorker(cache, vi.fn().mockReturnValue(adapter));

    await worker(registry);

    expect(cache.markSuccess).toHaveBeenCalledWith(registry, [
      {
        registryId: "reg-1",
        name: "good/app",
        imagePrefix: "registry.example.com/good/app",
        updatedAt: undefined,
        tagCount: 1,
        tags: [{ tag: "latest", imageRef: "registry.example.com/good/app:latest" }]
      }
    ]);
    expect(cache.markFailure).not.toHaveBeenCalled();
  });
});
