# Admin UI with Basic Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a minimal `/admin` management page for registry config operations and protect `/admin` plus `/api/config/*` with HTTP Basic Auth.

**Architecture:** Introduce a focused auth middleware module for Basic Auth guardrails, mount protected route groups in Express, and serve a lightweight static admin UI that calls existing config/status APIs. Preserve the existing transactional config update behavior and scheduler rollback semantics already implemented in Node backend.

**Tech Stack:** Node.js, TypeScript, Express, Vitest, Supertest, plain HTML/CSS/JavaScript.

---

## File Structure and Responsibilities

- `src/modules/auth/basic-auth.ts`: Basic Auth middleware and credential validation
- `src/modules/auth/basic-auth.test-helpers.ts`: optional helper for test auth header generation
- `src/routes.ts`: route group wiring for protected and public endpoints
- `src/app.ts`: runtime composition and static `/admin` serving
- `src/server.ts`: startup guard for missing admin credentials
- `web/admin/index.html`: admin page markup
- `web/admin/admin.css`: focused admin styling
- `web/admin/admin.js`: data fetch, render, and actions (create/update/disable/test/reload)
- `tests/auth/basic-auth.middleware.test.ts`: middleware-level auth behavior tests
- `tests/auth/protected-routes.test.ts`: protected route integration tests
- `tests/admin/admin.page.smoke.test.ts`: `/admin` route and auth challenge test
- `README.md`: env vars and admin usage updates

### Task 1: Add Basic Auth middleware with strict challenge behavior

**Files:**
- Create: `src/modules/auth/basic-auth.ts`
- Test: `tests/auth/basic-auth.middleware.test.ts`

- [ ] **Step 1: Write the failing middleware tests**

```ts
import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { requireBasicAuth } from "../../src/modules/auth/basic-auth.js";

describe("requireBasicAuth", () => {
  it("returns 401 with challenge when header missing", async () => {
    const app = express();
    app.get("/protected", requireBasicAuth("admin", "secret"), (_req, res) => {
      res.status(200).json({ ok: true });
    });

    const res = await request(app).get("/protected");
    expect(res.status).toBe(401);
    expect(res.headers["www-authenticate"]).toContain("Basic");
  });

  it("returns 200 when credentials are valid", async () => {
    const app = express();
    app.get("/protected", requireBasicAuth("admin", "secret"), (_req, res) => {
      res.status(200).json({ ok: true });
    });

    const auth = Buffer.from("admin:secret").toString("base64");
    const res = await request(app)
      .get("/protected")
      .set("Authorization", `Basic ${auth}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/auth/basic-auth.middleware.test.ts`
Expected: FAIL with missing `src/modules/auth/basic-auth.ts`.

- [ ] **Step 3: Implement minimal Basic Auth middleware**

```ts
import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";

function unauthorized(res: Response) {
  res.setHeader("WWW-Authenticate", 'Basic realm="OCI Dashboard Admin"');
  return res.status(401).json({ ok: false, error: { code: "UNAUTHORIZED", message: "authentication required" } });
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function requireBasicAuth(expectedUser: string, expectedPass: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.header("authorization");
    if (!header || !header.startsWith("Basic ")) return unauthorized(res);

    const raw = header.slice("Basic ".length);
    const decoded = Buffer.from(raw, "base64").toString("utf8");
    const idx = decoded.indexOf(":");
    if (idx < 0) return unauthorized(res);

    const user = decoded.slice(0, idx);
    const pass = decoded.slice(idx + 1);
    if (!safeEqual(user, expectedUser) || !safeEqual(pass, expectedPass)) return unauthorized(res);
    return next();
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/auth/basic-auth.middleware.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/auth/basic-auth.ts tests/auth/basic-auth.middleware.test.ts
git commit -m "feat: add basic auth middleware for admin routes"
```

### Task 2: Protect `/api/config/*` routes with Basic Auth

**Files:**
- Modify: `src/routes.ts`
- Test: `tests/auth/protected-routes.test.ts`

- [ ] **Step 1: Write failing protected routes integration tests**

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";

import { buildRuntimeApp } from "../../src/app.js";

describe("protected config routes", () => {
  it("rejects unauthenticated request", async () => {
    process.env.ADMIN_USERNAME = "admin";
    process.env.ADMIN_PASSWORD = "secret";
    const app = await buildRuntimeApp("data/config.example.json");

    const res = await request(app).get("/api/config/registries");
    expect(res.status).toBe(401);
  });

  it("accepts authenticated request", async () => {
    process.env.ADMIN_USERNAME = "admin";
    process.env.ADMIN_PASSWORD = "secret";
    const app = await buildRuntimeApp("data/config.example.json");
    const auth = Buffer.from("admin:secret").toString("base64");

    const res = await request(app)
      .get("/api/config/registries")
      .set("Authorization", `Basic ${auth}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/auth/protected-routes.test.ts`
Expected: FAIL because routes are currently unprotected.

- [ ] **Step 3: Wire protected route group in router**

```ts
import { Router } from "express";
import { requireBasicAuth } from "./modules/auth/basic-auth.js";

export function buildRoutes(configController, dashboardController, authConfig) {
  const router = Router();
  const protectedRouter = Router();

  protectedRouter.get("/config/registries", configController.getRegistries);
  protectedRouter.post("/config/registries", configController.createRegistry);
  protectedRouter.put("/config/registries/:id", configController.updateRegistry);
  protectedRouter.delete("/config/registries/:id", configController.deleteRegistry);
  protectedRouter.post("/config/registries/test", configController.testRegistry);
  protectedRouter.post("/config/reload", configController.reload);

  router.use(
    "/api",
    requireBasicAuth(authConfig.username, authConfig.password),
    protectedRouter
  );

  router.get("/api/status/registries", dashboardController.getRegistryStatuses);
  return router;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/auth/protected-routes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/routes.ts tests/auth/protected-routes.test.ts
git commit -m "feat: protect config api routes with basic auth"
```

### Task 3: Add `/admin` page route and protect it

**Files:**
- Modify: `src/app.ts`
- Create: `tests/admin/admin.page.smoke.test.ts`

- [ ] **Step 1: Write failing `/admin` auth challenge test**

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";

import { buildRuntimeApp } from "../../src/app.js";

describe("admin page route", () => {
  it("returns 401 without auth", async () => {
    process.env.ADMIN_USERNAME = "admin";
    process.env.ADMIN_PASSWORD = "secret";
    const app = await buildRuntimeApp("data/config.example.json");
    const res = await request(app).get("/admin");
    expect(res.status).toBe(401);
    expect(res.headers["www-authenticate"]).toContain("Basic");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/admin/admin.page.smoke.test.ts`
Expected: FAIL because `/admin` does not exist.

- [ ] **Step 3: Serve and protect `/admin` static entry**

```ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { requireBasicAuth } from "./modules/auth/basic-auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const adminDir = path.resolve(__dirname, "../web/admin");

app.use(
  "/admin",
  requireBasicAuth(adminUser, adminPass),
  express.static(adminDir)
);
```

- [ ] **Step 4: Add authorized access assertion and rerun tests**

Update test with:

```ts
const auth = Buffer.from("admin:secret").toString("base64");
const okRes = await request(app).get("/admin").set("Authorization", `Basic ${auth}`);
expect(okRes.status).toBe(200);
```

Run: `npm test -- tests/admin/admin.page.smoke.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app.ts tests/admin/admin.page.smoke.test.ts
git commit -m "feat: add protected admin route"
```

### Task 4: Build minimal admin page UI assets

**Files:**
- Create: `web/admin/index.html`
- Create: `web/admin/admin.css`
- Create: `web/admin/admin.js`

- [ ] **Step 1: Write failing page content smoke test**

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { buildRuntimeApp } from "../../src/app.js";

describe("admin page content", () => {
  it("contains registry management title", async () => {
    process.env.ADMIN_USERNAME = "admin";
    process.env.ADMIN_PASSWORD = "secret";
    const app = await buildRuntimeApp("data/config.example.json");
    const auth = Buffer.from("admin:secret").toString("base64");
    const res = await request(app).get("/admin").set("Authorization", `Basic ${auth}`);
    expect(res.text.includes("Registry Management")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/admin/admin.page.smoke.test.ts`
Expected: FAIL because page file missing expected content.

- [ ] **Step 3: Implement minimal admin HTML/CSS/JS**

`web/admin/index.html` should include:

```html
<h1>Registry Management</h1>
<button id="reloadBtn">Reload Config</button>
<div id="message"></div>
<table id="registryTable"></table>
<form id="registryForm">...</form>
<script type="module" src="/admin/admin.js"></script>
```

`web/admin/admin.js` should implement:

- initial parallel fetch for config and status
- table render merged by `id`
- form submit create/update
- disable action
- test action
- reload action

`web/admin/admin.css` should provide readable layout for desktop and mobile.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/admin/admin.page.smoke.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/admin/index.html web/admin/admin.css web/admin/admin.js tests/admin/admin.page.smoke.test.ts
git commit -m "feat: add minimal admin ui for registry management"
```

### Task 5: Add startup guard for missing admin credentials

**Files:**
- Modify: `src/server.ts`
- Test: `tests/auth/startup-guard.test.ts`

- [ ] **Step 1: Write failing startup guard unit test**

```ts
import { describe, expect, it } from "vitest";
import { validateAdminConfig } from "../../src/server.js";

describe("admin startup guard", () => {
  it("throws when admin credentials are missing", () => {
    expect(() => validateAdminConfig("", "")).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/auth/startup-guard.test.ts`
Expected: FAIL because `validateAdminConfig` does not exist.

- [ ] **Step 3: Implement guard and export helper**

```ts
export function validateAdminConfig(username: string, password: string) {
  if (!username || !password) {
    throw new Error("ADMIN_USERNAME and ADMIN_PASSWORD are required");
  }
}
```

Call it before `buildRuntimeApp(...)` in `src/server.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/auth/startup-guard.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server.ts tests/auth/startup-guard.test.ts
git commit -m "feat: enforce admin credential startup guard"
```

### Task 6: Update docs and run full verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Write failing docs test assertion**

Update `tests/readme.smoke.test.ts` with new expectations:

```ts
expect(readme.includes("ADMIN_USERNAME")).toBe(true);
expect(readme.includes("/admin")).toBe(true);
```

- [ ] **Step 2: Run docs test to verify failure**

Run: `npm test -- tests/readme.smoke.test.ts`
Expected: FAIL until README is updated.

- [ ] **Step 3: Update README admin auth section**

Add:

- required `ADMIN_USERNAME` and `ADMIN_PASSWORD`
- example run command:

```bash
ADMIN_USERNAME=admin ADMIN_PASSWORD=secret CONFIG_PATH=data/config.json npm run dev
```

- note that `/admin` and `/api/config/*` require Basic Auth

- [ ] **Step 4: Run full verification**

Run: `npm test && npm run build`
Expected: PASS for all tests and TypeScript build.

- [ ] **Step 5: Commit**

```bash
git add README.md tests/readme.smoke.test.ts
git commit -m "docs: add admin ui and basic auth usage"
```

## Self-Review Notes

- Spec coverage:
  - `/admin` page implementation: Task 3 + Task 4
  - Basic Auth for `/admin` and `/api/config/*`: Task 1 + Task 2 + Task 3
  - Startup credential guard: Task 5
  - Documentation update: Task 6
  - Preserve config behavior and status endpoint: Task 2 and existing service reuse
- Placeholder scan:
  - No TODO/TBD placeholders left.
- Type consistency:
  - `requireBasicAuth`, route paths, and env var names are consistent across tasks.
