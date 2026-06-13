import { z } from "@outegro/contracts";
import { loadEnv } from "@outegro/core";

export const env = loadEnv(
  z.object({
    NODE_ENV: z.string().default("production"),
    PORT: z.coerce.number().default(3000),

    DATABASE_URL: z.string(),
    RABBITMQ_URL: z.string(),

    // Providers. If a key is absent, that channel logs instead of sending (dev).
    RESEND_API_KEY: z.string().optional(),
    RESEND_FROM: z.string().default("Outegro <noreply@outegro.com>"),
    TELEGRAM_BOT_TOKEN: z.string().optional(),

    // Telegram inbound webhook (bot /start linking). Unset disables the receiver.
    TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
    // Public URL Telegram should POST updates to; registered via setWebhook on boot.
    TELEGRAM_WEBHOOK_URL: z.string().optional(), // https://tg.outegro.com/telegram/webhook

    // Service-to-service call to auth-backend to resolve a /start link nonce.
    AUTH_INTERNAL_URL: z.string().default("http://auth-backend.platform.svc"),
    INTERNAL_API_KEY: z.string().optional(),

    // Verifying user JWTs for the authed /me/telegram routes (status + unlink).
    JWKS_URL: z.string().default("http://auth-backend.platform.svc/.well-known/jwks.json"),
    JWT_ISSUER: z.string().default("https://api.outegro.com"),
    JWT_AUDIENCE: z.string().default("outegro"),
  }),
);

export type Env = typeof env;
