import { Body, Controller, ForbiddenException, Headers, HttpCode, Post } from "@nestjs/common";
import { createLogger } from "@outegro/core";
import { env } from "../config";
import { TelegramProvider } from "../providers/telegram.provider";
import { TelegramLinkService } from "./telegram-link.service";

const logger = createLogger({ service: "notifications-backend" });

interface TelegramUpdate {
  message?: { text?: string; chat?: { id?: number | string } };
}

@Controller("telegram")
export class TelegramWebhookController {
  constructor(
    private readonly links: TelegramLinkService,
    private readonly telegram: TelegramProvider,
  ) {}

  /** Telegram posts bot updates here. Validated by the secret token header. */
  @Post("webhook")
  @HttpCode(200)
  async webhook(
    @Headers("x-telegram-bot-api-secret-token") secret: string | undefined,
    @Body() update: TelegramUpdate,
  ): Promise<{ ok: true }> {
    if (!env.TELEGRAM_WEBHOOK_SECRET || secret !== env.TELEGRAM_WEBHOOK_SECRET) {
      throw new ForbiddenException();
    }

    const chatId = update.message?.chat?.id;
    const nonce = /^\/start\s+(\S+)/.exec(update.message?.text ?? "")?.[1];
    if (nonce && chatId != null) {
      const userId = await this.links.consumeNonce(nonce);
      if (userId) {
        await this.links.link(userId, String(chatId));
        logger.info("telegram linked", { userId });
        await this.telegram
          .send(
            String(chatId),
            "✅ Telegram привязан к аккаунту Outegro. Сюда будут приходить уведомления.",
          )
          .catch((error) => logger.error("confirm message failed", { error: String(error) }));
      } else {
        await this.telegram
          .send(
            String(chatId),
            "Ссылка устарела или недействительна. Откройте «Привязать Telegram» в профиле ещё раз.",
          )
          .catch(() => {});
      }
    }
    return { ok: true };
  }
}
