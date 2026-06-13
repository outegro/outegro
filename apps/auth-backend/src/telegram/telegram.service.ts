import { randomBytes } from "node:crypto";
import { Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { TelegramLinkTokenResponse } from "@outegro/contracts";
import type Redis from "ioredis";
import { env } from "../config";
import { REDIS } from "../redis/redis.module";

const KEY = (nonce: string) => `tg:link:${nonce}`;

@Injectable()
export class TelegramService {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  get enabled(): boolean {
    return Boolean(env.TELEGRAM_BOT_USERNAME);
  }

  /** Mint a one-time nonce (userId stashed in Redis) and return the bot deep-link. */
  async createLinkToken(userId: string): Promise<TelegramLinkTokenResponse> {
    if (!this.enabled) throw new ServiceUnavailableException("Telegram linking is not configured");
    const nonce = randomBytes(24).toString("base64url");
    await this.redis.set(KEY(nonce), userId, "EX", env.TELEGRAM_LINK_TTL);
    return {
      url: `https://t.me/${env.TELEGRAM_BOT_USERNAME}?start=${nonce}`,
      expiresIn: env.TELEGRAM_LINK_TTL,
    };
  }

  /** Resolve + consume a nonce (single use). Returns the userId, or null if unknown/expired. */
  async consumeLinkToken(nonce: string): Promise<string | null> {
    const userId = await this.redis.get(KEY(nonce));
    if (!userId) return null;
    await this.redis.del(KEY(nonce));
    return userId;
  }
}
