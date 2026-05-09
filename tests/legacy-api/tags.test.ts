import request from "supertest";
import { describe, expect, it } from "vitest";

import { buildRuntimeApp } from "../../src/app.js";

describe("legacy api /api/tags", () => {
  it("validates required params", async () => {
    const app = await buildRuntimeApp("data/config.example.json");
    const res = await request(app).get("/api/tags");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "registry_id and repository are required" });
  });
});
