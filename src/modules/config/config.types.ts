export type RegistryType = "docker-registry" | "harbor" | "acr";

export type RegistryConfig = {
  id: string;
  name: string;
  type: RegistryType;
  baseUrl: string;
  username?: string;
  password?: string;
  enabled: boolean;
  intervalSec?: number;
};

export type AppConfig = {
  server: { port: number };
  sync: {
    defaultIntervalSec: number;
    requestTimeoutSec: number;
    retryCount: number;
  };
  registries: RegistryConfig[];
};
