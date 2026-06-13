import { Module } from "@nestjs/common";
import { TelegramController } from "./telegram.controller";
import { TelegramService } from "./telegram.service";

// REDIS is provided by the global RedisModule.
@Module({
  controllers: [TelegramController],
  providers: [TelegramService],
})
export class TelegramModule {}
