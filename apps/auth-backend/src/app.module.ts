import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { DbModule } from "./db/db.module";
import { HealthController } from "./health.controller";
import { RedisModule } from "./redis/redis.module";
import { TokensModule } from "./tokens/tokens.module";

@Module({
  imports: [DbModule, RedisModule, TokensModule, AuthModule],
  controllers: [HealthController],
})
export class AppModule {}
