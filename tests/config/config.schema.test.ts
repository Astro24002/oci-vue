import { describe, expect, it } from "vitest";

import { appConfigSchema } from "../../src/modules/config/config.schema.js";

describe("appConfigSchema", () => {
  it("accepts supported registry types and default sync settings", () => {
    const parsed = appConfigSchema.parse({
      server: { port: 8080 },
      sync: { requestTimeoutSec: 10, retryCount: 1 },
      registries: [
        {
          id: "docker-main",
          name: "Docker Main",
          type: "docker-registry",
          baseUrl: "https://registry.example.com",
          username: "user",
          password: "pass",
          enabled: true
        },
        {
          id: "harbor-main",
          name: "Harbor Main",
          type: "harbor",
          baseUrl: "https://harbor.example.com",
          enabled: true,
          intervalSec: 5
        },
        {
          id: "acr-main",
          name: "ACR Main",
          type: "acr",
          baseUrl: "https://example.azurecr.io",
          enabled: false
        }
      ]
    });

    expect(parsed.registries.map((r) => r.type)).toEqual([
      "docker-registry",
      "harbor",
      "acr"
    ]);
    expect(parsed.sync.defaultIntervalSec).toBe(60);
  });

  it("rejects unsupported registry types", () => {
    expect(() =>
      appConfigSchema.parse({
        server: { port: 8080 },
        sync: { defaultIntervalSec: 5, requestTimeoutSec: 10, retryCount: 1 },
        registries: [
          {
            id: "bad",
            name: "Bad",
            type: "ecr",
            baseUrl: "https://example.com",
            enabled: true
          }
        ]
      })
    ).toThrow();
  });
});
