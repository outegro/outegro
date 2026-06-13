import { Inject, Injectable, type OnApplicationBootstrap } from "@nestjs/common";
import { createLogger } from "@outegro/core";
import { eq } from "drizzle-orm";
import { env } from "../config";
import { DB, type NotifyDb } from "../db/db.module";
import { telegramLinks } from "../db/schema";

const logger = createLogger({ service: "notifications-backend" });

@Injectable()
export class TelegramLinkService implements OnApplicationBootstrap {
  constructor(@Inject(DB) private readonly db: NotifyDb) {}

  /** Register the inbound webhook with Telegram once the app is up (idempotent). */
  async onApplicationBootstrap(): Promise<void> {
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_WEBHOOK_URL || !env.TELEGRAM_WEBHOOK_SECRET) {
      logger.info("telegram webhook not configured — skipping setWebhook");
      return;
    }
    try {
      const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: env.TELEGRAM_WEBHOOK_URL,
          secret_token: env.TELEGRAM_WEBHOOK_SECRET,
          allowed_updates: ["message"],
        }),
      });
      const data = (await res.json()) as { ok?: boolean; description?: string };
      if (data.ok) logger.info("telegram webhook registered", { url: env.TELEGRAM_WEBHOOK_URL });
      else logger.error("setWebhook failed", { description: data.description });
    } catch (error) {
      logger.error("setWebhook error", { error: String(error) });
    }
  }

  /** Exchange a /start nonce for its userId via auth-backend's internal route. */
  async consumeNonce(nonce: string): Promise<string | null> {
    if (!env.INTERNAL_API_KEY) return null;
    try {
      const res = await fetch(`${env.AUTH_INTERNAL_URL}/internal/telegram/consume`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-internal-key": env.INTERNAL_API_KEY },
        body: JSON.stringify({ token: nonce }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { userId?: string };
      return data.userId ?? null;
    } catch (error) {
      logger.error("consume nonce failed", { error: String(error) });
      return null;
    }
  }

  async link(userId: string, chatId: string): Promise<void> {
    await this.db
      .insert(telegramLinks)
      .values({ userId, chatId })
      .onConflictDoUpdate({ target: telegramLinks.userId, set: { chatId } });
  }

  async isLinked(userId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ userId: telegramLinks.userId })
      .from(telegramLinks)
      .where(eq(telegramLinks.userId, userId))
      .limit(1);
    return Boolean(row);
  }

  async unlink(userId: string): Promise<void> {
    await this.db.delete(telegramLinks).where(eq(telegramLinks.userId, userId));
  }
}
