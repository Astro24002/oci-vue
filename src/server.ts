import { buildRuntimeApp } from "./app.js";
import { fileURLToPath } from "node:url";

export function resolveConfigPath(configPath: string | undefined) {
  return configPath ?? "config.json";
}

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  const configPath = resolveConfigPath(process.env.CONFIG_PATH);
  const port = Number(process.env.PORT ?? 8080);
  const app = await buildRuntimeApp(configPath);
  const server = app.listen(port, () => {
    console.log(`listening on ${port}`);
  });

  for (const sig of ["SIGINT", "SIGTERM"]) {
    process.on(sig, () => {
      const scheduler = (app as any).scheduler;
      if (scheduler) {
        scheduler.stopAll();
      }
      server.close(() => process.exit(0));
    });
  }
}
