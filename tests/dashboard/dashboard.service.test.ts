import { describe, expect, it } from "vitest";

import { DashboardService } from "../../src/modules/dashboard/dashboard.service.js";
import type { RegistrySnapshot } from "../../src/modules/registry/registry.types.js";

const snapshots: RegistrySnapshot[] = [
  {
    registryId: "dockerhub",
    registryName: "Docker Hub",
    registryType: "docker-registry",
    baseUrl: "https://registry-1.docker.io",
    status: "healthy",
    lastRefreshAt: "2026-05-20T01:00:00.000Z",
    lastSuccessAt: "2026-05-20T01:00:00.000Z",
    consecutiveFailures: 0,
    repositories: [
      {
        registryId: "dockerhub",
        name: "library/nginx",
        imagePrefix: "registry-1.docker.io/library/nginx",
        tagCount: 2,
        tags: [
          { tag: "latest", imageRef: "registry-1.docker.io/library/nginx:latest" },
          { tag: "1.27", imageRef: "registry-1.docker.io/library/nginx:1.27" }
        ]
      },
      {
        registryId: "dockerhub",
        name: "library/redis",
        imagePrefix: "registry-1.docker.io/library/redis",
        tagCount: 1,
        tags: [{ tag: "7", imageRef: "registry-1.docker.io/library/redis:7" }]
      }
    ]
  },
  {
    registryId: "harbor",
    registryName: "Harbor",
    registryType: "harbor",
    baseUrl: "https://harbor.example.com",
    status: "degraded",
    lastRefreshAt: "2026-05-20T01:05:00.000Z",
    lastSuccessAt: "2026-05-20T00:55:00.000Z",
    lastErrorAt: "2026-05-20T01:05:00.000Z",
    lastErrorMessage: "timeout",
    consecutiveFailures: 2,
    repositories: [
      {
        registryId: "harbor",
        name: "team/api",
        imagePrefix: "harbor.example.com/team/api",
        tagCount: 3,
        tags: [
          { tag: "main", imageRef: "harbor.example.com/team/api:main" },
          { tag: "sha-1", imageRef: "harbor.example.com/team/api:sha-1" },
          { tag: "sha-2", imageRef: "harbor.example.com/team/api:sha-2" }
        ]
      }
    ]
  },
  {
    registryId: "acr",
    registryName: "ACR",
    registryType: "acr",
    baseUrl: "https://example.azurecr.io",
    status: "error",
    consecutiveFailures: 1,
    repositories: []
  },
  {
    registryId: "unknown",
    registryName: "Unknown",
    registryType: "docker-registry",
    baseUrl: "https://unknown.example.com",
    status: "unknown",
    consecutiveFailures: 0,
    repositories: []
  }
];

function buildService() {
  return new DashboardService({
    listSnapshots: () => snapshots,
    getSnapshot: (registryId) => snapshots.find((snapshot) => snapshot.registryId === registryId)
  });
}

describe("DashboardService", () => {
  it("summarizes registry, repository, and tag counts", () => {
    const dashboard = buildService().getDashboardSnapshot();

    expect(dashboard.generatedAt).toEqual(expect.any(String));
    expect(dashboard.summary).toEqual({
      registries: 4,
      healthy: 1,
      degraded: 1,
      error: 1,
      unknown: 1,
      repositories: 3,
      tags: 6
    });
    expect(dashboard.registries).toEqual(snapshots);
  });

  it("returns registry statuses without repository and tag payloads", () => {
    const statuses = buildService().getRegistryStatuses();

    expect(statuses).toHaveLength(4);
    expect(statuses[0]).toEqual({
      registryId: "dockerhub",
      registryName: "Docker Hub",
      registryType: "docker-registry",
      baseUrl: "https://registry-1.docker.io",
      status: "healthy",
      lastRefreshAt: "2026-05-20T01:00:00.000Z",
      lastSuccessAt: "2026-05-20T01:00:00.000Z",
      lastErrorAt: undefined,
      lastErrorMessage: undefined,
      consecutiveFailures: 0,
      repositoryCount: 2,
      tagCount: 3
    });
    expect(statuses[0]).not.toHaveProperty("repositories");
  });

  it("looks up tags for a repository", () => {
    expect(buildService().getTags("harbor", "team/api")).toEqual({
      registryId: "harbor",
      repository: "team/api",
      tagCount: 3,
      tags: [
        { tag: "main", imageRef: "harbor.example.com/team/api:main" },
        { tag: "sha-1", imageRef: "harbor.example.com/team/api:sha-1" },
        { tag: "sha-2", imageRef: "harbor.example.com/team/api:sha-2" }
      ]
    });
    expect(buildService().getTags("harbor", "missing")).toBeUndefined();
  });
});
