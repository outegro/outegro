import { type CanActivate, type ExecutionContext, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { env } from "../config";

/**
 * Simple shared-secret guard for /admin/* routes. Manual entitlement grants
 * are a stopgap until `payment-backend` (Ch9) becomes the source of truth —
 * this is intentionally minimal. Unset ADMIN_API_KEY disables the routes.
 */
@Injectable()
export class AdminKeyGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    if (!env.ADMIN_API_KEY) return false;
    const req = ctx.switchToHttp().getRequest<Request>();
    const key = req.headers["x-admin-key"];
    return key === env.ADMIN_API_KEY;
  }
}
