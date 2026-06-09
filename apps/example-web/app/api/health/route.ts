import type { HealthResponse } from "@outegro/contracts";

export const dynamic = "force-static";

export function GET(): Response {
  const body: HealthResponse = { ok: true, service: "example-web" };
  return Response.json(body);
}
