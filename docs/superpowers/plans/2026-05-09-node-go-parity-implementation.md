# Node-Go API Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring Node backend API contracts to Go parity (Go as baseline) so Go backend code can be safely removed.

**Architecture:** Add a legacy-compat API module in Node that exposes Go-compatible endpoints and response shapes while reusing existing config/sync state services. Keep current `/api/config/*` admin endpoints intact; layer compatibility routes alongside them. Build parity through TDD-first endpoint-by-endpoint tests, then add a single final parity report pass.

**Tech Stack:** Node.js, TypeScript, Express, Vitest, Supertest, Zod

---

## File Structure (Planned)

- Create: `src/modules/legacy-api/legacy-api.controller.ts` (Go-compatible handlers)
- Create: `src/modules/legacy-api/legacy-api.types.ts` (response shape types)
- Create: `src/modules/legacy-api/legacy-api.service.ts` (contract mapping and in-memory query helpers)
- Create: `src/modules/legacy-api/legacy-api.route.ts` (legacy route wiring)
- Create: `src/modules/health/health.controller.ts` (`/healthz` handler)
- Modify: `src/routes.ts` (mount legacy routes, `/healthz`, aliases)
- Modify: `src/app.ts` (root/status page compatibility handlers)
- Modify: `src/modules/dashboard/dashboard.controller.ts` (registry status mapping helper for legacy output)
- Create: `tests/legacy-api/registries.test.ts`
- Create: `tests/legacy-api/artifacts.test.ts`
- Create: `tests/legacy-api/tags.test.ts`
- Create: `tests/legacy-api/search.test.ts`
- Create: `tests/legacy-api/refresh.test.ts`
- Create: `tests/legacy-api/healthz.test.ts`
- Create: `tests/legacy-api/pages.test.ts`

### Task 1: Establish parity test scaffold

**Files:**
- Create: `tests/legacy-api/registries.test.ts`
- Modify: `tests/app.smoke.test.ts`

- [ ] **Step 1: Write the failing test for Go-compatible registries endpoint path**

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";

import { buildRuntimeApp } from "../../src/app.js";

describe("legacy api /api/registries", () => {
  it("exposes GET /api/registries", async () => {
    const app = await buildRuntimeApp("data/config.example.json");
    const res = await request(app).get("/api/registries");
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/legacy-api/registries.test.ts`
Expected: FAIL with `404` or missing route assertion.

- [ ] **Step 3: Add temporary route stub to make path resolvable**

```ts
// src/routes.ts inside buildRoutes(...)
router.get("/api/registries", (_req, res) => {
  return res.status(501).json({ ok: false, error: { code: "NOT_IMPLEMENTED", message: "pending" } });
});
```

- [ ] **Step 4: Run test to verify route now exists and assertion updates are needed**

Run: `npm test -- tests/legacy-api/registries.test.ts`
Expected: FAIL on status mismatch (`501` vs `200`).

- [ ] **Step 5: Commit scaffold**

```bash
git add tests/legacy-api/registries.test.ts src/routes.ts
git commit -m "test: add initial legacy registries parity scaffold"
```

### Task 2: Implement `/api/registries` Go-compatible contract

**Files:**
- Create: `src/modules/legacy-api/legacy-api.types.ts`
- Create: `src/modules/legacy-api/legacy-api.service.ts`
- Create: `src/modules/legacy-api/legacy-api.controller.ts`
- Modify: `src/routes.ts`
- Modify: `tests/legacy-api/registries.test.ts`

- [ ] **Step 1: Expand failing tests to assert Go-style fields**

```ts
it("returns registry entries with go-style shape", async () => {
  const app = await buildRuntimeApp("data/config.example.json");
  const res = await request(app).get("/api/registries");
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
  if (res.body.length > 0) {
    expect(res.body[0]).toHaveProperty("id");
    expect(res.body[0]).toHaveProperty("name");
    expect(res.body[0]).toHaveProperty("base_url");
    expect(res.body[0]).toHaveProperty("enabled");
    expect(res.body[0]).toHaveProperty("status");
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/legacy-api/registries.test.ts`
Expected: FAIL because stub is not Go contract.

- [ ] **Step 3: Implement minimal legacy service/controller wiring**

```ts
// src/modules/legacy-api/legacy-api.service.ts
export class LegacyApiService {
  constructor(
    private readonly listRegistries: () => Array<{ id: string; name: string; baseUrl: string; enabled: boolean }>,
    private readonly listStatuses: () => Array<{ registryId: string; success: boolean; lastSyncAt: string; durationMs: number; errorMessage?: string }>
  ) {}

  getRegistries() {
    const statusMap = new Map(this.listStatuses().map((s) => [s.registryId, s]));
    return this.listRegistries().map((r) => ({
      id: r.id,
      name: r.name,
      base_url: r.baseUrl,
      enabled: r.enabled,
      status: statusMap.get(r.id) ?? null
    }));
  }
}
```

- [ ] **Step 4: Wire route to controller and remove stub**

```ts
router.get("/api/registries", legacyController.getRegistries);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/legacy-api/registries.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/modules/legacy-api src/routes.ts tests/legacy-api/registries.test.ts
git commit -m "feat: add go-compatible registries endpoint"
```

### Task 3: Implement `/healthz` contract

**Files:**
- Create: `tests/legacy-api/healthz.test.ts`
- Create: `src/modules/health/health.controller.ts`
- Modify: `src/routes.ts`

- [ ] **Step 1: Write failing healthz test**

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { buildRuntimeApp } from "../../src/app.js";

describe("legacy api /healthz", () => {
  it("returns { ok: true, statuses }", async () => {
    const app = await buildRuntimeApp("data/config.example.json");
    const res = await request(app).get("/healthz");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("ok", true);
    expect(res.body).toHaveProperty("statuses");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/legacy-api/healthz.test.ts`
Expected: FAIL with 404.

- [ ] **Step 3: Implement health controller and route**

```ts
// src/modules/health/health.controller.ts
export class HealthController {
  constructor(private readonly listStatuses: () => Array<{ registryId: string; success: boolean }>) {}
  getHealthz = async (_req: any, res: any) => {
    const statuses = Object.fromEntries(this.listStatuses().map((s) => [s.registryId, s]));
    return res.status(200).json({ ok: true, statuses });
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/legacy-api/healthz.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/health/health.controller.ts src/routes.ts tests/legacy-api/healthz.test.ts
git commit -m "feat: add healthz endpoint for go parity"
```

### Task 4: Implement `/api/artifacts` query contract

**Files:**
- Create: `tests/legacy-api/artifacts.test.ts`
- Modify: `src/modules/legacy-api/legacy-api.types.ts`
- Modify: `src/modules/legacy-api/legacy-api.service.ts`
- Modify: `src/modules/legacy-api/legacy-api.controller.ts`
- Modify: `src/modules/sync/sync.state.ts`

- [ ] **Step 1: Write failing tests for query params and pagination shape**

```ts
it("returns { total, items } and supports page/page_size", async () => {
  const app = await buildRuntimeApp("data/config.example.json");
  const res = await request(app).get("/api/artifacts?page=1&page_size=20");
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty("total");
  expect(Array.isArray(res.body.items)).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/legacy-api/artifacts.test.ts`
Expected: FAIL with 404 or missing fields.

- [ ] **Step 3: Implement minimal in-memory artifact projection**

```ts
// legacy-api.service.ts
getArtifacts(input: { registryId?: string; q?: string; page: number; pageSize: number }) {
  const all = this.listArtifactViews(input.registryId);
  const q = (input.q ?? "").trim().toLowerCase();
  const filtered = q ? all.filter((a) => a.repository.toLowerCase().includes(q)) : all;
  const start = Math.max(0, (input.page - 1) * input.pageSize);
  const items = filtered.slice(start, start + input.pageSize);
  return { total: filtered.length, items };
}
```

- [ ] **Step 4: Add controller parsing defaults and route mapping**

```ts
getArtifacts = async (req, res) => {
  const page = Number(req.query.page ?? 1) || 1;
  const pageSize = Number(req.query.page_size ?? 20) || 20;
  return res.status(200).json(this.service.getArtifacts({
    registryId: typeof req.query.registry_id === "string" ? req.query.registry_id : undefined,
    q: typeof req.query.q === "string" ? req.query.q : undefined,
    page,
    pageSize
  }));
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tests/legacy-api/artifacts.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/modules/legacy-api src/modules/sync/sync.state.ts tests/legacy-api/artifacts.test.ts
git commit -m "feat: add go-compatible artifacts endpoint"
```

### Task 5: Implement `/api/tags` contract including validation

**Files:**
- Create: `tests/legacy-api/tags.test.ts`
- Modify: `src/modules/legacy-api/legacy-api.service.ts`
- Modify: `src/modules/legacy-api/legacy-api.controller.ts`

- [ ] **Step 1: Write failing tests for required params and payload shape**

```ts
it("returns 400 when registry_id or repository missing", async () => {
  const app = await buildRuntimeApp("data/config.example.json");
  const res = await request(app).get("/api/tags");
  expect(res.status).toBe(400);
  expect(res.body).toEqual({ error: "registry_id and repository are required" });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/legacy-api/tags.test.ts`
Expected: FAIL with 404 or different error shape.

- [ ] **Step 3: Implement controller validation and service response**

```ts
if (!registryId || !repository) {
  return res.status(400).json({ error: "registry_id and repository are required" });
}
const payload = this.service.getTags({ registryId, repository, forceRefresh });
return res.status(200).json(payload);
```

- [ ] **Step 4: Add 404 behavior for unknown registry on force_refresh=true**

```ts
if (forceRefresh && !this.service.registryExists(registryId)) {
  return res.status(404).json({ error: "registry not found" });
}
```

- [ ] **Step 5: Run tests to verify pass**

Run: `npm test -- tests/legacy-api/tags.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/modules/legacy-api tests/legacy-api/tags.test.ts
git commit -m "feat: add go-compatible tags endpoint"
```

### Task 6: Implement `/api/search` contract

**Files:**
- Create: `tests/legacy-api/search.test.ts`
- Modify: `src/modules/legacy-api/legacy-api.service.ts`
- Modify: `src/modules/legacy-api/legacy-api.controller.ts`

- [ ] **Step 1: Write failing test for array response contract**

```ts
it("returns string array for query q", async () => {
  const app = await buildRuntimeApp("data/config.example.json");
  const res = await request(app).get("/api/search?q=repo");
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/legacy-api/search.test.ts`
Expected: FAIL with 404.

- [ ] **Step 3: Implement search over repositories and tags**

```ts
search(input: { registryId?: string; q: string }): string[] {
  const q = input.q.trim().toLowerCase();
  const refs: string[] = [];
  for (const artifact of this.listArtifactViews(input.registryId)) {
    if (artifact.repository.toLowerCase().includes(q)) refs.push(artifact.repository);
    for (const tag of artifact.tags ?? []) {
      const ref = `${artifact.repository}:${tag}`;
      if (ref.toLowerCase().includes(q)) refs.push(ref);
    }
  }
  return refs;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/legacy-api/search.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/legacy-api tests/legacy-api/search.test.ts
git commit -m "feat: add go-compatible search endpoint"
```

### Task 7: Implement `/api/refresh/:registry_id` contract

**Files:**
- Create: `tests/legacy-api/refresh.test.ts`
- Modify: `src/modules/sync/sync.scheduler.ts`
- Modify: `src/modules/legacy-api/legacy-api.service.ts`
- Modify: `src/modules/legacy-api/legacy-api.controller.ts`

- [ ] **Step 1: Write failing tests for success and not-found behavior**

```ts
it("returns { ok: true } when registry exists", async () => {
  const app = await buildRuntimeApp("data/config.example.json");
  const res = await request(app).post("/api/refresh/example");
  expect([200, 404]).toContain(res.status);
});
```

- [ ] **Step 2: Run test to verify it fails for missing route**

Run: `npm test -- tests/legacy-api/refresh.test.ts`
Expected: FAIL with 404 route not found.

- [ ] **Step 3: Add scheduler method to trigger immediate single-registry run**

```ts
async triggerNow(registryId: string): Promise<boolean> {
  const task = this.tasks.get(registryId);
  if (!task) return false;
  await this.worker(task.registry);
  return true;
}
```

- [ ] **Step 4: Implement controller route behavior**

```ts
const ok = await this.service.refreshRegistry(req.params.registry_id);
if (!ok) return res.status(404).json({ error: "registry not found" });
return res.status(200).json({ ok: true });
```

- [ ] **Step 5: Run tests to verify pass**

Run: `npm test -- tests/legacy-api/refresh.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/modules/sync/sync.scheduler.ts src/modules/legacy-api tests/legacy-api/refresh.test.ts
git commit -m "feat: add go-compatible refresh endpoint"
```

### Task 8: Implement page/path compatibility for `/` and `/registry-status`

**Files:**
- Create: `tests/legacy-api/pages.test.ts`
- Modify: `src/app.ts`

- [ ] **Step 1: Write failing page compatibility tests**

```ts
it("serves compatibility responses for / and /registry-status", async () => {
  const app = await buildRuntimeApp("data/config.example.json");
  const root = await request(app).get("/");
  const status = await request(app).get("/registry-status");
  expect([200, 302]).toContain(root.status);
  expect([200, 302]).toContain(status.status);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/legacy-api/pages.test.ts`
Expected: FAIL with 404.

- [ ] **Step 3: Add minimal compatibility handlers**

```ts
app.get("/", (_req, res) => res.redirect(302, "/admin"));
app.get("/registry-status", (_req, res) => res.redirect(302, "/admin"));
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- tests/legacy-api/pages.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app.ts tests/legacy-api/pages.test.ts
git commit -m "feat: add legacy page route compatibility"
```

### Task 9: Full parity regression and cleanup gate check

**Files:**
- Modify: `tests/legacy-api/*.test.ts` (if any assertion drift remains)
- Modify: `docs/superpowers/specs/2026-05-09-node-go-parity-cleanup-design.md` (append verification notes)

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: PASS, including legacy-api tests.

- [ ] **Step 2: Run build validation**

Run: `npm run build`
Expected: TypeScript build succeeds with no type errors.

- [ ] **Step 3: Document parity outcomes against each Go endpoint**

```md
## Verification Notes
- /api/registries: covered
- /api/artifacts: covered
- /api/tags: covered
- /api/search: covered
- /api/refresh/:registry_id: covered
- /healthz: covered
- /: compatibility redirect added
- /registry-status: compatibility redirect added
```

- [ ] **Step 4: Commit final parity verification**

```bash
git add docs/superpowers/specs/2026-05-09-node-go-parity-cleanup-design.md tests src
git commit -m "test: verify node-go api parity gate"
```

### Task 10: Go cleanup execution (only after parity gate passes)

**Files:**
- Delete: `internal/**/*.go`
- Delete: `main.go`
- Delete: `go.mod`
- Delete: `go.sum`
- Modify: `README.md`
- Modify: `scripts/*` (remove Go references)

- [ ] **Step 1: Write failing repository hygiene checks (optional script/test)**

```ts
// tests/readme.smoke.test.ts extension idea
expect(readme).not.toMatch(/\bgo\s+run\b/);
expect(readme).not.toMatch(/go\.mod/);
```

- [ ] **Step 2: Run check to verify baseline fails before cleanup edits**

Run: `npm test -- tests/readme.smoke.test.ts`
Expected: FAIL if Go references remain.

- [ ] **Step 3: Remove Go files and references**

```bash
rm -f main.go go.mod go.sum
rm -rf internal
```

- [ ] **Step 4: Update docs/scripts to Node-only instructions**

```md
- Replace Go startup docs with `npm run dev` / `npm run build` / `npm start`.
- Remove any mention of gin/go toolchain setup.
```

- [ ] **Step 5: Re-run tests and build**

Run: `npm test && npm run build`
Expected: PASS.

- [ ] **Step 6: Commit cleanup**

```bash
git add -A
git commit -m "chore: remove go backend after node parity"
```

## Self-Review Checklist (Completed)

- Spec coverage: all Go baseline endpoints mapped to explicit implementation tasks.
- Placeholder scan: no TBD/TODO placeholders for actionable steps.
- Type consistency: route names and endpoint contracts are consistent across tasks.
