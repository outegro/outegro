import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { Module } from "@nestjs/common";
import { Exchanges } from "@outegro/events";
import { env } from "./config";
import { DbModule } from "./db/db.module";
import { HealthController } from "./health.controller";
import { NotifyModule } from "./notify/notify.module";

@Module({
  imports: [
    DbModule,
    RabbitMQModule.forRoot({
      uri: env.RABBITMQ_URL,
      exchanges: [
        { name: Exchanges.Notify, type: "topic" },
        { name: "notify.dlx", type: "topic" },
      ],
      connectionInitOptions: { wait: false },
    }),
    NotifyModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
