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
