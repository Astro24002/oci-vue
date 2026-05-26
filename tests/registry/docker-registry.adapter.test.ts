import { afterEach, describe, expect, it, vi } from "vitest";

import { DockerRegistryAdapter } from "../../src/modules/registry/docker-registry.adapter.js";
import type { RegistryConfig } from "../../src/modules/config/config.types.js";

const registry: RegistryConfig = {
  id: "dockerhub",
  name: "Docker Hub Mirror",
  type: "docker-registry",
  baseUrl: "https://registry.example.com",
  enabled: true
};

describe("DockerRegistryAdapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists repositories from the Docker catalog", async () => {
    const fetch = vi.fn().mockResolvedValue(
      Response.json({ repositories: ["library/alpine", "app"] })
    );
    vi.stubGlobal("fetch", fetch);

    const adapter = new DockerRegistryAdapter();

    await expect(adapter.listRepositories(registry)).resolves.toEqual([
      { name: "library/alpine" },
      { name: "app" }
    ]);
    expect(fetch).toHaveBeenCalledWith(
      "https://registry.example.com/v2/_catalog",
      { headers: {} }
    );
  });

  it("adds Basic Authorization when listing repositories with both credentials", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ repositories: [] }));
    vi.stubGlobal("fetch", fetch);

    const adapter = new DockerRegistryAdapter();

    await adapter.listRepositories({ ...registry, username: "u", password: "p" });

    expect(fetch).toHaveBeenCalledWith(
      "https://registry.example.com/v2/_catalog",
      { headers: { Authorization: "Basic dTpw" } }
    );
  });

  it("returns no repositories when the Docker catalog body is null", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json(null));
    vi.stubGlobal("fetch", fetch);

    const adapter = new DockerRegistryAdapter();

    await expect(adapter.listRepositories(registry)).resolves.toEqual([]);
  });

  it("lists tags and builds image refs for nested repositories", async () => {
    const fetch = vi.fn().mockResolvedValue(
      Response.json({ name: "team/app", tags: ["1.0", "latest"] })
    );
    vi.stubGlobal("fetch", fetch);

    const adapter = new DockerRegistryAdapter();

    await expect(adapter.listTags(registry, "team/app")).resolves.toEqual([
      { tag: "1.0", imageRef: "registry.example.com/team/app:1.0" },
      { tag: "latest", imageRef: "registry.example.com/team/app:latest" }
    ]);
    expect(fetch).toHaveBeenCalledWith(
      "https://registry.example.com/v2/team/app/tags/list",
      { headers: {} }
    );
  });

  it("enriches Docker tags with manifest digest and config created time", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ name: "team/app", tags: ["1.0"] }))
      .mockResolvedValueOnce(Response.json(
        {
          config: { digest: "sha256:config", size: 123 },
          layers: [
            { mediaType: "application/vnd.oci.image.layer.v1.tar+gzip", size: 456, digest: "sha256:layer1" },
            { mediaType: "application/vnd.oci.image.layer.v1.tar+gzip", size: 789, digest: "sha256:layer2" }
          ]
        },
        { headers: { "Docker-Content-Digest": "sha256:manifest" } }
      ))
      .mockResolvedValueOnce(Response.json({
        created: "2026-01-02T03:04:05Z",
        history: [
          { created_by: "/bin/sh -c #(nop) ARG BASE", empty_layer: true },
          { created_by: "/bin/sh -c apt-get update", created: "2026-01-02T03:01:00Z" },
          { created_by: "/bin/sh -c pip install -r requirements.txt", created: "2026-01-02T03:02:00Z", comment: "install deps" }
        ]
      }));
    vi.stubGlobal("fetch", fetch);

    const adapter = new DockerRegistryAdapter();

    await expect(adapter.listTags(registry, "team/app")).resolves.toEqual([
      {
        tag: "1.0",
        imageRef: "registry.example.com/team/app:1.0",
        digest: "sha256:manifest",
        createdAt: "2026-01-02T03:04:05Z",
        updatedAt: "2026-01-02T03:04:05Z",
        sizeBytes: 1368,
        layers: [
          {
            mediaType: "application/vnd.oci.image.layer.v1.tar+gzip",
            sizeBytes: 456,
            digest: "sha256:layer1",
            command: "/bin/sh -c apt-get update",
            createdAt: "2026-01-02T03:01:00Z"
          },
          {
            mediaType: "application/vnd.oci.image.layer.v1.tar+gzip",
            sizeBytes: 789,
            digest: "sha256:layer2",
            command: "/bin/sh -c pip install -r requirements.txt",
            createdAt: "2026-01-02T03:02:00Z",
            comment: "install deps"
          }
        ]
      }
    ]);
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "https://registry.example.com/v2/team/app/manifests/1.0",
      {
        headers: {
          Accept: "application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json"
        }
      }
    );
    expect(fetch).toHaveBeenNthCalledWith(
      3,
      "https://registry.example.com/v2/team/app/blobs/sha256:config",
      { headers: {} }
    );
  });

  it("returns no tags when the Docker tags body is null", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json(null));
    vi.stubGlobal("fetch", fetch);

    const adapter = new DockerRegistryAdapter();

    await expect(adapter.listTags(registry, "team/app")).resolves.toEqual([]);
  });

  it("throws when listing tags receives a non-ok response", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("nope", { status: 404 }));
    vi.stubGlobal("fetch", fetch);

    const adapter = new DockerRegistryAdapter();

    await expect(adapter.listTags(registry, "missing")).rejects.toThrow(
      "registry request failed with status 404"
    );
  });

  it("checks health without throwing on failed responses", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));
    vi.stubGlobal("fetch", fetch);

    const adapter = new DockerRegistryAdapter();

    await expect(adapter.checkHealth(registry)).resolves.toMatchObject({
      ok: false,
      message: "http status 503"
    });
  });
});
