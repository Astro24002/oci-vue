import request from "supertest";
import { describe, expect, it } from "vitest";

import { buildRuntimeApp } from "../../src/app.js";

describe("legacy api /api/search", () => {
  it("returns array payload", async () => {
    const app = await buildRuntimeApp("data/config.example.json");
    const res = await request(app).get("/api/search?q=abc");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
