import { BadRequestException } from "@nestjs/common";
import type { z } from "@outegro/contracts";

/** Parse a request body against a Zod schema, mapping failures to HTTP 400. */
export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new BadRequestException(
      result.error.issues.map((i) => `${i.path.join(".") || "(body)"}: ${i.message}`),
    );
  }
  return result.data;
}
