import request from "supertest";
import { describe, expect, it } from "vitest";

import { buildRuntimeApp } from "../../src/app.js";

describe("legacy api /api/artifacts", () => {
  it("returns paged payload", async () => {
    const app = await buildRuntimeApp("data/config.example.json");
    const res = await request(app).get("/api/artifacts?page=1&page_size=20");
    expect(res.status).toBe(200);
    expect(typeof res.body.total).toBe("number");
    expect(Array.isArray(res.body.items)).toBe(true);
  });
});
