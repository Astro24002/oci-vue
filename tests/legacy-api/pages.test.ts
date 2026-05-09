import request from "supertest";
import { describe, expect, it } from "vitest";

import { buildRuntimeApp } from "../../src/app.js";

describe("legacy page compatibility", () => {
  it("redirects / and /registry-status to /admin", async () => {
    const app = await buildRuntimeApp("data/config.example.json");

    const root = await request(app).get("/");
    expect(root.status).toBe(302);
    expect(root.headers.location).toBe("/admin");

    const status = await request(app).get("/registry-status");
    expect(status.status).toBe(302);
    expect(status.headers.location).toBe("/admin");
  });
});
