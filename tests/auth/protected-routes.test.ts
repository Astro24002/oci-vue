import request from "supertest";
import { describe, expect, it } from "vitest";

import { buildRuntimeApp } from "../../src/app.js";

describe("protected config routes", () => {
  it("rejects unauthenticated request", async () => {
    process.env.ADMIN_USERNAME = "admin";
    process.env.ADMIN_PASSWORD = "secret";
    const app = await buildRuntimeApp("data/config.example.json");

    const res = await request(app).get("/api/config/registries");
    expect(res.status).toBe(401);
  });

  it("accepts authenticated request", async () => {
    process.env.ADMIN_USERNAME = "admin";
    process.env.ADMIN_PASSWORD = "secret";
    const app = await buildRuntimeApp("data/config.example.json");
    const auth = Buffer.from("admin:secret").toString("base64");

    const res = await request(app)
      .get("/api/config/registries")
      .set("Authorization", `Basic ${auth}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
