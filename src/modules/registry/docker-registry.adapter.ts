import type { RegistryConfig } from "../config/config.types.js";

import type {
  RegistryAdapter,
  RegistryHealthResult,
  RepositoryRef,
  TagLayerSnapshot,
  TagSnapshot
} from "./registry.types.js";
import { assertOk, basicAuthHeaders, registryHost } from "./registry.helpers.js";

export class DockerRegistryAdapter implements RegistryAdapter {
  async listRepositories(registry: RegistryConfig): Promise<RepositoryRef[]> {
    const res = await fetch(new URL("/v2/_catalog", registry.baseUrl).toString(), {
      headers: basicAuthHeaders(registry.username, registry.password)
    });

    assertOk(res);

    const body = await res.json();
    if (!isObject(body)) {
      return [];
    }
    const repositories = Array.isArray(body.repositories) ? body.repositories : [];
    return repositories
      .filter((name): name is string => typeof name === "string")
      .map((name) => ({ name }));
  }

  async listTags(registry: RegistryConfig, repository: string): Promise<TagSnapshot[]> {
    const repoPath = repository.split("/").map(encodeURIComponent).join("/");
    const headers = basicAuthHeaders(registry.username, registry.password);
    const res = await fetch(new URL(`/v2/${repoPath}/tags/list`, registry.baseUrl).toString(), {
      headers
    });

    assertOk(res);

    const body = await res.json();
    if (!isObject(body)) {
      return [];
    }
    const tags = Array.isArray(body.tags) ? body.tags : [];
    const host = registryHost(registry.baseUrl);
    const tagNames = tags
      .filter((tag): tag is string => typeof tag === "string")
    const snapshots: TagSnapshot[] = [];

    for (const tag of tagNames) {
      snapshots.push(await this.buildTagSnapshot(registry, repoPath, repository, tag, host, headers));
    }

    return snapshots;
  }

  async checkHealth(registry: RegistryConfig): Promise<RegistryHealthResult> {
    const started = Date.now();
    try {
      const res = await fetch(new URL("/v2/", registry.baseUrl).toString(), {
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

  private async buildTagSnapshot(
    registry: RegistryConfig,
    repoPath: string,
    repository: string,
    tag: string,
    host: string,
    headers: Record<string, string>
  ): Promise<TagSnapshot> {
    const base = { tag, imageRef: `${host}/${repository}:${tag}` };
    try {
      const manifestRes = await fetch(new URL(`/v2/${repoPath}/manifests/${encodeURIComponent(tag)}`, registry.baseUrl).toString(), {
        headers: {
          ...headers,
          Accept: "application/vnd.docker.distribution.manifest.v2+json, application/vnd.oci.image.manifest.v1+json"
        }
      });
      assertOk(manifestRes);
      const manifest = await manifestRes.json();
      const digest = manifestRes.headers.get("Docker-Content-Digest") ?? undefined;
      const configDigest = isObject(manifest) && isObject(manifest.config) && typeof manifest.config.digest === "string"
        ? manifest.config.digest
        : undefined;
      const rawLayers = isObject(manifest) && Array.isArray(manifest.layers) ? manifest.layers : [];
      const layers: TagLayerSnapshot[] = rawLayers
          .filter(isObject)
          .map((layer) => ({
            mediaType: typeof layer.mediaType === "string" ? layer.mediaType : undefined,
            sizeBytes: typeof layer.size === "number" ? layer.size : undefined,
            digest: typeof layer.digest === "string" ? layer.digest : undefined
          }));
      const configSize = isObject(manifest) && isObject(manifest.config) && typeof manifest.config.size === "number"
        ? manifest.config.size
        : 0;
      const sizeBytes = layers.reduce((sum: number, layer: TagLayerSnapshot) => sum + (layer.sizeBytes ?? 0), configSize);
      const config = configDigest ? await this.fetchConfig(registry, repoPath, configDigest, headers) : undefined;
      const createdAt = config?.createdAt;
      const layersWithHistory = attachHistory(layers, config?.history ?? []);
      return {
        ...base,
        digest,
        createdAt,
        updatedAt: createdAt,
        sizeBytes,
        layers: layersWithHistory
      };
    } catch {
      return base;
    }
  }

  private async fetchConfig(
    registry: RegistryConfig,
    repoPath: string,
    configDigest: string,
    headers: Record<string, string>
  ): Promise<{ createdAt?: string; history: LayerHistory[] } | undefined> {
    const res = await fetch(new URL(`/v2/${repoPath}/blobs/${configDigest}`, registry.baseUrl).toString(), { headers });
    assertOk(res);
    const body = await res.json();
    if (!isObject(body)) {
      return undefined;
    }
    const history = Array.isArray(body.history)
      ? body.history.filter(isObject).map((entry) => ({
        command: typeof entry.created_by === "string" ? entry.created_by : undefined,
        createdAt: typeof entry.created === "string" ? entry.created : undefined,
        comment: typeof entry.comment === "string" ? entry.comment : undefined,
        emptyLayer: entry.empty_layer === true
      }))
      : [];
    return {
      createdAt: typeof body.created === "string" ? body.created : undefined,
      history
    };
  }
}

type LayerHistory = {
  command?: string;
  createdAt?: string;
  comment?: string;
  emptyLayer: boolean;
};

function attachHistory(layers: TagLayerSnapshot[], history: LayerHistory[]): TagLayerSnapshot[] {
  const layerHistory = history.filter((entry) => !entry.emptyLayer);
  return layers.map((layer, index) => ({
    ...layer,
    command: layerHistory[index]?.command,
    createdAt: layerHistory[index]?.createdAt,
    comment: layerHistory[index]?.comment
  }));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
