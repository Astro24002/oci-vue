import { describe, expect, it } from "vitest";

import { resolveConfigPath } from "../src/server.js";

describe("server startup config", () => {
  it("uses root config.json by default", () => {
    expect(resolveConfigPath(undefined)).toBe("config.json");
  });
});
