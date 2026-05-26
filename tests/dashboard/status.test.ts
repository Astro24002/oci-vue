import request from "supertest";
import { describe, expect, it } from "vitest";

import { buildApp } from "../../src/app.js";
import { DashboardService } from "../../src/modules/dashboard/dashboard.service.js";

describe("status api", () => {
  it("returns registry statuses", async () => {
    const app = buildApp({
      dashboardService: new DashboardService({
        listSnapshots: () => [
          {
            registryId: "reg1",
            registryName: "Registry 1",
            registryType: "docker-registry",
            baseUrl: "https://registry.example.com",
            status: "healthy",
            consecutiveFailures: 0,
            repositories: []
          }
        ],
        getSnapshot: () => undefined
      })
    });
    const res = await request(app).get("/api/status/registries");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
