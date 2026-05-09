import { describe, expect, it } from "vitest";

import { testRegistryConnectivity } from "../../src/modules/registry/registry.health.js";

describe("registry health", () => {
  it("returns failure payload on unreachable host", async () => {
    const result = await testRegistryConnectivity(
      {
        id: "x",
        name: "x",
        baseUrl: "https://127.0.0.1:1",
        username: "u",
        password: "p",
        enabled: true,
        intervalSec: 10
      },
      200
    );
    expect(result.ok).toBe(false);
  });
});
