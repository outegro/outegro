import { z } from "zod";

/**
 * Shared API contracts (Zod schemas + inferred types) used by both backends
 * and frontends. Single source of truth for request/response shapes.
 */

export const healthResponseSchema = z.object({
  ok: z.literal(true),
  service: z.string(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const deepHealthResponseSchema = z.object({
  ok: z.boolean(),
  service: z.string(),
  checks: z.record(z.string(), z.enum(["up", "down"])),
});
export type DeepHealthResponse = z.infer<typeof deepHealthResponseSchema>;

// Re-export zod so consumers share one instance/version.
export { z };
