import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { appConfigSchema } from "./config.schema.js";
import type { AppConfig } from "./config.types.js";

export class ConfigStore {
  constructor(private readonly filePath: string) {}

  async load(): Promise<AppConfig> {
    const raw = await readFile(this.filePath, "utf8");
    const parsed = JSON.parse(raw);
    return appConfigSchema.parse(parsed);
  }

  async save(config: AppConfig): Promise<void> {
    appConfigSchema.parse(config);
    await mkdir(dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    await writeFile(tmp, `${JSON.stringify(config, null, 2)}\n`, "utf8");
    await rename(tmp, this.filePath);
  }
}
