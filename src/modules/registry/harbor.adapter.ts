import type { RegistryConfig } from "../config/config.types.js";

import { assertOk, basicAuthHeaders, registryHost } from "./registry.helpers.js";
import type { RegistryAdapter, RegistryHealthResult, RepositoryRef, TagSnapshot } from "./registry.types.js";

type HarborRepository = {
  name?: unknown;
  update_time?: unknown;
};

type HarborArtifact = {
  digest?: unknown;
  push_time?: unknown;
  tags?: unknown;
};

type HarborTag = {
  name?: unknown;
  digest?: unknown;
  push_time?: unknown;
  pull_time?: unknown;
};

export class HarborAdapter implements RegistryAdapter {
  async listRepositories(registry: RegistryConfig): Promise<RepositoryRef[]> {
    const res = await fetch(new URL("/api/v2.0/repositories?page_size=100", registry.baseUrl).toString(), {
      headers: basicAuthHeaders(registry.username, registry.password)
    });
    assertOk(res);

    const body = (await res.json()) as unknown;
    const repositories = Array.isArray(body) ? body : [];

    return repositories.flatMap((item): RepositoryRef[] => {
      if (!isHarborRepository(item)) {
        return [];
      }

      const repo = item;
      if (typeof repo.name !== "string") {
        return [];
      }

      return [{ name: repo.name, ...(typeof repo.update_time === "string" ? { updatedAt: repo.update_time } : {}) }];
    });
  }

  async listTags(registry: RegistryConfig, repository: string): Promise<TagSnapshot[]> {
    const [project, ...nameParts] = repository.split("/");
    const name = nameParts.join("/");
    const path = `/api/v2.0/projects/${encodeURIComponent(project)}/repositories/${encodeURIComponent(name)}/artifacts?page_size=100&with_tag=true`;
    const res = await fetch(new URL(path, registry.baseUrl).toString(), {
      headers: basicAuthHeaders(registry.username, registry.password)
    });
    assertOk(res);

    const body = (await res.json()) as unknown;
    const artifacts = Array.isArray(body) ? body : [];
    const host = registryHost(registry.baseUrl);

    return artifacts.flatMap((item): TagSnapshot[] => {
      if (!isHarborArtifact(item)) {
        return [];
      }

      const artifact = item;
      const tags = Array.isArray(artifact.tags) ? artifact.tags : [];

      return tags.flatMap((tagItem): TagSnapshot[] => {
        if (!isHarborTag(tagItem)) {
          return [];
        }

        const tag = tagItem;
        if (typeof tag.name !== "string") {
          return [];
        }

        const digest = typeof tag.digest === "string" ? tag.digest : artifact.digest;
        const createdAt = typeof tag.push_time === "string" ? tag.push_time : artifact.push_time;
        const updatedAt = createdAt;

        return [
          {
            tag: tag.name,
            imageRef: `${host}/${repository}:${tag.name}`,
            ...(typeof digest === "string" ? { digest } : {}),
            ...(typeof createdAt === "string" ? { createdAt } : {}),
            ...(typeof updatedAt === "string" ? { updatedAt } : {})
          }
        ];
      });
    });
  }

  async checkHealth(registry: RegistryConfig): Promise<RegistryHealthResult> {
    const started = Date.now();
    try {
      const res = await fetch(new URL("/api/v2.0/health", registry.baseUrl).toString(), {
        headers: basicAuthHeaders(registry.username, registry.password)
      });
      const latencyMs = Date.now() - started;

      if (res.ok) {
        return { ok: true, latencyMs, message: "connected" };
      }

      return { ok: false, latencyMs, message: `http status ${res.status}` };
    } catch (err) {
      return {
        ok: false,
        latencyMs: Date.now() - started,
        message: err instanceof Error ? err.message : "request failed"
      };
    }
  }
}

function isHarborRepository(value: unknown): value is HarborRepository {
  return typeof value === "object" && value !== null;
}

function isHarborArtifact(value: unknown): value is HarborArtifact {
  return typeof value === "object" && value !== null;
}

function isHarborTag(value: unknown): value is HarborTag {
  return typeof value === "object" && value !== null;
}
