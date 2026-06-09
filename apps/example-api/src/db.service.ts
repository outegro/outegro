import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { createDb, type DbHandle, pingDb } from "@outegro/db";
import { env } from "./config";

/**
 * Thin DB lifecycle wrapper. A real service defines its own Drizzle schema and
 * passes it to `createDb`; here we just hold the connection for health checks.
 */
@Injectable()
export class DbService implements OnModuleDestroy {
  private readonly handle: DbHandle | null = env.DATABASE_URL ? createDb(env.DATABASE_URL) : null;

  get enabled(): boolean {
    return this.handle !== null;
  }

  async ping(): Promise<boolean> {
    return this.handle ? pingDb(this.handle) : false;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.handle) await this.handle.close();
  }
}
