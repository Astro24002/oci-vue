import { describe, expect, it, vi } from "vitest";

import { ConfigService } from "../../src/modules/config/config.service.js";

describe("ConfigService", () => {
  it("creates registry and applies scheduler", async () => {
    const store = { load: vi.fn(), save: vi.fn() };
    const apply = vi.fn().mockResolvedValue(undefined);
    store.load.mockResolvedValue({
      server: { port: 8080 },
      sync: { defaultIntervalSec: 10, requestTimeoutSec: 15, retryCount: 1 },
      registries: []
    });

    const service = new ConfigService(store as any, { apply } as any);
    await service.init();
    await service.createRegistry({
      id: "r1",
      name: "r1",
      baseUrl: "https://a",
      username: "u",
      password: "p",
      enabled: true,
      intervalSec: 10
    });

    expect(store.save).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledTimes(2);
  });

  it("rolls back scheduler on apply failure", async () => {
    const store = { load: vi.fn(), save: vi.fn() };
    const base = {
      server: { port: 8080 },
      sync: { defaultIntervalSec: 10, requestTimeoutSec: 15, retryCount: 1 },
      registries: []
    };

    store.load.mockResolvedValue(base);
    const apply = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(undefined);

    const service = new ConfigService(store as any, { apply } as any);
    await service.init();

    await expect(
      service.createRegistry({
        id: "r2",
        name: "r2",
        baseUrl: "https://b",
        username: "u",
        password: "p",
        enabled: true,
        intervalSec: 10
      })
    ).rejects.toThrow("boom");

    expect(apply).toHaveBeenCalledTimes(3);
  });
});
