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
 * Authenticates requests using the SHARED @outegro/auth-client against this
 * service's own JWKS — exactly how every other backend will verify tokens
 * (they point jwksUrl at https://api.outegro.com/.well-known/jwks.json).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly client: AuthClient = createAuthClient({
    jwksUrl: `http://127.0.0.1:${env.PORT}/.well-known/jwks.json`,
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
