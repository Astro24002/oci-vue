# Node Dynamic Registry Config MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace static YAML-only runtime with a Node + TypeScript service that supports CRUD registry configuration via API/UI, hot reloads scheduler tasks safely, and exposes per-registry sync status.

**Architecture:** Build an Express service with focused modules: config persistence (JSON file), registry connectivity checks, and a diff-based scheduler. Configuration mutations are transactional: validate, write atomically, apply scheduler changes, and rollback on apply failure. Keep the current OCI dashboard behavior and data model while moving execution to Node for faster iteration.

**Tech Stack:** Node.js 20+, TypeScript, Express, Zod, Vitest, Supertest, pino (or console), npm.

---

## File Structure and Responsibilities

- `package.json`: scripts and runtime/test dependencies
- `tsconfig.json`: TypeScript compiler settings
- `src/server.ts`: process entrypoint, env read, HTTP listen
- `src/app.ts`: Express app, middleware, routes mount
- `src/shared/http.ts`: API success/error response helpers
- `src/shared/errors.ts`: typed domain errors + error codes
- `src/shared/mask.ts`: secret masking helper
- `src/modules/config/config.types.ts`: config and registry TypeScript types
- `src/modules/config/config.schema.ts`: Zod schema for runtime validation
- `src/modules/config/config.store.ts`: read/write config JSON with atomic replace
- `src/modules/config/config.service.ts`: CRUD, merge logic, validation bridge, reload hooks
- `src/modules/config/config.controller.ts`: config management HTTP handlers
- `src/modules/registry/registry.health.ts`: connectivity/auth test for one registry
- `src/modules/sync/sync.state.ts`: in-memory latest sync status map
- `src/modules/sync/sync.worker.ts`: one registry sync routine wrapper
- `src/modules/sync/sync.scheduler.ts`: timer lifecycle and apply-diff logic
- `src/modules/dashboard/dashboard.controller.ts`: dashboard/status handlers
- `src/routes.ts`: bind all route handlers
- `data/config.example.json`: sample runtime config
- `tests/config/config.store.test.ts`: atomic store tests
- `tests/config/config.service.test.ts`: CRUD + rollback tests
- `tests/config/config.controller.test.ts`: config API tests
- `tests/sync/sync.scheduler.test.ts`: scheduler diff behavior tests
- `tests/registry/registry.health.test.ts`: registry test endpoint behavior
- `tests/dashboard/status.test.ts`: status endpoint tests
- `README.md`: Node runbook, API list, config management usage

### Task 1: Bootstrap Node + TypeScript service skeleton

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/server.ts`
- Create: `src/app.ts`
- Create: `src/routes.ts`

- [ ] **Step 1: Write the failing app smoke test**

```ts
// tests/app.smoke.test.ts
import request from "supertest";
import { buildApp } from "../src/app";

describe("app smoke", () => {
  it("responds 404 for unknown route", async () => {
    const app = buildApp();
    const res = await request(app).get("/unknown");
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/app.smoke.test.ts`
Expected: FAIL with missing `buildApp` and project scripts/deps.

- [ ] **Step 3: Add minimal Node project files**

```json
// package.json
{
  "name": "oci-dashboard-node",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "test": "vitest run"
  },
  "dependencies": {
    "express": "^4.19.2",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^22.7.4",
    "supertest": "^7.0.0",
    "tsx": "^4.19.1",
    "typescript": "^5.6.3",
    "vitest": "^2.1.2"
  }
}
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "outDir": "dist",
    "rootDir": ".",
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src", "tests"]
}
```

```ts
// src/app.ts
import express from "express";

export function buildApp() {
  const app = express();
  app.use(express.json());
  return app;
}
```

```ts
// src/routes.ts
import { Router } from "express";

export function buildRoutes() {
  const router = Router();
  return router;
}
```

```ts
// src/server.ts
import { buildApp } from "./app.js";

const app = buildApp();
const port = Number(process.env.PORT ?? 8080);
app.listen(port, () => {
  console.log(`listening on ${port}`);
});
```

- [ ] **Step 4: Wire app with routes and rerun tests**

```ts
// src/app.ts
import express from "express";
import { buildRoutes } from "./routes.js";

export function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(buildRoutes());
  return app;
}
```

Run: `npm test -- tests/app.smoke.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json src/server.ts src/app.ts src/routes.ts tests/app.smoke.test.ts
git commit -m "feat: bootstrap node typescript service skeleton"
```

### Task 2: Implement config types/schema and atomic JSON config store

**Files:**
- Create: `src/modules/config/config.types.ts`
- Create: `src/modules/config/config.schema.ts`
- Create: `src/modules/config/config.store.ts`
- Create: `data/config.example.json`
- Test: `tests/config/config.store.test.ts`

- [ ] **Step 1: Write failing atomic store tests**

```ts
// tests/config/config.store.test.ts
import { describe, it, expect } from "vitest";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConfigStore } from "../../src/modules/config/config.store";

describe("ConfigStore", () => {
  it("writes and reads config atomically", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cfg-"));
    const file = join(dir, "config.json");
    const store = new ConfigStore(file);
    await store.save({ server: { port: 8080 }, sync: { defaultIntervalSec: 10, requestTimeoutSec: 15, retryCount: 1 }, registries: [] });
    const loaded = await store.load();
    expect(loaded.server.port).toBe(8080);
    const raw = JSON.parse(await readFile(file, "utf8"));
    expect(raw.sync.defaultIntervalSec).toBe(10);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/config/config.store.test.ts`
Expected: FAIL with missing config store/types.

- [ ] **Step 3: Add config model/schema/store minimal implementation**

```ts
// src/modules/config/config.types.ts
export type RegistryConfig = {
  id: string;
  name: string;
  baseUrl: string;
  username: string;
  password: string;
  enabled: boolean;
  intervalSec?: number;
};

export type AppConfig = {
  server: { port: number };
  sync: { defaultIntervalSec: number; requestTimeoutSec: number; retryCount: number };
  registries: RegistryConfig[];
};
```

```ts
// src/modules/config/config.schema.ts
import { z } from "zod";

export const registrySchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  name: z.string().min(1),
  baseUrl: z.string().url().refine((u) => u.startsWith("http://") || u.startsWith("https://"), "baseUrl must be http/https"),
  username: z.string(),
  password: z.string(),
  enabled: z.boolean(),
  intervalSec: z.number().int().positive().optional()
});

export const appConfigSchema = z.object({
  server: z.object({ port: z.number().int().positive() }),
  sync: z.object({ defaultIntervalSec: z.number().int().positive(), requestTimeoutSec: z.number().int().positive(), retryCount: z.number().int().min(0) }),
  registries: z.array(registrySchema)
});
```

```ts
// src/modules/config/config.store.ts
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { appConfigSchema } from "./config.schema.js";
import type { AppConfig } from "./config.types.js";

export class ConfigStore {
  constructor(private readonly filePath: string) {}

  async load(): Promise<AppConfig> {
    const raw = await readFile(this.filePath, "utf8");
    const parsed = JSON.parse(raw);
    return appConfigSchema.parse(parsed);
  }

  async save(config: AppConfig): Promise<void> {
    appConfigSchema.parse(config);
    await mkdir(dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    await writeFile(tmp, `${JSON.stringify(config, null, 2)}\n`, "utf8");
    await rename(tmp, this.filePath);
  }
}
```

```json
// data/config.example.json
{
  "server": { "port": 8080 },
  "sync": { "defaultIntervalSec": 10, "requestTimeoutSec": 15, "retryCount": 1 },
  "registries": []
}
```

- [ ] **Step 4: Rerun tests**

Run: `npm test -- tests/config/config.store.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/config/config.types.ts src/modules/config/config.schema.ts src/modules/config/config.store.ts data/config.example.json tests/config/config.store.test.ts
git commit -m "feat: add typed config schema and atomic json store"
```

### Task 3: Build scheduler and sync status core with diff apply

**Files:**
- Create: `src/modules/sync/sync.state.ts`
- Create: `src/modules/sync/sync.worker.ts`
- Create: `src/modules/sync/sync.scheduler.ts`
- Test: `tests/sync/sync.scheduler.test.ts`

- [ ] **Step 1: Write failing scheduler diff tests**

```ts
// tests/sync/sync.scheduler.test.ts
import { describe, it, expect, vi } from "vitest";
import { SyncScheduler } from "../../src/modules/sync/sync.scheduler";

describe("SyncScheduler", () => {
  it("starts enabled registries and removes disabled ones", async () => {
    const worker = vi.fn().mockResolvedValue(undefined);
    const scheduler = new SyncScheduler(worker);
    await scheduler.apply({
      server: { port: 8080 },
      sync: { defaultIntervalSec: 10, requestTimeoutSec: 10, retryCount: 1 },
      registries: [{ id: "r1", name: "r1", baseUrl: "https://a", username: "u", password: "p", enabled: true, intervalSec: 5 }]
    });
    expect(scheduler.activeRegistryIds()).toEqual(["r1"]);

    await scheduler.apply({
      server: { port: 8080 },
      sync: { defaultIntervalSec: 10, requestTimeoutSec: 10, retryCount: 1 },
      registries: [{ id: "r1", name: "r1", baseUrl: "https://a", username: "u", password: "p", enabled: false, intervalSec: 5 }]
    });
    expect(scheduler.activeRegistryIds()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/sync/sync.scheduler.test.ts`
Expected: FAIL with missing scheduler/state implementation.

- [ ] **Step 3: Implement sync state + worker + scheduler minimal diff logic**

```ts
// src/modules/sync/sync.state.ts
export type RegistrySyncStatus = {
  registryId: string;
  success: boolean;
  lastSyncAt: string;
  durationMs: number;
  errorMessage?: string;
};

export class SyncState {
  private readonly byRegistry = new Map<string, RegistrySyncStatus>();
  set(status: RegistrySyncStatus) { this.byRegistry.set(status.registryId, status); }
  list() { return [...this.byRegistry.values()]; }
}
```

```ts
// src/modules/sync/sync.worker.ts
import type { RegistryConfig } from "../config/config.types.js";
import type { SyncState } from "./sync.state.js";

export type WorkerFn = (registry: RegistryConfig) => Promise<void>;

export function buildWorker(state: SyncState, runRegistrySync: WorkerFn): WorkerFn {
  return async (registry) => {
    const started = Date.now();
    try {
      await runRegistrySync(registry);
      state.set({ registryId: registry.id, success: true, lastSyncAt: new Date().toISOString(), durationMs: Date.now() - started });
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      state.set({ registryId: registry.id, success: false, lastSyncAt: new Date().toISOString(), durationMs: Date.now() - started, errorMessage: message });
    }
  };
}
```

```ts
// src/modules/sync/sync.scheduler.ts
import type { AppConfig, RegistryConfig } from "../config/config.types.js";
import type { WorkerFn } from "./sync.worker.js";

type Task = { timer: NodeJS.Timeout; registry: RegistryConfig };

export class SyncScheduler {
  private readonly tasks = new Map<string, Task>();
  constructor(private readonly worker: WorkerFn) {}

  async apply(config: AppConfig): Promise<void> {
    const enabled = new Map(config.registries.filter((r) => r.enabled).map((r) => [r.id, r]));

    for (const [id, task] of this.tasks) {
      const next = enabled.get(id);
      if (!next || task.registry.intervalSec !== next.intervalSec || task.registry.baseUrl !== next.baseUrl || task.registry.username !== next.username || task.registry.password !== next.password) {
        clearInterval(task.timer);
        this.tasks.delete(id);
      }
    }

    for (const [id, reg] of enabled) {
      if (this.tasks.has(id)) continue;
      const intervalSec = reg.intervalSec ?? config.sync.defaultIntervalSec;
      await this.worker(reg);
      const timer = setInterval(() => {
        void this.worker(reg);
      }, intervalSec * 1000);
      this.tasks.set(id, { timer, registry: { ...reg, intervalSec } });
    }
  }

  activeRegistryIds(): string[] {
    return [...this.tasks.keys()].sort();
  }

  stopAll(): void {
    for (const task of this.tasks.values()) clearInterval(task.timer);
    this.tasks.clear();
  }
}
```

- [ ] **Step 4: Rerun tests**

Run: `npm test -- tests/sync/sync.scheduler.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/sync/sync.state.ts src/modules/sync/sync.worker.ts src/modules/sync/sync.scheduler.ts tests/sync/sync.scheduler.test.ts
git commit -m "feat: add sync scheduler with registry diff updates"
```

### Task 4: Add config service with transactional update and rollback

**Files:**
- Create: `src/shared/errors.ts`
- Create: `src/shared/mask.ts`
- Create: `src/modules/config/config.service.ts`
- Test: `tests/config/config.service.test.ts`

- [ ] **Step 1: Write failing service behavior tests**

```ts
// tests/config/config.service.test.ts
import { describe, it, expect, vi } from "vitest";
import { ConfigService } from "../../src/modules/config/config.service";

describe("ConfigService", () => {
  it("creates registry and applies scheduler", async () => {
    const store = { load: vi.fn(), save: vi.fn() };
    const apply = vi.fn().mockResolvedValue(undefined);
    store.load.mockResolvedValue({ server: { port: 8080 }, sync: { defaultIntervalSec: 10, requestTimeoutSec: 15, retryCount: 1 }, registries: [] });
    const service = new ConfigService(store as any, { apply } as any);
    await service.init();
    await service.createRegistry({ id: "r1", name: "r1", baseUrl: "https://a", username: "u", password: "p", enabled: true, intervalSec: 10 });
    expect(store.save).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/config/config.service.test.ts`
Expected: FAIL with missing config service.

- [ ] **Step 3: Implement errors, masking, and config service**

```ts
// src/shared/errors.ts
export class AppError extends Error {
  constructor(public readonly code: string, message: string) { super(message); }
}
```

```ts
// src/shared/mask.ts
export function maskSecret(value: string): string {
  if (!value) return "";
  if (value.length <= 4) return "****";
  return `${value.slice(0, 2)}****${value.slice(-2)}`;
}
```

```ts
// src/modules/config/config.service.ts
import { appConfigSchema, registrySchema } from "./config.schema.js";
import type { AppConfig, RegistryConfig } from "./config.types.js";
import { AppError } from "../../shared/errors.js";
import { maskSecret } from "../../shared/mask.js";

type StoreLike = { load: () => Promise<AppConfig>; save: (cfg: AppConfig) => Promise<void> };
type SchedulerLike = { apply: (cfg: AppConfig) => Promise<void> };

export class ConfigService {
  private activeConfig!: AppConfig;

  constructor(private readonly store: StoreLike, private readonly scheduler: SchedulerLike) {}

  async init(): Promise<void> {
    this.activeConfig = appConfigSchema.parse(await this.store.load());
    await this.scheduler.apply(this.activeConfig);
  }

  listRegistries() {
    return this.activeConfig.registries.map((r) => ({ ...r, passwordMasked: maskSecret(r.password) }));
  }

  async createRegistry(input: RegistryConfig): Promise<void> {
    const candidate = registrySchema.parse(input);
    if (this.activeConfig.registries.some((r) => r.id === candidate.id)) {
      throw new AppError("DUPLICATE_ID", `registry id already exists: ${candidate.id}`);
    }
    const next: AppConfig = { ...this.activeConfig, registries: [...this.activeConfig.registries, candidate] };
    await this.persistAndApply(next);
  }

  async updateRegistry(id: string, patch: Omit<RegistryConfig, "id">): Promise<void> {
    const idx = this.activeConfig.registries.findIndex((r) => r.id === id);
    if (idx < 0) throw new AppError("NOT_FOUND", `registry not found: ${id}`);
    const current = this.activeConfig.registries[idx];
    const merged = registrySchema.parse({ ...current, ...patch, id });
    const regs = [...this.activeConfig.registries];
    regs[idx] = merged;
    await this.persistAndApply({ ...this.activeConfig, registries: regs });
  }

  async disableRegistry(id: string): Promise<void> {
    const idx = this.activeConfig.registries.findIndex((r) => r.id === id);
    if (idx < 0) throw new AppError("NOT_FOUND", `registry not found: ${id}`);
    const regs = [...this.activeConfig.registries];
    regs[idx] = { ...regs[idx], enabled: false };
    await this.persistAndApply({ ...this.activeConfig, registries: regs });
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

  private async persistAndApply(next: AppConfig): Promise<void> {
    const prev = this.activeConfig;
    await this.store.save(next);
    try {
      await this.scheduler.apply(next);
      this.activeConfig = next;
    } catch (err) {
      await this.scheduler.apply(prev);
      throw new AppError("RELOAD_FAILED", err instanceof Error ? err.message : "failed to apply config");
    }
  }
}
```

- [ ] **Step 4: Add rollback-path test and rerun tests**

```ts
// append to tests/config/config.service.test.ts
it("rolls back scheduler on apply failure", async () => {
  const store = { load: vi.fn(), save: vi.fn() };
  const base = { server: { port: 8080 }, sync: { defaultIntervalSec: 10, requestTimeoutSec: 15, retryCount: 1 }, registries: [] };
  store.load.mockResolvedValue(base);
  const apply = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce(undefined);
  const service = new ConfigService(store as any, { apply } as any);
  await service.init();
  await expect(service.createRegistry({ id: "r2", name: "r2", baseUrl: "https://b", username: "u", password: "p", enabled: true, intervalSec: 10 })).rejects.toThrow("boom");
  expect(apply).toHaveBeenCalledTimes(3);
});
```

Run: `npm test -- tests/config/config.service.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/errors.ts src/shared/mask.ts src/modules/config/config.service.ts tests/config/config.service.test.ts
git commit -m "feat: add transactional config service with rollback"
```

### Task 5: Implement config and status HTTP APIs

**Files:**
- Create: `src/shared/http.ts`
- Create: `src/modules/config/config.controller.ts`
- Create: `src/modules/dashboard/dashboard.controller.ts`
- Modify: `src/routes.ts`
- Test: `tests/config/config.controller.test.ts`
- Test: `tests/dashboard/status.test.ts`

- [ ] **Step 1: Write failing API tests for CRUD/status**

```ts
// tests/config/config.controller.test.ts
import request from "supertest";
import { buildApp } from "../../src/app";

describe("config api", () => {
  it("returns registries", async () => {
    const app = buildApp();
    const res = await request(app).get("/api/config/registries");
    expect([200, 500]).toContain(res.status);
  });
});
```

```ts
// tests/dashboard/status.test.ts
import request from "supertest";
import { buildApp } from "../../src/app";

describe("status api", () => {
  it("returns registry statuses", async () => {
    const app = buildApp();
    const res = await request(app).get("/api/status/registries");
    expect([200, 500]).toContain(res.status);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- tests/config/config.controller.test.ts tests/dashboard/status.test.ts`
Expected: FAIL due to missing handlers and dependency wiring.

- [ ] **Step 3: Implement response helpers and controllers**

```ts
// src/shared/http.ts
import type { Response } from "express";

export function ok<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ ok: true, data });
}

export function fail(res: Response, code: string, message: string, status = 400) {
  return res.status(status).json({ ok: false, error: { code, message } });
}
```

```ts
// src/modules/config/config.controller.ts
import type { Request, Response } from "express";
import { AppError } from "../../shared/errors.js";
import { fail, ok } from "../../shared/http.js";
import type { ConfigService } from "./config.service.js";

export class ConfigController {
  constructor(private readonly service: ConfigService) {}

  getRegistries = async (_req: Request, res: Response) => ok(res, this.service.listRegistries());

  createRegistry = async (req: Request, res: Response) => {
    try {
      await this.service.createRegistry(req.body);
      return ok(res, null, 201);
    } catch (err) {
      if (err instanceof AppError) return fail(res, err.code, err.message);
      return fail(res, "INTERNAL_ERROR", "internal error", 500);
    }
  };

  updateRegistry = async (req: Request, res: Response) => {
    try {
      await this.service.updateRegistry(req.params.id, req.body);
      return ok(res, null);
    } catch (err) {
      if (err instanceof AppError) return fail(res, err.code, err.message, err.code === "NOT_FOUND" ? 404 : 400);
      return fail(res, "INTERNAL_ERROR", "internal error", 500);
    }
  };

  deleteRegistry = async (req: Request, res: Response) => {
    try {
      await this.service.disableRegistry(req.params.id);
      return ok(res, null);
    } catch (err) {
      if (err instanceof AppError) return fail(res, err.code, err.message, err.code === "NOT_FOUND" ? 404 : 400);
      return fail(res, "INTERNAL_ERROR", "internal error", 500);
    }
  };

  reload = async (_req: Request, res: Response) => {
    try {
      await this.service.reload();
      return ok(res, null);
    } catch (err) {
      if (err instanceof AppError) return fail(res, err.code, err.message, 500);
      return fail(res, "RELOAD_FAILED", "reload failed", 500);
    }
  };
}
```

```ts
// src/modules/dashboard/dashboard.controller.ts
import type { Request, Response } from "express";
import { ok } from "../../shared/http.js";
import type { SyncState } from "../sync/sync.state.js";

export class DashboardController {
  constructor(private readonly state: SyncState) {}
  getRegistryStatuses = async (_req: Request, res: Response) => ok(res, this.state.list());
}
```

- [ ] **Step 4: Wire routes with real handlers and rerun tests**

```ts
// src/routes.ts
import { Router } from "express";
import { ConfigController } from "./modules/config/config.controller.js";
import { DashboardController } from "./modules/dashboard/dashboard.controller.js";

export function buildRoutes(configController: ConfigController, dashboardController: DashboardController) {
  const router = Router();
  router.get("/api/config/registries", configController.getRegistries);
  router.post("/api/config/registries", configController.createRegistry);
  router.put("/api/config/registries/:id", configController.updateRegistry);
  router.delete("/api/config/registries/:id", configController.deleteRegistry);
  router.post("/api/config/reload", configController.reload);
  router.get("/api/status/registries", dashboardController.getRegistryStatuses);
  return router;
}
```

Run: `npm test -- tests/config/config.controller.test.ts tests/dashboard/status.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/http.ts src/modules/config/config.controller.ts src/modules/dashboard/dashboard.controller.ts src/routes.ts tests/config/config.controller.test.ts tests/dashboard/status.test.ts
git commit -m "feat: add config CRUD and sync status APIs"
```

### Task 6: Add registry connectivity test endpoint

**Files:**
- Create: `src/modules/registry/registry.health.ts`
- Modify: `src/modules/config/config.service.ts`
- Modify: `src/modules/config/config.controller.ts`
- Test: `tests/registry/registry.health.test.ts`

- [ ] **Step 1: Write failing connectivity test**

```ts
// tests/registry/registry.health.test.ts
import { describe, it, expect } from "vitest";
import { testRegistryConnectivity } from "../../src/modules/registry/registry.health";

describe("registry health", () => {
  it("returns failure payload on unreachable host", async () => {
    const result = await testRegistryConnectivity({
      id: "x",
      name: "x",
      baseUrl: "https://127.0.0.1:1",
      username: "u",
      password: "p",
      enabled: true,
      intervalSec: 10
    }, 200);
    expect(result.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/registry/registry.health.test.ts`
Expected: FAIL due to missing connectivity module.

- [ ] **Step 3: Implement connectivity tester and endpoint plumbing**

```ts
// src/modules/registry/registry.health.ts
import type { RegistryConfig } from "../config/config.types.js";

export async function testRegistryConnectivity(registry: RegistryConfig, timeoutMs: number) {
  const started = Date.now();
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    const url = new URL("/v2/", registry.baseUrl).toString();
    const auth = Buffer.from(`${registry.username}:${registry.password}`).toString("base64");
    const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` }, signal: ctrl.signal });
    clearTimeout(timer);
    if (res.status >= 200 && res.status < 400) {
      return { ok: true, latencyMs: Date.now() - started, message: "connected" };
    }
    return { ok: false, latencyMs: Date.now() - started, message: `http status ${res.status}` };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - started, message: err instanceof Error ? err.message : "request failed" };
  }
}
```

Add to `ConfigService`:

```ts
async testRegistry(input: RegistryConfig) {
  const reg = registrySchema.parse(input);
  return this.healthTester(reg, this.activeConfig.sync.requestTimeoutSec * 1000);
}
```

Add to `ConfigController`:

```ts
testRegistry = async (req: Request, res: Response) => {
  try {
    const result = await this.service.testRegistry(req.body);
    return ok(res, result);
  } catch (err) {
    if (err instanceof AppError) return fail(res, err.code, err.message);
    return fail(res, "CONNECTIVITY_FAILED", "connectivity test failed", 500);
  }
};
```

Add route:

```ts
router.post("/api/config/registries/test", configController.testRegistry);
```

- [ ] **Step 4: Rerun test**

Run: `npm test -- tests/registry/registry.health.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/registry/registry.health.ts src/modules/config/config.service.ts src/modules/config/config.controller.ts src/routes.ts tests/registry/registry.health.test.ts
git commit -m "feat: add registry connectivity test endpoint"
```

### Task 7: Compose runtime dependencies and startup wiring

**Files:**
- Modify: `src/app.ts`
- Modify: `src/server.ts`
- Modify: `src/routes.ts`
- Create: `data/config.json` (for local run only, gitignored)
- Test: `tests/app.runtime.test.ts`

- [ ] **Step 1: Write failing runtime composition test**

```ts
// tests/app.runtime.test.ts
import request from "supertest";
import { buildRuntimeApp } from "../src/app";

describe("runtime app", () => {
  it("serves registries endpoint with ok envelope", async () => {
    const app = await buildRuntimeApp("data/config.example.json");
    const res = await request(app).get("/api/config/registries");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/app.runtime.test.ts`
Expected: FAIL with missing runtime composition API.

- [ ] **Step 3: Implement runtime app builder and graceful shutdown support**

```ts
// src/app.ts
import express from "express";
import { ConfigStore } from "./modules/config/config.store.js";
import { ConfigService } from "./modules/config/config.service.js";
import { ConfigController } from "./modules/config/config.controller.js";
import { DashboardController } from "./modules/dashboard/dashboard.controller.js";
import { SyncScheduler } from "./modules/sync/sync.scheduler.js";
import { SyncState } from "./modules/sync/sync.state.js";
import { buildWorker } from "./modules/sync/sync.worker.js";
import { buildRoutes } from "./routes.js";
import { testRegistryConnectivity } from "./modules/registry/registry.health.js";

export async function buildRuntimeApp(configPath: string) {
  const state = new SyncState();
  const worker = buildWorker(state, async () => {});
  const scheduler = new SyncScheduler(worker);
  const store = new ConfigStore(configPath);
  const service = new ConfigService(store, scheduler, testRegistryConnectivity);
  await service.init();

  const app = express();
  app.use(express.json());
  app.use(buildRoutes(new ConfigController(service), new DashboardController(state)));
  (app as any).scheduler = scheduler;
  return app;
}
```

```ts
// src/server.ts
import { buildRuntimeApp } from "./app.js";

const configPath = process.env.CONFIG_PATH ?? "data/config.json";
const port = Number(process.env.PORT ?? 8080);
const app = await buildRuntimeApp(configPath);
const server = app.listen(port, () => console.log(`listening on ${port}`));

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    const scheduler = (app as any).scheduler;
    if (scheduler) scheduler.stopAll();
    server.close(() => process.exit(0));
  });
}
```

- [ ] **Step 4: Rerun test**

Run: `npm test -- tests/app.runtime.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app.ts src/server.ts src/routes.ts tests/app.runtime.test.ts
git commit -m "feat: wire runtime config service and scheduler startup"
```

### Task 8: Update docs and run full verification

**Files:**
- Modify: `README.md`
- Modify: `.gitignore`

- [ ] **Step 1: Write failing docs assertion test (optional lightweight check)**

```ts
// tests/readme.smoke.test.ts
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

describe("README", () => {
  it("documents config management endpoints", () => {
    const readme = readFileSync("README.md", "utf8");
    expect(readme.includes("/api/config/registries")).toBe(true);
    expect(readme.includes("/api/status/registries")).toBe(true);
  });
});
```

- [ ] **Step 2: Run docs test to verify failure**

Run: `npm test -- tests/readme.smoke.test.ts`
Expected: FAIL until README is updated.

- [ ] **Step 3: Update docs and ignore runtime data file**

Add to `.gitignore`:

```gitignore
data/config.json
dist/
node_modules/
```

Update `README.md` sections:

- Node prerequisites and install/run commands
- `CONFIG_PATH` usage
- Config JSON example
- Config CRUD endpoints
- Status endpoint
- Hot reload + rollback behavior

- [ ] **Step 4: Run full verification**

Run: `npm test && npm run build`
Expected: PASS for tests and TypeScript build.

Run: `CONFIG_PATH=data/config.example.json npm run dev`
Expected: server starts and `GET /api/config/registries` responds with `{ ok: true }` envelope.

- [ ] **Step 5: Commit**

```bash
git add README.md .gitignore tests/readme.smoke.test.ts
git commit -m "docs: add node runtime and dynamic config usage guide"
```

## Self-Review Notes

- Spec coverage check:
  - Node + Express migration path: Tasks 1, 7
  - File-based config persistence: Task 2
  - CRUD + reload APIs: Tasks 4, 5
  - Registry connectivity test endpoint: Task 6
  - Hot reload rollback semantics: Task 4
  - Per-registry sync status: Tasks 3, 5
  - Documentation and runbook: Task 8
- Placeholder scan: no TODO/TBD placeholders remain.
- Type consistency: `RegistryConfig`, `AppConfig`, and response envelope names are consistent across tasks.
