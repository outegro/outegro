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
  UseGuards,
} from "@nestjs/common";
import type { AuthUser } from "@outegro/auth-client";
import {
  type PasskeysList,
  passkeyAuthenticationVerifySchema,
  webauthnCredentialResponseSchema,
} from "@outegro/contracts";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import type { Request, Response } from "express";
import { CurrentUser } from "../common/current-user.decorator";
import { JwtAuthGuard } from "../common/jwt-auth.guard";
import { parseBody } from "../common/zod";
import { env, isDev, REFRESH_COOKIE } from "../config";
import { PasskeysService } from "./passkeys.service";

function metaFrom(req: Request): {
  ip?: string;
  userAgent?: string;
  country?: string;
  city?: string;
} {
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

@Controller("auth/passkeys")
export class PasskeysController {
  constructor(private readonly passkeys: PasskeysService) {}

  /** Step 1 of registration — requires an existing session. */
  @UseGuards(JwtAuthGuard)
  @Post("registration/options")
  async registrationOptions(@CurrentUser() user: AuthUser) {
    if (!user.email) throw new Error("Token has no email");
    return this.passkeys.registrationOptions(user.sub, user.email);
  }

  /** Step 2 of registration — persists the new credential. */
  @UseGuards(JwtAuthGuard)
  @Post("registration/verify")
  @HttpCode(201)
  async registrationVerify(
    @CurrentUser() user: AuthUser,
    @Body() body: unknown,
  ): Promise<{ ok: true }> {
    const response = parseBody(
      webauthnCredentialResponseSchema,
      body,
    ) as unknown as RegistrationResponseJSON;
    await this.passkeys.registrationVerify(user.sub, response);
    return { ok: true };
  }

  /** List the current user's registered passkeys. */
  @UseGuards(JwtAuthGuard)
  @Get()
  async list(@CurrentUser() user: AuthUser): Promise<PasskeysList> {
    return { passkeys: await this.passkeys.list(user.sub) };
  }

  /** Remove a registered passkey. */
  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  @HttpCode(204)
  async remove(@CurrentUser() user: AuthUser, @Param("id") id: string): Promise<void> {
    await this.passkeys.remove(user.sub, id);
  }

  /** Step 1 of login — no session required (discoverable credentials). */
  @Post("authentication/options")
  async authenticationOptions() {
    return this.passkeys.authenticationOptions();
  }

  /** Step 2 of login — verifies the passkey and issues a session, like email login. */
  @Post("authentication/verify")
  async authenticationVerify(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { challengeId, credential } = parseBody(passkeyAuthenticationVerifySchema, body);
    const result = await this.passkeys.authenticationVerify(
      challengeId,
      credential as unknown as AuthenticationResponseJSON,
      metaFrom(req),
    );
    setRefreshCookie(res, result.refreshToken);
    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
      tokenType: "Bearer" as const,
      user: result.user,
    };
  }
}
