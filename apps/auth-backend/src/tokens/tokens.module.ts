import { Module } from "@nestjs/common";
import { JwksController } from "./jwks.controller";
import { TokensService } from "./tokens.service";

@Module({
  controllers: [JwksController],
  providers: [TokensService],
  exports: [TokensService],
})
export class TokensModule {}
