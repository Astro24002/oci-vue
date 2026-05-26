import { afterEach, describe, expect, it, vi } from "vitest";

import { AcrAdapter } from "../../src/modules/registry/acr.adapter.js";
import { DockerRegistryAdapter } from "../../src/modules/registry/docker-registry.adapter.js";
import { getRegistryAdapter } from "../../src/modules/registry/registry.adapters.js";
import { HarborAdapter } from "../../src/modules/registry/harbor.adapter.js";
import type { RegistryConfig } from "../../src/modules/config/config.types.js";

const harborRegistry: RegistryConfig = {
  id: "harbor",
  name: "Harbor",
  type: "harbor",
  baseUrl: "https://harbor.example.com",
  enabled: true
};

const acrRegistry: RegistryConfig = {
  id: "acr",
  name: "ACR",
  type: "acr",
  baseUrl: "https://example.azurecr.io",
  enabled: true
};

describe("vendor registry adapters", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("selects an adapter for each registry type", () => {
    expect(getRegistryAdapter("docker-registry")).toBeInstanceOf(DockerRegistryAdapter);
    expect(getRegistryAdapter("harbor")).toBeInstanceOf(HarborAdapter);
    expect(getRegistryAdapter("acr")).toBeInstanceOf(AcrAdapter);
  });

  it("lists Harbor repositories and only sends Basic Authorization when both credentials exist", async () => {
    const repositories = [
      null,
      { name: "library/alpine", update_time: "2026-01-02T03:04:05Z" },
      { name: "team/app" },
      { name: 123 }
    ];
    const fetch = vi.fn().mockResolvedValueOnce(Response.json(repositories)).mockResolvedValueOnce(Response.json(repositories));
    vi.stubGlobal("fetch", fetch);

    const adapter = new HarborAdapter();

    await expect(adapter.listRepositories({ ...harborRegistry, username: "robot" })).resolves.toEqual([
      { name: "library/alpine", updatedAt: "2026-01-02T03:04:05Z" },
      { name: "team/app" }
    ]);
    expect(fetch).toHaveBeenCalledWith(
      "https://harbor.example.com/api/v2.0/repositories?page_size=100",
      { headers: {} }
    );

    await adapter.listRepositories({ ...harborRegistry, username: "robot", password: "secret" });
    expect(fetch).toHaveBeenLastCalledWith(
      "https://harbor.example.com/api/v2.0/repositories?page_size=100",
      { headers: { Authorization: "Basic cm9ib3Q6c2VjcmV0" } }
    );
  });

  it("lists Harbor artifact tags with digest and timestamps", async () => {
    const fetch = vi.fn().mockResolvedValue(
      Response.json([
        null,
        {
          digest: "sha256:artifact",
          push_time: "2026-01-03T00:00:00Z",
          tags: [
            null,
            {
              name: "1.0",
              digest: "sha256:tag",
              push_time: "2026-01-04T00:00:00Z",
              pull_time: "2026-01-05T00:00:00Z"
            },
            { name: "latest" }
          ]
        },
        { digest: "sha256:untagged", tags: [] }
      ])
    );
    vi.stubGlobal("fetch", fetch);

    const adapter = new HarborAdapter();

    await expect(adapter.listTags(harborRegistry, "project/repo/name")).resolves.toEqual([
      {
        tag: "1.0",
        imageRef: "harbor.example.com/project/repo/name:1.0",
        digest: "sha256:tag",
        createdAt: "2026-01-04T00:00:00Z",
        updatedAt: "2026-01-04T00:00:00Z"
      },
      {
        tag: "latest",
        imageRef: "harbor.example.com/project/repo/name:latest",
        digest: "sha256:artifact",
        createdAt: "2026-01-03T00:00:00Z",
        updatedAt: "2026-01-03T00:00:00Z"
      }
    ]);
    expect(fetch).toHaveBeenCalledWith(
      "https://harbor.example.com/api/v2.0/projects/project/repositories/repo%2Fname/artifacts?page_size=100&with_tag=true",
      { headers: {} }
    );
  });

  it("checks Harbor health without throwing", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("down", { status: 503 }));
    vi.stubGlobal("fetch", fetch);

    const adapter = new HarborAdapter();

    await expect(adapter.checkHealth(harborRegistry)).resolves.toMatchObject({
      ok: false,
      message: "http status 503"
    });
  });

  it("lists ACR repositories", async () => {
    const fetch = vi.fn().mockResolvedValue(
      Response.json({ repositories: ["team/app", "library/alpine", 7] })
    );
    vi.stubGlobal("fetch", fetch);

    const adapter = new AcrAdapter();

    await expect(adapter.listRepositories(acrRegistry)).resolves.toEqual([
      { name: "team/app" },
      { name: "library/alpine" }
    ]);
    expect(fetch).toHaveBeenCalledWith("https://example.azurecr.io/acr/v1/_catalog", {
      headers: {}
    });
  });

  it("returns no ACR repositories when the catalog body is null", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json(null));
    vi.stubGlobal("fetch", fetch);

    const adapter = new AcrAdapter();

    await expect(adapter.listRepositories(acrRegistry)).resolves.toEqual([]);
  });

  it("lists ACR string and object tags", async () => {
    const fetch = vi.fn().mockResolvedValue(
      Response.json({
        tags: [
          "latest",
          {
            name: "1.0",
            digest: "sha256:tag",
            createdTime: "2026-02-01T00:00:00Z",
            lastUpdateTime: "2026-02-02T00:00:00Z"
          },
          null,
          { name: 42 }
        ]
      })
    );
    vi.stubGlobal("fetch", fetch);

    const adapter = new AcrAdapter();

    await expect(adapter.listTags(acrRegistry, "team/app")).resolves.toEqual([
      { tag: "latest", imageRef: "example.azurecr.io/team/app:latest" },
      {
        tag: "1.0",
        imageRef: "example.azurecr.io/team/app:1.0",
        digest: "sha256:tag",
        createdAt: "2026-02-01T00:00:00Z",
        updatedAt: "2026-02-02T00:00:00Z"
      }
    ]);
    expect(fetch).toHaveBeenCalledWith("https://example.azurecr.io/acr/v1/team/app/_tags", {
      headers: {}
    });
  });

  it("returns no ACR tags when the tags body is null", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json(null));
    vi.stubGlobal("fetch", fetch);

    const adapter = new AcrAdapter();

    await expect(adapter.listTags(acrRegistry, "team/app")).resolves.toEqual([]);
  });

  it("treats ACR health redirects as connected", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 302 }));
    vi.stubGlobal("fetch", fetch);

    const adapter = new AcrAdapter();

    await expect(adapter.checkHealth(acrRegistry)).resolves.toMatchObject({
      ok: true,
      message: "connected"
    });
    expect(fetch).toHaveBeenCalledWith("https://example.azurecr.io/v2/", {
      headers: {}
    });
  });
});
