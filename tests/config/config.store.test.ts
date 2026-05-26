import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ConfigStore } from "../../src/modules/config/config.store.js";

describe("ConfigStore", () => {
  it("writes and reads config atomically", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cfg-"));
    const file = join(dir, "config.json");
    const store = new ConfigStore(file);

    await store.save({
      server: { port: 8080 },
      sync: { defaultIntervalSec: 10, requestTimeoutSec: 15, retryCount: 1 },
      registries: []
    });

    const loaded = await store.load();
    expect(loaded.server.port).toBe(8080);

    const raw = JSON.parse(await readFile(file, "utf8"));
    expect(raw.sync.defaultIntervalSec).toBe(10);
  });

});
