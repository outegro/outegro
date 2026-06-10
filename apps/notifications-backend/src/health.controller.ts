import { Controller, Get, Inject } from "@nestjs/common";
import { pingDb } from "@outegro/db";
import type { Sql } from "postgres";
import { PG_SQL } from "./db/db.module";

const SERVICE = "notifications-backend";

@Controller()
export class HealthController {
  constructor(@Inject(PG_SQL) private readonly sql: Sql) {}

  @Get("health")
  health(): { ok: true; service: string } {
    return { ok: true, service: SERVICE };
  }

  @Get("health/deep")
  async deep() {
    const database = (await pingDb({ sql: this.sql })) ? "up" : "down";
    return { ok: database === "up", service: SERVICE, checks: { database } };
  }
}
