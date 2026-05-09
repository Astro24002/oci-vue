import type { Request, Response } from "express";

import { ok } from "../../shared/http.js";
import type { SyncState } from "../sync/sync.state.js";

export class DashboardController {
  constructor(private readonly state: SyncState) {}

  getRegistryStatuses = async (_req: Request, res: Response) => {
    return ok(res, this.state.list());
  };
}
