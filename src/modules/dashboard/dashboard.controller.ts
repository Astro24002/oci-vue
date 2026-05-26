import type { Request, Response } from "express";

import { fail, ok } from "../../shared/http.js";

import type { DashboardService } from "./dashboard.service.js";

export class DashboardController {
  constructor(public readonly service: DashboardService) {}

  getDashboard = async (_req: Request, res: Response) => {
    return ok(res, this.service.getDashboardSnapshot());
  };

  getRegistryStatuses = async (_req: Request, res: Response) => {
    return ok(res, this.service.getRegistryStatuses());
  };

  getTags = async (req: Request, res: Response) => {
    const tags = this.service.getTags(req.params.registryId, req.params.repository);
    if (!tags) {
      return fail(res, "NOT_FOUND", "repository not found", 404);
    }
    return ok(res, tags);
  };
}
