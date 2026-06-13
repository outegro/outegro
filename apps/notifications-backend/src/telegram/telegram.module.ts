import { Module } from "@nestjs/common";
import { TelegramProvider } from "../providers/telegram.provider";
import { MeTelegramController } from "./me-telegram.controller";
import { TelegramLinkService } from "./telegram-link.service";
import { TelegramWebhookController } from "./telegram-webhook.controller";

// DB is provided by the global DbModule.
@Module({
  controllers: [TelegramWebhookController, MeTelegramController],
  providers: [TelegramLinkService, TelegramProvider],
})
export class TelegramModule {}
