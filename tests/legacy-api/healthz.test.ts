import request from "supertest";
import { describe, expect, it } from "vitest";

import { buildRuntimeApp } from "../../src/app.js";

describe("legacy api /healthz", () => {
  it("returns health payload", async () => {
    const app = await buildRuntimeApp("data/config.example.json");
    const res = await request(app).get("/healthz");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(typeof res.body.statuses).toBe("object");
  });
});
