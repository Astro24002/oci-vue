import { describe, expect, it, vi } from "vitest";

import { SyncScheduler } from "../../src/modules/sync/sync.scheduler.js";

describe("SyncScheduler", () => {
  it("starts enabled registries and removes disabled ones", async () => {
    const worker = vi.fn().mockResolvedValue(undefined);
    const scheduler = new SyncScheduler(worker);

    await scheduler.apply({
      server: { port: 8080 },
      sync: { defaultIntervalSec: 10, requestTimeoutSec: 10, retryCount: 1 },
      registries: [
        {
          id: "r1",
          name: "r1",
          baseUrl: "https://a",
          username: "u",
          password: "p",
          enabled: true,
          intervalSec: 5
        }
      ]
    });

    expect(scheduler.activeRegistryIds()).toEqual(["r1"]);

    await scheduler.apply({
      server: { port: 8080 },
      sync: { defaultIntervalSec: 10, requestTimeoutSec: 10, retryCount: 1 },
      registries: [
        {
          id: "r1",
          name: "r1",
          baseUrl: "https://a",
          username: "u",
          password: "p",
          enabled: false,
          intervalSec: 5
        }
      ]
    });

    expect(scheduler.activeRegistryIds()).toEqual([]);
    scheduler.stopAll();
  });
});
