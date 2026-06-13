import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { type AuthClient, createAuthClient } from "@outegro/auth-client";
import type { Request } from "express";
import { env } from "../config";

/**
 * Verifies user JWTs against auth-backend's JWKS (in-cluster), exactly like
 * every other service — used by the authed /me/telegram routes.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly client: AuthClient = createAuthClient({
    jwksUrl: env.JWKS_URL,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  });

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<Request & { user?: unknown }>();
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw new UnauthorizedException();
    try {
      req.user = await this.client.verify(header.slice(7));
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
