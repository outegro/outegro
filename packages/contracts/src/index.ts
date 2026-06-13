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

// --- Entitlements (Chapter 4) ---

export const entitlementSchema = z.object({
  id: z.string().uuid(),
  service: z.string(),
  role: z.string(),
  source: z.string(),
  expiresAt: z.string().datetime().nullable(),
});
export type Entitlement = z.infer<typeof entitlementSchema>;

export const entitlementsResponseSchema = z.object({
  entitlements: z.array(entitlementSchema),
});
export type EntitlementsResponse = z.infer<typeof entitlementsResponseSchema>;

// --- Sessions (Chapter 4) ---

export const sessionSchema = z.object({
  id: z.string().uuid(),
  userAgent: z.string().nullable(),
  ip: z.string().nullable(),
  country: z.string().nullable(),
  city: z.string().nullable(),
  createdAt: z.string().datetime(),
  lastActiveAt: z.string().datetime(),
  current: z.boolean(),
});
export type Session = z.infer<typeof sessionSchema>;

export const sessionsListSchema = z.object({
  sessions: z.array(sessionSchema),
});
export type SessionsList = z.infer<typeof sessionsListSchema>;

// --- Passkeys / WebAuthn (Chapter 4) ---

/** RegistrationResponseJSON / AuthenticationResponseJSON from @simplewebauthn/browser. */
export const webauthnCredentialResponseSchema = z.object({
  id: z.string(),
  rawId: z.string(),
  type: z.literal("public-key"),
  clientExtensionResults: z.record(z.string(), z.unknown()),
  authenticatorAttachment: z.string().optional(),
  response: z.record(z.string(), z.unknown()),
});
export type WebauthnCredentialResponse = z.infer<typeof webauthnCredentialResponseSchema>;

export const passkeyAuthenticationVerifySchema = z.object({
  challengeId: z.string().uuid(),
  credential: webauthnCredentialResponseSchema,
});
export type PasskeyAuthenticationVerify = z.infer<typeof passkeyAuthenticationVerifySchema>;

export const passkeySchema = z.object({
  id: z.string().uuid(),
  name: z.string().nullable(),
  createdAt: z.string().datetime(),
  lastUsedAt: z.string().datetime().nullable(),
});
export type Passkey = z.infer<typeof passkeySchema>;

export const passkeysListSchema = z.object({
  passkeys: z.array(passkeySchema),
});
export type PasskeysList = z.infer<typeof passkeysListSchema>;

export const grantEntitlementSchema = z.object({
  userId: z.string().uuid(),
  service: z.string().min(1),
  role: z.string().min(1),
  expiresAt: z.string().datetime().nullable().optional(),
});
export type GrantEntitlement = z.infer<typeof grantEntitlementSchema>;

// --- Telegram linking (Chapter 6) ---

/** Deep-link to start the bot with a one-time linking nonce: t.me/<bot>?start=<nonce>. */
export const telegramLinkTokenResponseSchema = z.object({
  url: z.string().url(),
  expiresIn: z.number().int().positive(),
});
export type TelegramLinkTokenResponse = z.infer<typeof telegramLinkTokenResponseSchema>;

export const telegramLinkStatusSchema = z.object({
  linked: z.boolean(),
});
export type TelegramLinkStatus = z.infer<typeof telegramLinkStatusSchema>;

// Re-export zod so consumers share one instance/version.
export { z };
