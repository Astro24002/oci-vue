import { Router } from "express";

import type { ConfigController } from "./modules/config/config.controller.js";
import type { DashboardController } from "./modules/dashboard/dashboard.controller.js";
import { requireBasicAuth } from "./modules/auth/basic-auth.js";
import type { LegacyApiController } from "./modules/legacy-api/legacy-api.controller.js";

type AuthConfig = {
  username: string;
  password: string;
};

export function buildRoutes(
  configController?: ConfigController,
  dashboardController?: DashboardController,
  authConfig?: AuthConfig,
  legacyApiController?: LegacyApiController
) {
  const router = Router();
  if (!configController || !dashboardController) {
    return router;
  }

  const protectedConfigRouter = Router();
  protectedConfigRouter.get("/registries", configController.getRegistries);
  protectedConfigRouter.post("/registries", configController.createRegistry);
  protectedConfigRouter.put("/registries/:id", configController.updateRegistry);
  protectedConfigRouter.delete("/registries/:id", configController.deleteRegistry);
  protectedConfigRouter.post("/registries/test", configController.testRegistry);
  protectedConfigRouter.post("/reload", configController.reload);

  router.use(
    "/api/config",
    requireBasicAuth(authConfig?.username ?? "", authConfig?.password ?? ""),
    protectedConfigRouter
  );

  router.get("/api/status/registries", dashboardController.getRegistryStatuses);
  if (legacyApiController) {
    router.get("/api/registries", legacyApiController.getRegistries);
    router.get("/api/artifacts", legacyApiController.getArtifacts);
    router.get("/api/tags", legacyApiController.getTags);
    router.get("/api/search", legacyApiController.search);
    router.post("/api/refresh/:registry_id", legacyApiController.refresh);
    router.get("/healthz", legacyApiController.healthz);
  }
  return router;
}
