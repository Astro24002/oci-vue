import { Router } from "express";

import type { DashboardController } from "./modules/dashboard/dashboard.controller.js";

export function buildRoutes(dashboardController?: DashboardController) {
  const router = Router();
  if (!dashboardController) {
    return router;
  }
  router.get("/api/dashboard", dashboardController.getDashboard);
  router.get("/api/status/registries", dashboardController.getRegistryStatuses);
  router.get("/api/repositories/:registryId/:repository(*)/tags", dashboardController.getTags);
  return router;
}
