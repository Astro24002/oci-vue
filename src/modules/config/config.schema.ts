import { z } from "zod";

export const registrySchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  name: z.string().min(1),
  type: z.enum(["docker-registry", "harbor", "acr"]),
  baseUrl: z
    .string()
    .url()
    .refine(
      (u) => u.startsWith("http://") || u.startsWith("https://"),
      "baseUrl must be http/https"
    ),
  username: z.string().optional(),
  password: z.string().optional(),
  enabled: z.boolean(),
  intervalSec: z.number().int().positive().optional()
});

export const appConfigSchema = z.object({
  server: z.object({ port: z.number().int().positive() }),
  sync: z.object({
    defaultIntervalSec: z.number().int().positive().default(60),
    requestTimeoutSec: z.number().int().positive().default(10),
    retryCount: z.number().int().min(0).default(1)
  }),
  registries: z.array(registrySchema)
});
