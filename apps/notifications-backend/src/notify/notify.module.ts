import { Module } from "@nestjs/common";
import { EmailProvider } from "../providers/email.provider";
import { TelegramProvider } from "../providers/telegram.provider";
import { DeliveryService } from "./delivery.service";
import { NotifyConsumer } from "./notify.consumer";

@Module({
  providers: [NotifyConsumer, DeliveryService, EmailProvider, TelegramProvider],
})
export class NotifyModule {}
