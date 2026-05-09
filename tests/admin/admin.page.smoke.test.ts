import request from "supertest";
import { describe, expect, it } from "vitest";

import { buildRuntimeApp } from "../../src/app.js";

describe("admin page route", () => {
  it("returns 401 without auth and 200 with valid auth", async () => {
    process.env.ADMIN_USERNAME = "admin";
    process.env.ADMIN_PASSWORD = "secret";
    const app = await buildRuntimeApp("data/config.example.json");

    const unauthorizedRes = await request(app).get("/admin");
    expect(unauthorizedRes.status).toBe(401);
    expect(unauthorizedRes.headers["www-authenticate"]).toContain("Basic");

    const auth = Buffer.from("admin:secret").toString("base64");
    const authorizedRes = await request(app)
      .get("/admin")
      .set("Authorization", `Basic ${auth}`);
    expect(authorizedRes.status).toBe(200);
  });

  it("contains registry management content", async () => {
    process.env.ADMIN_USERNAME = "admin";
    process.env.ADMIN_PASSWORD = "secret";
    const app = await buildRuntimeApp("data/config.example.json");

    const auth = Buffer.from("admin:secret").toString("base64");
    const res = await request(app)
      .get("/admin")
      .set("Authorization", `Basic ${auth}`);

    expect(res.text.includes("Registry Management")).toBe(true);
  });
});
