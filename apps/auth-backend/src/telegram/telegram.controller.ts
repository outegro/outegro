import { Body, Controller, NotFoundException, Post, UseGuards } from "@nestjs/common";
import type { AuthUser } from "@outegro/auth-client";
import type { TelegramLinkTokenResponse } from "@outegro/contracts";
import { CurrentUser } from "../common/current-user.decorator";
import { InternalKeyGuard } from "../common/internal-key.guard";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { TelegramService } from "./telegram.service";

@Controller()
export class TelegramController {
  constructor(private readonly telegram: TelegramService) {}

  /** Logged-in user requests a deep-link to connect their Telegram. */
  @UseGuards(JwtAuthGuard)
  @Post("auth/telegram/link-token")
  async linkToken(@CurrentUser() user: AuthUser): Promise<TelegramLinkTokenResponse> {
    return this.telegram.createLinkToken(user.sub);
  }

  /**
   * Service-to-service: notifications-backend exchanges a /start nonce for the
   * userId it should write into telegram_links. Guarded by the shared key.
   */
  @UseGuards(InternalKeyGuard)
  @Post("internal/telegram/consume")
  async consume(@Body("token") token: string): Promise<{ userId: string }> {
    const userId = token ? await this.telegram.consumeLinkToken(token) : null;
    if (!userId) throw new NotFoundException("Unknown or expired token");
    return { userId };
  }
}
