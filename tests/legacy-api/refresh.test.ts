import request from "supertest";
import { describe, expect, it } from "vitest";

import { buildRuntimeApp } from "../../src/app.js";

describe("legacy api /api/refresh/:registry_id", () => {
  it("returns not found for unknown registry", async () => {
    const app = await buildRuntimeApp("data/config.example.json");
    const res = await request(app).post("/api/refresh/unknown");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "registry not found" });
  });
});
