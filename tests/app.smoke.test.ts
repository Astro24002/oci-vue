import request from "supertest";
import { describe, expect, it } from "vitest";

import { buildApp } from "../src/app.js";

describe("app smoke", () => {
  it("responds 404 for unknown route", async () => {
    const app = buildApp();
    const res = await request(app).get("/unknown");
    expect(res.status).toBe(404);
  });
});
