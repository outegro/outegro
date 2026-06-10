import { Global, Module, type OnApplicationShutdown } from "@nestjs/common";
import { createDb } from "@outegro/db";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { Sql } from "postgres";
import { env } from "../config";
import { type Schema, schema } from "./schema";

export const DB = Symbol("DB");
export const PG_SQL = Symbol("PG_SQL");

export type NotifyDb = PostgresJsDatabase<Schema>;

const handle = createDb<Schema>(env.DATABASE_URL, schema);

@Global()
@Module({
  providers: [
    { provide: DB, useValue: handle.db },
    { provide: PG_SQL, useValue: handle.sql },
  ],
  exports: [DB, PG_SQL],
})
export class DbModule implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    await handle.close();
  }
}
