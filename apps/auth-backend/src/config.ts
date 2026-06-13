import { z } from "@outegro/contracts";
import { loadEnv } from "@outegro/core";

export const env = loadEnv(
  z.object({
    NODE_ENV: z.string().default("production"),
    PORT: z.coerce.number().default(3000),
    CORS_ORIGIN: z.string().default("http://localhost:3000"),

    DATABASE_URL: z.string(),
    REDIS_URL: z.string(),
    // Optional: when set, login codes are published to RabbitMQ for delivery.
    RABBITMQ_URL: z.string().optional(),

    // ES256 private key (PKCS8 PEM). If absent in dev, an ephemeral key is generated
    // (fine for a single local instance; prod MUST set this — a sealed secret —
    // so all replicas sign/verify with the same key).
    JWT_PRIVATE_KEY: z.string().optional(),
    JWT_ISSUER: z.string().default("https://api.outegro.com"),
    JWT_AUDIENCE: z.string().default("outegro"),

    ACCESS_TTL: z.coerce.number().default(900), // 15 min
    REFRESH_TTL: z.coerce.number().default(60 * 60 * 24 * 30), // 30 days

    CODE_TTL: z.coerce.number().default(600), // 10 min
    CODE_MAX_ATTEMPTS: z.coerce.number().default(5),

    // Refresh cookie is set on this domain for SSO across *.outegro.com.
    COOKIE_DOMAIN: z.string().optional(),

    // Manual/admin entitlement grants (until payment-backend is the source of
    // truth). Required header `X-Admin-Key` on /admin/* routes; unset disables them.
    ADMIN_API_KEY: z.string().optional(),

    // WebAuthn (passkeys) — rpID is the registrable domain shared across
    // *.outegro.com, rpOrigin is the exact origin the ceremony runs from.
    WEBAUTHN_RP_ID: z.string().default("outegro.com"),
    WEBAUTHN_RP_ORIGIN: z.string().default("https://auth.outegro.com"),
    WEBAUTHN_RP_NAME: z.string().default("Outegro"),

    // Google OAuth — unset disables /auth/google/* (404s).
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GOOGLE_REDIRECT_URI: z.string().default("https://api.outegro.com/auth/google/callback"),
    // Where to send the browser after a successful Google login/link.
    GOOGLE_SUCCESS_REDIRECT: z.string().default("https://auth.outegro.com/profile"),

    // Telegram linking — public bot @username (no @) used to build the t.me deep
    // link; unset disables /auth/telegram/link-token (404s).
    TELEGRAM_BOT_USERNAME: z.string().optional(),
    TELEGRAM_LINK_TTL: z.coerce.number().default(600), // 10 min nonce lifetime
    // Shared service-to-service key — notifications-backend calls /internal/* with
    // header `X-Internal-Key`. Unset disables the internal routes.
    INTERNAL_API_KEY: z.string().optional(),
  }),
);

export type Env = typeof env;

export const isDev = env.NODE_ENV === "development";
export const REFRESH_COOKIE = "outegro_refresh";
