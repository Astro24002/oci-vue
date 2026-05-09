import type { Request, Response } from "express";

import type { LegacyApiService } from "./legacy-api.service.js";

export class LegacyApiController {
  constructor(private readonly service: LegacyApiService) {}

  getRegistries = async (_req: Request, res: Response) => {
    return res.status(200).json(this.service.getRegistries());
  };

  getArtifacts = async (req: Request, res: Response) => {
    const page = Number(req.query.page ?? 1) || 1;
    const pageSize = Number(req.query.page_size ?? 20) || 20;
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    return res.status(200).json(this.service.getArtifacts({ page, pageSize, q }));
  };

  getTags = async (req: Request, res: Response) => {
    const registryId = typeof req.query.registry_id === "string" ? req.query.registry_id : "";
    const repository = typeof req.query.repository === "string" ? req.query.repository : "";
    if (!registryId || !repository) {
      return res.status(400).json({ error: "registry_id and repository are required" });
    }
    const forceRefresh = String(req.query.force_refresh ?? "").toLowerCase() === "true";
    if (forceRefresh && !this.service.registryExists(registryId)) {
      return res.status(404).json({ error: "registry not found" });
    }
    return res.status(200).json(this.service.getTags(registryId, repository));
  };

  search = async (req: Request, res: Response) => {
    const q = typeof req.query.q === "string" ? req.query.q : "";
    return res.status(200).json(this.service.search(q));
  };

  refresh = async (req: Request, res: Response) => {
    const ok = await this.service.refreshRegistry(req.params.registry_id);
    if (!ok) {
      return res.status(404).json({ error: "registry not found" });
    }
    return res.status(200).json({ ok: true });
  };

  healthz = async (_req: Request, res: Response) => {
    return res.status(200).json(this.service.getHealthz());
  };
}
