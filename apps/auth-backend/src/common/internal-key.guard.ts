import { type CanActivate, type ExecutionContext, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { env } from "../config";

/**
 * Shared-secret guard for /internal/* service-to-service routes (e.g.
 * notifications-backend resolving a Telegram link nonce). These paths are
 * reachable on api.outegro.com, so the key is what keeps them private.
 * Unset INTERNAL_API_KEY disables them.
 */
@Injectable()
export class InternalKeyGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    if (!env.INTERNAL_API_KEY) return false;
    const req = ctx.switchToHttp().getRequest<Request>();
    return req.headers["x-internal-key"] === env.INTERNAL_API_KEY;
  }
}
