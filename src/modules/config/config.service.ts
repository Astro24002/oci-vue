import { AppError } from "../../shared/errors.js";
import { maskSecret } from "../../shared/mask.js";

import { appConfigSchema, registrySchema } from "./config.schema.js";
import type { AppConfig, RegistryConfig } from "./config.types.js";

type StoreLike = {
  load: () => Promise<AppConfig>;
  save: (cfg: AppConfig) => Promise<void>;
};

type SchedulerLike = {
  apply: (cfg: AppConfig) => Promise<void>;
};

type RegistryHealthResult = {
  ok: boolean;
  latencyMs: number;
  message: string;
};

type RegistryHealthTester = (
  registry: RegistryConfig,
  timeoutMs: number
) => Promise<RegistryHealthResult>;

export class ConfigService {
  private activeConfig!: AppConfig;

  constructor(
    private readonly store: StoreLike,
    private readonly scheduler: SchedulerLike,
    private readonly healthTester?: RegistryHealthTester
  ) {}

  async init(): Promise<void> {
    this.activeConfig = appConfigSchema.parse(await this.store.load());
    await this.scheduler.apply(this.activeConfig);
  }

  listRegistries() {
    return this.activeConfig.registries.map((r) => ({
      ...r,
      passwordMasked: maskSecret(r.password)
    }));
  }

  async createRegistry(input: RegistryConfig): Promise<void> {
    const candidate = registrySchema.parse(input);
    if (this.activeConfig.registries.some((r) => r.id === candidate.id)) {
      throw new AppError("DUPLICATE_ID", `registry id already exists: ${candidate.id}`);
    }
    const next: AppConfig = {
      ...this.activeConfig,
      registries: [...this.activeConfig.registries, candidate]
    };
    await this.persistAndApply(next);
  }

  async updateRegistry(id: string, patch: Omit<RegistryConfig, "id">): Promise<void> {
    const idx = this.activeConfig.registries.findIndex((r) => r.id === id);
    if (idx < 0) {
      throw new AppError("NOT_FOUND", `registry not found: ${id}`);
    }
    const current = this.activeConfig.registries[idx];
    const merged = registrySchema.parse({ ...current, ...patch, id });
    const registries = [...this.activeConfig.registries];
    registries[idx] = merged;
    await this.persistAndApply({ ...this.activeConfig, registries });
  }

  async disableRegistry(id: string): Promise<void> {
    const idx = this.activeConfig.registries.findIndex((r) => r.id === id);
    if (idx < 0) {
      throw new AppError("NOT_FOUND", `registry not found: ${id}`);
    }
    const registries = [...this.activeConfig.registries];
    registries[idx] = { ...registries[idx], enabled: false };
    await this.persistAndApply({ ...this.activeConfig, registries });
  }

  async reload(): Promise<void> {
    const loaded = appConfigSchema.parse(await this.store.load());
    const prev = this.activeConfig;
    try {
      await this.scheduler.apply(loaded);
      this.activeConfig = loaded;
    } catch (err) {
      await this.scheduler.apply(prev);
      throw err;
    }
  }

  async testRegistry(input: RegistryConfig): Promise<RegistryHealthResult> {
    if (!this.healthTester) {
      throw new AppError("CONNECTIVITY_FAILED", "health tester not configured");
    }
    const reg = registrySchema.parse(input);
    return this.healthTester(reg, this.activeConfig.sync.requestTimeoutSec * 1000);
  }

  listRawRegistries(): RegistryConfig[] {
    return this.activeConfig.registries.map((r) => ({ ...r }));
  }

  private async persistAndApply(next: AppConfig): Promise<void> {
    const prev = this.activeConfig;
    await this.store.save(next);
    try {
      await this.scheduler.apply(next);
      this.activeConfig = next;
    } catch (err) {
      await this.scheduler.apply(prev);
      if (err instanceof Error) {
        throw new AppError("RELOAD_FAILED", err.message);
      }
      throw new AppError("RELOAD_FAILED", "failed to apply config");
    }
  }
}
