import { Controller, Get } from "@nestjs/common";
import type { DeepHealthResponse, HealthResponse } from "@outegro/contracts";
import { DbService } from "./db.service";

const SERVICE = "example-api";

@Controller()
export class HealthController {
  constructor(private readonly db: DbService) {}

  /** Liveness/readiness — cheap, no dependencies. */
  @Get("health")
  health(): HealthResponse {
    return { ok: true, service: SERVICE };
  }

  /** Deep check — verifies downstream dependencies (DB). */
  @Get("health/deep")
  async deep(): Promise<DeepHealthResponse> {
    const database = this.db.enabled ? ((await this.db.ping()) ? "up" : "down") : "down";
    return {
      ok: database === "up",
      service: SERVICE,
      checks: { database },
    };
  }
}
