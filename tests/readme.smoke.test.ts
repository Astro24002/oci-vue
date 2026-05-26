import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("README", () => {
  it("documents the read-only dashboard configuration and APIs", () => {
    const readme = readFileSync("README.md", "utf8");
    expect(readme.includes("config.json")).toBe(true);
    expect(readme.includes("/api/dashboard")).toBe(true);
    expect(readme.includes("/api/status/registries")).toBe(true);
    expect(readme.includes("/api/config/registries")).toBe(false);
    expect(readme.includes("ADMIN_USERNAME")).toBe(false);
  });
});
