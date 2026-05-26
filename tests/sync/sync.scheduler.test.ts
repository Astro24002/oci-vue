import { afterEach, describe, expect, it, vi } from "vitest";

import { SyncScheduler } from "../../src/modules/sync/sync.scheduler.js";
import type { AppConfig, RegistryConfig } from "../../src/modules/config/config.types.js";

const baseConfig = {
  server: { port: 8080 },
  sync: { defaultIntervalSec: 10, requestTimeoutSec: 10, retryCount: 1 }
};

const registry: RegistryConfig = {
  id: "r1",
  name: "r1",
  type: "docker-registry",
  baseUrl: "https://a",
  username: "u",
  password: "p",
  enabled: true,
  intervalSec: 5
};

function configWith(registries: RegistryConfig[]): AppConfig {
  return { ...baseConfig, registries };
}

function deferred() {
  let resolve: (() => void) | undefined;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return {
    promise,
    resolve: () => resolve?.()
  };
}

describe("SyncScheduler", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts enabled registries and removes disabled ones", async () => {
    vi.useFakeTimers();
    const worker = vi.fn().mockResolvedValue(undefined);
    const scheduler = new SyncScheduler(worker);

    await scheduler.apply(configWith([registry]));

    expect(scheduler.activeRegistryIds()).toEqual(["r1"]);
    expect(worker).toHaveBeenCalledTimes(1);
    expect(worker).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "r1", intervalSec: 5 })
    );

    await scheduler.apply(configWith([{ ...registry, enabled: false }]));

    expect(scheduler.activeRegistryIds()).toEqual([]);
    expect(worker).toHaveBeenCalledTimes(1);
    scheduler.stopAll();
  });

  it("restarts a registry when its type changes", async () => {
    vi.useFakeTimers();
    const worker = vi.fn().mockResolvedValue(undefined);
    const scheduler = new SyncScheduler(worker);

    await scheduler.apply(configWith([{ ...registry, intervalSec: undefined }]));
    await scheduler.apply(configWith([{ ...registry, type: "harbor", intervalSec: undefined }]));

    expect(worker).toHaveBeenCalledTimes(2);
    expect(worker).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: "r1", type: "harbor", intervalSec: 10 })
    );
    scheduler.stopAll();
  });

  it("refreshes a registry after its scheduled interval fires", async () => {
    vi.useFakeTimers();
    const worker = vi.fn().mockResolvedValue(undefined);
    const scheduler = new SyncScheduler(worker);

    await scheduler.apply(configWith([registry]));
    await vi.advanceTimersByTimeAsync(4999);
    expect(worker).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1);

    expect(worker).toHaveBeenCalledTimes(2);
    expect(worker).toHaveBeenLastCalledWith(expect.objectContaining({ id: "r1" }));
    scheduler.stopAll();
  });

  it.each([
    ["name", { name: "renamed" }],
    ["baseUrl", { baseUrl: "https://b" }],
    ["username", { username: "new-user" }],
    ["password", { password: "new-password" }],
    ["intervalSec", { intervalSec: 7 }]
  ] as const)("restarts a registry when %s changes", async (_field, change) => {
    vi.useFakeTimers();
    const worker = vi.fn().mockResolvedValue(undefined);
    const scheduler = new SyncScheduler(worker);

    await scheduler.apply(configWith([registry]));
    await scheduler.apply(configWith([{ ...registry, ...change }]));

    expect(worker).toHaveBeenCalledTimes(2);
    expect(worker).toHaveBeenLastCalledWith(expect.objectContaining({ id: "r1", ...change }));
    scheduler.stopAll();
  });

  it("uses the new registry name on subsequent manual refresh after a name change", async () => {
    vi.useFakeTimers();
    const worker = vi.fn().mockResolvedValue(undefined);
    const scheduler = new SyncScheduler(worker);

    await scheduler.apply(configWith([registry]));
    await scheduler.apply(configWith([{ ...registry, name: "renamed" }]));
    await scheduler.triggerNow("r1");

    expect(worker).toHaveBeenCalledTimes(3);
    expect(worker).toHaveBeenLastCalledWith(expect.objectContaining({ id: "r1", name: "renamed" }));
    scheduler.stopAll();
  });

  it("skips scheduled refresh ticks while the prior refresh is still running", async () => {
    vi.useFakeTimers();
    let finishRefresh: (() => void) | undefined;
    const worker = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            finishRefresh = resolve;
          })
      )
      .mockResolvedValue(undefined);
    const scheduler = new SyncScheduler(worker);

    await scheduler.apply(configWith([registry]));
    await vi.advanceTimersByTimeAsync(5000);
    await vi.advanceTimersByTimeAsync(5000);

    expect(worker).toHaveBeenCalledTimes(2);

    finishRefresh?.();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(5000);

    expect(worker).toHaveBeenCalledTimes(3);
    scheduler.stopAll();
  });

  it("removes a registry that is missing from the next config", async () => {
    vi.useFakeTimers();
    const worker = vi.fn().mockResolvedValue(undefined);
    const scheduler = new SyncScheduler(worker);

    await scheduler.apply(configWith([registry]));
    await scheduler.apply(configWith([]));

    expect(scheduler.activeRegistryIds()).toEqual([]);
    await vi.advanceTimersByTimeAsync(5000);
    expect(worker).toHaveBeenCalledTimes(1);
    scheduler.stopAll();
  });

  it("triggerNow returns true and runs the worker for an active registry", async () => {
    vi.useFakeTimers();
    const worker = vi.fn().mockResolvedValue(undefined);
    const scheduler = new SyncScheduler(worker);

    await scheduler.apply(configWith([registry]));
    const triggered = await scheduler.triggerNow("r1");

    expect(triggered).toBe(true);
    expect(worker).toHaveBeenCalledTimes(2);
    expect(worker).toHaveBeenLastCalledWith(expect.objectContaining({ id: "r1" }));
    scheduler.stopAll();
  });

  it("triggerNow returns false when a refresh is already in flight", async () => {
    vi.useFakeTimers();
    const refresh = deferred();
    const worker = vi.fn().mockResolvedValueOnce(undefined).mockReturnValueOnce(refresh.promise);
    const scheduler = new SyncScheduler(worker);

    await scheduler.apply(configWith([registry]));
    await vi.advanceTimersByTimeAsync(5000);
    const triggered = await scheduler.triggerNow("r1");

    expect(triggered).toBe(false);
    expect(worker).toHaveBeenCalledTimes(2);

    refresh.resolve();
    await Promise.resolve();
    scheduler.stopAll();
  });

  it("defers restart while an old refresh is in flight and then uses new metadata", async () => {
    vi.useFakeTimers();
    const refresh = deferred();
    const worker = vi.fn().mockResolvedValueOnce(undefined).mockReturnValueOnce(refresh.promise);
    const scheduler = new SyncScheduler(worker);

    await scheduler.apply(configWith([registry]));
    await vi.advanceTimersByTimeAsync(5000);
    await scheduler.apply(configWith([{ ...registry, name: "renamed" }]));

    expect(worker).toHaveBeenCalledTimes(2);

    refresh.resolve();
    await Promise.resolve();

    expect(worker).toHaveBeenCalledTimes(3);
    expect(worker).toHaveBeenLastCalledWith(expect.objectContaining({ id: "r1", name: "renamed" }));
    scheduler.stopAll();
  });

  it("removal while a refresh is in flight leaves no active registry or later interval", async () => {
    vi.useFakeTimers();
    const refresh = deferred();
    const worker = vi.fn().mockResolvedValueOnce(undefined).mockReturnValueOnce(refresh.promise);
    const scheduler = new SyncScheduler(worker);

    await scheduler.apply(configWith([registry]));
    await vi.advanceTimersByTimeAsync(5000);
    await scheduler.apply(configWith([]));

    expect(scheduler.activeRegistryIds()).toEqual([]);
    expect(worker).toHaveBeenCalledTimes(2);

    refresh.resolve();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(15000);

    expect(scheduler.activeRegistryIds()).toEqual([]);
    expect(worker).toHaveBeenCalledTimes(2);
    scheduler.stopAll();
  });

  it("keeps one interval when pending restart changes during catch-up refresh", async () => {
    vi.useFakeTimers();
    const refreshA = deferred();
    const refreshB = deferred();
    const worker = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockReturnValueOnce(refreshA.promise)
      .mockReturnValueOnce(refreshB.promise)
      .mockResolvedValue(undefined);
    const scheduler = new SyncScheduler(worker);

    await scheduler.apply(configWith([registry]));
    await vi.advanceTimersByTimeAsync(5000);
    await scheduler.apply(configWith([{ ...registry, name: "B" }]));

    refreshA.resolve();
    await Promise.resolve();

    expect(worker).toHaveBeenCalledTimes(3);
    expect(worker).toHaveBeenLastCalledWith(expect.objectContaining({ id: "r1", name: "B" }));

    await scheduler.apply(configWith([{ ...registry, name: "C" }]));
    expect(worker).toHaveBeenCalledTimes(3);

    refreshB.resolve();
    await Promise.resolve();

    expect(worker).toHaveBeenCalledTimes(4);
    expect(worker).toHaveBeenLastCalledWith(expect.objectContaining({ id: "r1", name: "C" }));

    await vi.advanceTimersByTimeAsync(5000);
    expect(worker).toHaveBeenCalledTimes(5);
    expect(worker).toHaveBeenLastCalledWith(expect.objectContaining({ id: "r1", name: "C" }));

    await vi.advanceTimersByTimeAsync(5000);
    expect(worker).toHaveBeenCalledTimes(6);
    expect(worker).toHaveBeenLastCalledWith(expect.objectContaining({ id: "r1", name: "C" }));
    scheduler.stopAll();
  });

  it("triggerNow returns false for a missing registry", async () => {
    vi.useFakeTimers();
    const worker = vi.fn().mockResolvedValue(undefined);
    const scheduler = new SyncScheduler(worker);

    await scheduler.apply(configWith([registry]));
    const triggered = await scheduler.triggerNow("missing");

    expect(triggered).toBe(false);
    expect(worker).toHaveBeenCalledTimes(1);
    scheduler.stopAll();
  });
});
