import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import type { AuthUser } from "@outegro/auth-client";
import {
  type EntitlementsResponse,
  loginRequestSchema,
  loginVerifySchema,
  type SessionsList,
} from "@outegro/contracts";
import type { Request, Response } from "express";
import { CurrentUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { parseBody } from "../common/zod";
import { env, isDev, REFRESH_COOKIE } from "../config";
import { AuthService, type ReqMeta } from "./auth.service";

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

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Request a one-time login code by email. */
  @Post("email/request")
  @HttpCode(202)
  async request(@Body() body: unknown, @Req() req: Request): Promise<{ ok: true }> {
    const { email } = parseBody(loginRequestSchema, body);
    await this.auth.requestCode(email, metaFrom(req));
    return { ok: true };
  }

  /** Redeem the code → create session, issue access token + set refresh cookie. */
  @Post("email/verify")
  async verify(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { email, code } = parseBody(loginVerifySchema, body);
    const result = await this.auth.verifyCode(email, code, metaFrom(req));
    setRefreshCookie(res, result.refreshToken);
    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      tokenType: "Bearer" as const,
      user: result.user,
    };
  }

  /** Rotate the refresh cookie → new access token. */
  @Post("refresh")
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw new UnauthorizedException();
    const result = await this.auth.refresh(token, metaFrom(req));
    setRefreshCookie(res, result.refreshToken);
    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      tokenType: "Bearer" as const,
    };
  }

  @Post("logout")
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (token) await this.auth.logout(token);
    res.clearCookie(REFRESH_COOKIE, { domain: env.COOKIE_DOMAIN, path: "/" });
  }

  /** Protected — verified via the shared @outegro/auth-client (JWKS). */
  @UseGuards(JwtAuthGuard)
  @Get("me")
  async me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.sub);
  }

  /**
   * Authoritative entitlements for the current user — other services should
   * call this (or trust fresh token claims) rather than maintain their own
   * role store (contract §10 point 5).
   */
  @UseGuards(JwtAuthGuard)
  @Get("entitlements")
  async entitlements(@CurrentUser() user: AuthUser): Promise<EntitlementsResponse> {
    return { entitlements: await this.auth.getEntitlements(user.sub) };
  }

  /** List active sessions, marking the one the request is authenticated with. */
  @UseGuards(JwtAuthGuard)
  @Get("sessions")
  async sessions(@CurrentUser() user: AuthUser): Promise<SessionsList> {
    return { sessions: await this.auth.listSessions(user.sub, currentSessionId(user)) };
  }

  /** Terminate one session (revokes its refresh token; security alert if not the current one). */
  @UseGuards(JwtAuthGuard)
  @Delete("sessions/:id")
  @HttpCode(204)
  async terminateSession(@CurrentUser() user: AuthUser, @Param("id") id: string): Promise<void> {
    await this.auth.terminateSession(user.sub, id, currentSessionId(user));
  }

  /** "Log out everywhere else" — terminate every session but the current one. */
  @UseGuards(JwtAuthGuard)
  @Post("sessions/revoke-others")
  async revokeOthers(@CurrentUser() user: AuthUser): Promise<{ revoked: number }> {
    return { revoked: await this.auth.terminateOtherSessions(user.sub, currentSessionId(user)) };
  }
}

function currentSessionId(user: AuthUser): string {
  if (!user.sid) throw new UnauthorizedException("Token has no session id");
  return user.sid;
}
