import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { GoogleController } from "./google.controller";
import { GoogleService } from "./google.service";

@Module({
  imports: [AuthModule],
  controllers: [GoogleController],
  providers: [GoogleService],
})
export class GoogleModule {}
