import type { RegistryConfig } from "../config/config.types.js";

import { assertOk, basicAuthHeaders, registryHost } from "./registry.helpers.js";
import type { RegistryAdapter, RegistryHealthResult, RepositoryRef, TagSnapshot } from "./registry.types.js";

type CatalogResponse = {
  repositories?: unknown;
};

type AcrTagsResponse = {
  tags?: unknown;
};

type AcrTag = {
  name?: unknown;
  digest?: unknown;
  createdTime?: unknown;
  lastUpdateTime?: unknown;
};

export class AcrAdapter implements RegistryAdapter {
  async listRepositories(registry: RegistryConfig): Promise<RepositoryRef[]> {
    const res = await fetch(new URL("/acr/v1/_catalog", registry.baseUrl).toString(), {
      headers: basicAuthHeaders(registry.username, registry.password)
    });
    assertOk(res);

    const body = await res.json();
    if (!isObject(body)) {
      return [];
    }
    const repositories = Array.isArray(body.repositories) ? body.repositories : [];
    return repositories.filter((name): name is string => typeof name === "string").map((name) => ({ name }));
  }

  async listTags(registry: RegistryConfig, repository: string): Promise<TagSnapshot[]> {
    const repoPath = repository.split("/").map(encodeURIComponent).join("/");
    const res = await fetch(new URL(`/acr/v1/${repoPath}/_tags`, registry.baseUrl).toString(), {
      headers: basicAuthHeaders(registry.username, registry.password)
    });
    assertOk(res);

    const body = await res.json();
    if (!isObject(body)) {
      return [];
    }
    const tags = Array.isArray(body.tags) ? body.tags : [];
    const host = registryHost(registry.baseUrl);

    return tags.flatMap((tagItem): TagSnapshot[] => {
      if (typeof tagItem === "string") {
        return [{ tag: tagItem, imageRef: `${host}/${repository}:${tagItem}` }];
      }

      if (!isAcrTag(tagItem)) {
        return [];
      }

      const tag = tagItem;
      if (typeof tag.name !== "string") {
        return [];
      }

      return [
        {
          tag: tag.name,
          imageRef: `${host}/${repository}:${tag.name}`,
          ...(typeof tag.digest === "string" ? { digest: tag.digest } : {}),
          ...(typeof tag.createdTime === "string" ? { createdAt: tag.createdTime } : {}),
          ...(typeof tag.lastUpdateTime === "string" ? { updatedAt: tag.lastUpdateTime } : {})
        }
      ];
    });
  }

  async checkHealth(registry: RegistryConfig): Promise<RegistryHealthResult> {
    const started = Date.now();
    try {
      const res = await fetch(new URL("/v2/", registry.baseUrl).toString(), {
        headers: basicAuthHeaders(registry.username, registry.password)
      });
      const latencyMs = Date.now() - started;

      if (res.status >= 200 && res.status < 400) {
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

function isAcrTag(value: unknown): value is AcrTag {
  return isObject(value);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
