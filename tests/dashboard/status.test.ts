import request from "supertest";
import { describe, expect, it } from "vitest";

import { buildRuntimeApp } from "../../src/app.js";

describe("status api", () => {
  it("returns registry statuses", async () => {
    const app = await buildRuntimeApp("data/config.example.json");
    const res = await request(app).get("/api/status/registries");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
