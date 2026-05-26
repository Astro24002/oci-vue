import type { AppConfig, RegistryConfig } from "../config/config.types.js";

import type { WorkerFn } from "./sync.worker.js";

type Task = {
  timer: NodeJS.Timeout;
  registry: RegistryConfig;
  inFlight: boolean;
  active: boolean;
  pendingRegistry?: RegistryConfig;
  needsTimer: boolean;
};

function withResolvedInterval(registry: RegistryConfig, config: AppConfig): RegistryConfig {
  return {
    ...registry,
    intervalSec: registry.intervalSec ?? config.sync.defaultIntervalSec
  };
}

function registryChanged(current: RegistryConfig, next: RegistryConfig): boolean {
  return (
    current.name !== next.name ||
    current.type !== next.type ||
    current.intervalSec !== next.intervalSec ||
    current.baseUrl !== next.baseUrl ||
    current.username !== next.username ||
    current.password !== next.password
  );
}

export class SyncScheduler {
  private readonly tasks = new Map<string, Task>();

  constructor(private readonly worker: WorkerFn) {}

  private scheduleTask(task: Task): void {
    clearInterval(task.timer);
    task.needsTimer = false;
    task.timer = setInterval(() => {
      void this.runTask(task);
    }, (task.registry.intervalSec ?? 0) * 1000);
  }

  private async runTask(task: Task): Promise<boolean> {
    if (!task.active || task.inFlight) {
      return false;
    }

    task.inFlight = true;
    try {
      await this.worker(task.registry);
      return true;
    } finally {
      task.inFlight = false;
      while (task.active && task.pendingRegistry) {
        task.registry = task.pendingRegistry;
        task.pendingRegistry = undefined;
        task.inFlight = true;
        try {
          await this.worker(task.registry);
        } finally {
          task.inFlight = false;
        }
      }
      if (task.active && task.needsTimer && !task.inFlight) {
        this.scheduleTask(task);
      }
    }
  }

  async apply(config: AppConfig): Promise<void> {
    const enabled = new Map(
      config.registries.filter((r) => r.enabled).map((r) => [r.id, r])
    );

    for (const [id, task] of this.tasks) {
      const next = enabled.get(id);
      if (!next || registryChanged(task.registry, withResolvedInterval(next, config))) {
        clearInterval(task.timer);
        if (next && task.inFlight) {
          task.pendingRegistry = withResolvedInterval(next, config);
          task.needsTimer = true;
          continue;
        }
        task.active = false;
        this.tasks.delete(id);
      }
    }

    for (const [id, reg] of enabled) {
      if (this.tasks.has(id)) {
        continue;
      }

      const registry = withResolvedInterval(reg, config);
      const task: Task = {
        timer: undefined as unknown as NodeJS.Timeout,
        registry,
        inFlight: false,
        active: true,
        needsTimer: false
      };

      await this.runTask(task);

      this.scheduleTask(task);

      this.tasks.set(id, task);
    }
  }

  activeRegistryIds(): string[] {
    return [...this.tasks.keys()].sort();
  }

  stopAll(): void {
    for (const task of this.tasks.values()) {
      clearInterval(task.timer);
      task.active = false;
    }
    this.tasks.clear();
  }

  async triggerNow(registryId: string): Promise<boolean> {
    const task = this.tasks.get(registryId);
    if (!task) {
      return false;
    }
    return this.runTask(task);
  }
}
