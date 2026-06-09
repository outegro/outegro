import { Global, Module, type OnApplicationShutdown } from "@nestjs/common";
import Redis from "ioredis";
import { env } from "../config";

export const REDIS = Symbol("REDIS");

const client = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

@Global()
@Module({
  providers: [{ provide: REDIS, useValue: client }],
  exports: [REDIS],
})
export class RedisModule implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    await client.quit();
  }
}
