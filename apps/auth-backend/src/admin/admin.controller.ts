import { Body, Controller, Delete, HttpCode, Param, Post, UseGuards } from "@nestjs/common";
import { grantEntitlementSchema } from "@outegro/contracts";
import { AuthService } from "../auth/auth.service";
import { parseBody } from "../common/zod";
import { AdminKeyGuard } from "./admin-key.guard";

/** Manual entitlement administration — see AdminKeyGuard. */
@UseGuards(AdminKeyGuard)
@Controller("admin/entitlements")
export class AdminController {
  constructor(private readonly auth: AuthService) {}

  @Post()
  @HttpCode(201)
  async grant(@Body() body: unknown): Promise<{ ok: true }> {
    const input = parseBody(grantEntitlementSchema, body);
    await this.auth.grantEntitlement(input);
    return { ok: true };
  }

  @Delete(":id")
  @HttpCode(204)
  async revoke(@Param("id") id: string): Promise<void> {
    await this.auth.revokeEntitlement(id);
  }
}
