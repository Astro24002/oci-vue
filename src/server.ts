import { buildRuntimeApp } from "./app.js";
import { fileURLToPath } from "node:url";

export function validateAdminConfig(username: string, password: string) {
  if (!username || !password) {
    throw new Error("ADMIN_USERNAME and ADMIN_PASSWORD are required");
  }
}

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  const adminUsername = process.env.ADMIN_USERNAME ?? "";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "";
  validateAdminConfig(adminUsername, adminPassword);

  const configPath = process.env.CONFIG_PATH ?? "data/config.json";
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
