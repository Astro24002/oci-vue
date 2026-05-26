import type { RegistryConfig, RegistryType } from "../config/config.types.js";

export type RegistryStatus = "healthy" | "degraded" | "error" | "unknown";

export type RepositoryRef = {
  name: string;
  updatedAt?: string;
};

export type TagSnapshot = {
  tag: string;
  imageRef: string;
  digest?: string;
  createdAt?: string;
  updatedAt?: string;
  sizeBytes?: number;
  layers?: TagLayerSnapshot[];
};

export type TagLayerSnapshot = {
  mediaType?: string;
  sizeBytes?: number;
  digest?: string;
  command?: string;
  createdAt?: string;
  comment?: string;
};

export type RepositorySnapshot = {
  registryId: string;
  name: string;
  imagePrefix: string;
  updatedAt?: string;
  tagCount: number;
  tags: TagSnapshot[];
};

export type RegistrySnapshot = {
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
  repositories: RepositorySnapshot[];
};

export type RegistryHealthResult = {
  ok: boolean;
  latencyMs: number;
  message: string;
};

export interface RegistryAdapter {
  listRepositories(registry: RegistryConfig): Promise<RepositoryRef[]>;
  listTags(registry: RegistryConfig, repository: string): Promise<TagSnapshot[]>;
  checkHealth(registry: RegistryConfig): Promise<RegistryHealthResult>;
}
