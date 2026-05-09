import { describe, expect, it } from "vitest";

import { validateAdminConfig } from "../../src/server.js";

describe("admin startup guard", () => {
  it("throws when admin credentials are missing", () => {
    expect(() => validateAdminConfig("", "")).toThrow();
  });
});
