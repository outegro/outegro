import { Controller, Get, NotFoundException, Query, Req, Res, UseGuards } from "@nestjs/common";
import type { AuthUser } from "@outegro/auth-client";
import type { Request, Response } from "express";
import { AuthService, type ReqMeta } from "../auth/auth.service";
import { CurrentUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { env, isDev, REFRESH_COOKIE } from "../config";
import { GoogleService } from "./google.service";

function metaFrom(req: Request): ReqMeta {
  const h = req.headers;
  const xff = (h["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim();
  return {
    ip: (h["cf-connecting-ip"] as string | undefined) ?? xff ?? req.ip,
    userAgent: h["user-agent"],
    country: h["cf-ipcountry"] as string | undefined,
    city: h["cf-ipcity"] as string | undefined,
  };
}

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: !isDev,
    sameSite: "lax",
    domain: env.COOKIE_DOMAIN,
    path: "/",
    maxAge: env.REFRESH_TTL * 1000,
  });
}

@Controller("auth/google")
export class GoogleController {
  constructor(
    private readonly google: GoogleService,
    private readonly auth: AuthService,
  ) {}

  /** Start the login flow — redirects to Google's consent screen. */
  @Get("start")
  async start(@Res() res: Response): Promise<void> {
    if (!this.google.enabled) throw new NotFoundException();
    res.redirect(await this.google.authorizationUrl());
  }

  /** Start the account-linking flow for the current user. */
  @UseGuards(JwtAuthGuard)
  @Get("link")
  async link(@CurrentUser() user: AuthUser, @Res() res: Response): Promise<void> {
    if (!this.google.enabled) throw new NotFoundException();
    res.redirect(await this.google.authorizationUrl(user.sub));
  }

  /** Google redirects here with `code`/`state` after consent. */
  @Get("callback")
  async callback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (!this.google.enabled) throw new NotFoundException();
    const { profile, linkUserId } = await this.google.handleCallback(code, state);

    if (linkUserId) {
      await this.auth.linkGoogleIdentity(linkUserId, profile.sub);
      res.redirect(env.GOOGLE_SUCCESS_REDIRECT);
      return;
    }

    const user = await this.auth.findOrLinkGoogleUser(profile.sub, profile.email);
    const session = await this.auth.startSession(user.id, user.email, metaFrom(req));
    setRefreshCookie(res, session.refreshToken);
    res.redirect(env.GOOGLE_SUCCESS_REDIRECT);
  }
}
