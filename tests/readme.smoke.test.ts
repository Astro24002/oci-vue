import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("README", () => {
  it("documents config management endpoints", () => {
    const readme = readFileSync("README.md", "utf8");
    expect(readme.includes("/api/config/registries")).toBe(true);
    expect(readme.includes("/api/status/registries")).toBe(true);
    expect(readme.includes("ADMIN_USERNAME")).toBe(true);
    expect(readme.includes("/admin")).toBe(true);
  });
});
