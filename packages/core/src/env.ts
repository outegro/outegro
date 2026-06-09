import { z } from "zod";

/**
 * Validate `process.env` (or any source) against a Zod schema.
 * Fails fast with a readable error listing every offending key — we never
 * boot a service with half-configured env.
 */
export function loadEnv<T extends z.ZodType>(schema: T, source: unknown = process.env): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return result.data;
}
