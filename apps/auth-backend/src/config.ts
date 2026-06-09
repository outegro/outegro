import { z } from "@outegro/contracts";
import { loadEnv } from "@outegro/core";

export const env = loadEnv(
  z.object({
    NODE_ENV: z.string().default("production"),
    PORT: z.coerce.number().default(3000),
    CORS_ORIGIN: z.string().default("http://localhost:3000"),

    DATABASE_URL: z.string(),
    REDIS_URL: z.string(),

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
  }),
);

export type Env = typeof env;

export const isDev = env.NODE_ENV === "development";
export const REFRESH_COOKIE = "outegro_refresh";
