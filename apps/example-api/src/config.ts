import { z } from "@outegro/contracts";
import { loadEnv } from "@outegro/core";

export const env = loadEnv(
  z.object({
    PORT: z.coerce.number().default(3000),
    CORS_ORIGIN: z.string().default("http://localhost:3000"),
    DATABASE_URL: z.string().optional(),
  }),
);

export type Env = typeof env;
