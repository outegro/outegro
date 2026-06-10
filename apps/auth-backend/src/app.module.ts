import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { Module } from "@nestjs/common";
import { Exchanges } from "@outegro/events";
import { AuthModule } from "./auth/auth.module";
import { env } from "./config";
import { DbModule } from "./db/db.module";
import { HealthController } from "./health.controller";
import { RedisModule } from "./redis/redis.module";
import { TokensModule } from "./tokens/tokens.module";

// RabbitMQ is optional — auth boots & logs codes even without it (dev/degraded).
// `global: true` makes AmqpConnection injectable in feature modules (AuthModule).
const messaging = env.RABBITMQ_URL
  ? [
      {
        ...RabbitMQModule.forRoot({
          uri: env.RABBITMQ_URL,
          exchanges: [{ name: Exchanges.Notify, type: "topic" }],
          connectionInitOptions: { wait: false },
        }),
        global: true,
      },
    ]
  : [];

@Module({
  imports: [DbModule, RedisModule, TokensModule, AuthModule, ...messaging],
  controllers: [HealthController],
})
export class AppModule {}
