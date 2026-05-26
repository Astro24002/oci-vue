import express from "express";
import path from "node:path";

import { ConfigStore } from "./modules/config/config.store.js";
import { DashboardController } from "./modules/dashboard/dashboard.controller.js";
import { DashboardService } from "./modules/dashboard/dashboard.service.js";
import { buildCacheWorker } from "./modules/cache/cache.worker.js";
import { RegistryCache } from "./modules/cache/registry-cache.js";
import { getRegistryAdapter } from "./modules/registry/registry.adapters.js";
import { SyncScheduler } from "./modules/sync/sync.scheduler.js";
import { SyncState } from "./modules/sync/sync.state.js";
import { buildWorker } from "./modules/sync/sync.worker.js";
import { buildRoutes } from "./routes.js";

const webDir = path.resolve(process.cwd(), "web");
const staticDir = path.join(webDir, "static");
const dashboardHtmlPath = path.join(webDir, "templates", "index.html");

type BuildAppOptions = {
  dashboardService?: DashboardService;
};

export function buildApp(options: BuildAppOptions = {}) {
  const app = express();
  app.use(express.json());
  app.use("/static", express.static(staticDir));
  if (options.dashboardService) {
    app.get("/", (_req, res) => {
      res.sendFile(dashboardHtmlPath);
    });
  }
  app.use(buildRoutes(options.dashboardService ? new DashboardController(options.dashboardService) : undefined));
  return app;
}

export async function buildRuntimeApp(configPath: string) {
  const cache = new RegistryCache();
  const state = new SyncState();
  const cacheWorker = buildCacheWorker(cache, getRegistryAdapter);
  const worker = buildWorker(state, cacheWorker);
  const scheduler = new SyncScheduler(worker);
  const store = new ConfigStore(configPath);
  const config = await store.load();
  await scheduler.apply(config);
  const dashboardService = new DashboardService(cache);

  const app = buildApp({
    dashboardService
  });
  (app as any).scheduler = scheduler;
  return app;
}
