import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ConfigController } from "./modules/config/config.controller.js";
import { ConfigStore } from "./modules/config/config.store.js";
import { ConfigService } from "./modules/config/config.service.js";
import { DashboardController } from "./modules/dashboard/dashboard.controller.js";
import { LegacyApiController } from "./modules/legacy-api/legacy-api.controller.js";
import { LegacyApiService } from "./modules/legacy-api/legacy-api.service.js";
import { requireBasicAuth } from "./modules/auth/basic-auth.js";
import { testRegistryConnectivity } from "./modules/registry/registry.health.js";
import { SyncScheduler } from "./modules/sync/sync.scheduler.js";
import { SyncState } from "./modules/sync/sync.state.js";
import { buildWorker } from "./modules/sync/sync.worker.js";
import { buildRoutes } from "./routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const adminDir = path.resolve(__dirname, "../web/admin");

export function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(buildRoutes());
  return app;
}

export async function buildRuntimeApp(configPath: string) {
  const state = new SyncState();
  const worker = buildWorker(state, async () => {});
  const scheduler = new SyncScheduler(worker);
  const store = new ConfigStore(configPath);
  const service = new ConfigService(store, scheduler, testRegistryConnectivity);
  await service.init();

  const app = express();
  const adminUser = process.env.ADMIN_USERNAME ?? "";
  const adminPass = process.env.ADMIN_PASSWORD ?? "";
  const adminAuth = requireBasicAuth(adminUser, adminPass);

  app.use(express.json());
  app.get("/", (_req, res) => {
    return res.redirect(302, "/admin");
  });
  app.get("/registry-status", (_req, res) => {
    return res.redirect(302, "/admin");
  });
  app.get("/admin", adminAuth, (_req, res) => {
    res.sendFile(path.join(adminDir, "index.html"));
  });
  app.use("/admin", adminAuth, express.static(adminDir));
  const legacyApiService = new LegacyApiService(
    () => service.listRawRegistries(),
    state,
    scheduler
  );
  const legacyApiController = new LegacyApiController(legacyApiService);
  app.use(
    buildRoutes(new ConfigController(service), new DashboardController(state), {
      username: adminUser,
      password: adminPass,
    }, legacyApiController)
  );
  (app as any).scheduler = scheduler;
  return app;
}
