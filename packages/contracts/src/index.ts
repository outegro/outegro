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

// --- Auth (Chapter 3 foundations) ---

export const emailSchema = z.string().trim().toLowerCase().email().max(254);

export const loginRequestSchema = z.object({
  email: emailSchema,
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const loginVerifySchema = z.object({
  email: emailSchema,
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "code must be 6 digits"),
});
export type LoginVerify = z.infer<typeof loginVerifySchema>;

export const authTokensSchema = z.object({
  accessToken: z.string(),
  /** Access token lifetime in seconds. */
  expiresIn: z.number().int().positive(),
  tokenType: z.literal("Bearer"),
});
export type AuthTokens = z.infer<typeof authTokensSchema>;

export const meResponseSchema = z.object({
  id: z.string().uuid(),
  email: emailSchema,
  emailVerified: z.boolean(),
  roles: z.array(z.string()),
});
export type MeResponse = z.infer<typeof meResponseSchema>;

// Re-export zod so consumers share one instance/version.
export { z };
