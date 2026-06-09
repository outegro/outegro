import { Controller, Get, Inject } from "@nestjs/common";
import { pingDb } from "@outegro/db";
import type Redis from "ioredis";
import type { Sql } from "postgres";
import { PG_SQL } from "./db/db.module";
import { REDIS } from "./redis/redis.module";

const SERVICE = "auth-backend";

@Controller()
export class HealthController {
  constructor(
    @Inject(PG_SQL) private readonly sql: Sql,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  @Get("health")
  health(): { ok: true; service: string } {
    return { ok: true, service: SERVICE };
  }

  @Get("health/deep")
  async deep() {
    const database = (await pingDb({ sql: this.sql })) ? "up" : "down";
    let cache: "up" | "down" = "down";
    try {
      cache = (await this.redis.ping()) === "PONG" ? "up" : "down";
    } catch {
      cache = "down";
    }
    return {
      ok: database === "up" && cache === "up",
      service: SERVICE,
      checks: { database, redis: cache },
    };
  }
}
