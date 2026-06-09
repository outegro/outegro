import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

/**
 * Drizzle baseline. Each service owns its own database + schema
 * (database-per-service); this package only provides the connection factory
 * and small helpers so every service connects the same way.
 *
 * Queries are written by hand in each service with explicit columns/joins —
 * no lazy relations or implicit fetches (see CLAUDE.md hard rules).
 */

export interface CreateDbOptions {
  /** Max pool size. */
  max?: number;
  /** Statement/connection timeout in seconds. */
  idleTimeout?: number;
}

export interface DbHandle<TSchema extends Record<string, unknown> = Record<string, never>> {
  db: PostgresJsDatabase<TSchema>;
  sql: Sql;
  close: () => Promise<void>;
}

export function createDb<TSchema extends Record<string, unknown> = Record<string, never>>(
  connectionString: string,
  schema?: TSchema,
  options: CreateDbOptions = {},
): DbHandle<TSchema> {
  const sql = postgres(connectionString, {
    max: options.max ?? 10,
    idle_timeout: options.idleTimeout ?? 30,
    prepare: false,
  });
  const db = drizzle(sql, { schema }) as PostgresJsDatabase<TSchema>;
  return {
    db,
    sql,
    close: () => sql.end({ timeout: 5 }),
  };
}

/** Lightweight liveness check for readiness probes. */
export async function pingDb(handle: Pick<DbHandle, "sql">): Promise<boolean> {
  try {
    await handle.sql`select 1`;
    return true;
  } catch {
    return false;
  }
}

export type { PostgresJsDatabase, Sql };
