import type { AppConfig, RegistryConfig } from "../config/config.types.js";

import type { WorkerFn } from "./sync.worker.js";

type Task = {
  timer: NodeJS.Timeout;
  registry: RegistryConfig;
};

export class SyncScheduler {
  private readonly tasks = new Map<string, Task>();

  constructor(private readonly worker: WorkerFn) {}

  async apply(config: AppConfig): Promise<void> {
    const enabled = new Map(
      config.registries.filter((r) => r.enabled).map((r) => [r.id, r])
    );

    for (const [id, task] of this.tasks) {
      const next = enabled.get(id);
      if (
        !next ||
        task.registry.intervalSec !== next.intervalSec ||
        task.registry.baseUrl !== next.baseUrl ||
        task.registry.username !== next.username ||
        task.registry.password !== next.password
      ) {
        clearInterval(task.timer);
        this.tasks.delete(id);
      }
    }

    for (const [id, reg] of enabled) {
      if (this.tasks.has(id)) {
        continue;
      }

      const intervalSec = reg.intervalSec ?? config.sync.defaultIntervalSec;
      await this.worker(reg);

      const timer = setInterval(() => {
        void this.worker(reg);
      }, intervalSec * 1000);

      this.tasks.set(id, {
        timer,
        registry: { ...reg, intervalSec }
      });
    }
  }

  activeRegistryIds(): string[] {
    return [...this.tasks.keys()].sort();
  }

  stopAll(): void {
    for (const task of this.tasks.values()) {
      clearInterval(task.timer);
    }
    this.tasks.clear();
  }

  async triggerNow(registryId: string): Promise<boolean> {
    const task = this.tasks.get(registryId);
    if (!task) {
      return false;
    }
    await this.worker(task.registry);
    return true;
  }
}
