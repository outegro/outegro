import { Inject, Injectable } from "@nestjs/common";
import type Redis from "ioredis";
import { REDIS } from "../redis/redis.module";

@Injectable()
export class RateLimitService {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  /** Fixed-window counter. Returns true while under the limit. */
  async allow(key: string, limit: number, windowSec: number): Promise<boolean> {
    const k = `rl:${key}`;
    const n = await this.redis.incr(k);
    if (n === 1) await this.redis.expire(k, windowSec);
    return n <= limit;
  }
}
