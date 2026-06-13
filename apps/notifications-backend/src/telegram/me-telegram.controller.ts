import { Controller, Delete, Get, HttpCode, UseGuards } from "@nestjs/common";
import type { AuthUser } from "@outegro/auth-client";
import type { TelegramLinkStatus } from "@outegro/contracts";
import { CurrentUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { TelegramLinkService } from "./telegram-link.service";

@Controller("me/telegram")
@UseGuards(JwtAuthGuard)
export class MeTelegramController {
  constructor(private readonly links: TelegramLinkService) {}

  @Get()
  async status(@CurrentUser() user: AuthUser): Promise<TelegramLinkStatus> {
    return { linked: await this.links.isLinked(user.sub) };
  }

  @Delete()
  @HttpCode(204)
  async unlink(@CurrentUser() user: AuthUser): Promise<void> {
    await this.links.unlink(user.sub);
  }
}
