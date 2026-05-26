import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";
import { DashboardService } from "../src/modules/dashboard/dashboard.service.js";
import type { RegistrySnapshot } from "../src/modules/registry/registry.types.js";

const snapshots: RegistrySnapshot[] = [
  {
    registryId: "dockerhub",
    registryName: "Docker Hub",
    registryType: "docker-registry",
    baseUrl: "https://registry-1.docker.io",
    status: "healthy",
    consecutiveFailures: 0,
    repositories: []
  }
];

function buildDashboardService() {
  return new DashboardService({
    listSnapshots: () => snapshots,
    getSnapshot: (registryId) => snapshots.find((snapshot) => snapshot.registryId === registryId)
  });
}

describe("app smoke", () => {
  it("responds 404 for unknown route", async () => {
    const app = buildApp();
    const res = await request(app).get("/unknown");
    expect(res.status).toBe(404);
  });

  it("serves dashboard shell without auth", async () => {
    const app = buildApp({ dashboardService: buildDashboardService() });

    const res = await request(app).get("/");

    expect(res.status).toBe(200);
    expect(res.text).toContain("OCI Dashboard");
  });

  it("serves dashboard api without auth", async () => {
    const app = buildApp({ dashboardService: buildDashboardService() });

    const res = await request(app).get("/api/dashboard");

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.summary).toMatchObject({
      registries: 1,
      healthy: 1,
      repositories: 0,
      tags: 0
    });
  });

  it("serves dashboard shell from built app using project-root web assets", async () => {
    execFileSync("npm", ["run", "build"], { stdio: "pipe" });
    const { buildApp: buildCompiledApp } = await import(
      pathToFileURL(path.resolve("dist/src/app.js")).href
    );

    const app = buildCompiledApp({ dashboardService: buildDashboardService() });
    const res = await request(app).get("/");

    expect(res.status).toBe(200);
    expect(res.text).toContain("OCI Dashboard");
  });

  it("points the start script at the built server entrypoint", async () => {
    execFileSync("npm", ["run", "build"], { stdio: "pipe" });
    const pkg = JSON.parse(await readFile(path.resolve("package.json"), "utf8"));
    const startTarget = pkg.scripts.start.replace(/^node\s+/, "");

    expect(existsSync(path.resolve(startTarget))).toBe(true);
  });
});
