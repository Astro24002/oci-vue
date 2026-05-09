import type { Request, Response } from "express";

import { AppError } from "../../shared/errors.js";
import { fail, ok } from "../../shared/http.js";
import type { ConfigService } from "./config.service.js";

export class ConfigController {
  constructor(private readonly service: ConfigService) {}

  getRegistries = async (_req: Request, res: Response) => {
    return ok(res, this.service.listRegistries());
  };

  createRegistry = async (req: Request, res: Response) => {
    try {
      await this.service.createRegistry(req.body);
      return ok(res, null, 201);
    } catch (err) {
      if (err instanceof AppError) {
        return fail(res, err.code, err.message);
      }
      return fail(res, "INTERNAL_ERROR", "internal error", 500);
    }
  };

  updateRegistry = async (req: Request, res: Response) => {
    try {
      await this.service.updateRegistry(req.params.id, req.body);
      return ok(res, null);
    } catch (err) {
      if (err instanceof AppError) {
        return fail(res, err.code, err.message, err.code === "NOT_FOUND" ? 404 : 400);
      }
      return fail(res, "INTERNAL_ERROR", "internal error", 500);
    }
  };

  deleteRegistry = async (req: Request, res: Response) => {
    try {
      await this.service.disableRegistry(req.params.id);
      return ok(res, null);
    } catch (err) {
      if (err instanceof AppError) {
        return fail(res, err.code, err.message, err.code === "NOT_FOUND" ? 404 : 400);
      }
      return fail(res, "INTERNAL_ERROR", "internal error", 500);
    }
  };

  reload = async (_req: Request, res: Response) => {
    try {
      await this.service.reload();
      return ok(res, null);
    } catch (err) {
      if (err instanceof AppError) {
        return fail(res, err.code, err.message, 500);
      }
      return fail(res, "RELOAD_FAILED", "reload failed", 500);
    }
  };

  testRegistry = async (req: Request, res: Response) => {
    try {
      const result = await this.service.testRegistry(req.body);
      return ok(res, result);
    } catch (err) {
      if (err instanceof AppError) {
        return fail(res, err.code, err.message);
      }
      return fail(res, "CONNECTIVITY_FAILED", "connectivity test failed", 500);
    }
  };
}
