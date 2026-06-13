import { Module } from "@nestjs/common";
import { TokensModule } from "../tokens/tokens.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { RateLimitService } from "./rate-limit.service";

@Module({
  imports: [TokensModule],
  controllers: [AuthController],
  providers: [AuthService, RateLimitService],
  exports: [AuthService],
})
export class AuthModule {}
