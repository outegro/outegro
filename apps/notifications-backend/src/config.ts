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
  }),
);

export type Env = typeof env;
