import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { requireBasicAuth } from "../../src/modules/auth/basic-auth.js";

describe("requireBasicAuth", () => {
  it("returns 401 with challenge when header missing", async () => {
    const app = express();
    app.get("/protected", requireBasicAuth("admin", "secret"), (_req, res) => {
      res.status(200).json({ ok: true });
    });

    const res = await request(app).get("/protected");
    expect(res.status).toBe(401);
    expect(res.headers["www-authenticate"]).toContain("Basic");
  });

  it("returns 200 when credentials are valid", async () => {
    const app = express();
    app.get("/protected", requireBasicAuth("admin", "secret"), (_req, res) => {
      res.status(200).json({ ok: true });
    });

    const auth = Buffer.from("admin:secret").toString("base64");
    const res = await request(app)
      .get("/protected")
      .set("Authorization", `Basic ${auth}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});
