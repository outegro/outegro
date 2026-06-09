import { Controller, Get } from "@nestjs/common";
import type { JWK } from "jose";
import { TokensService } from "./tokens.service";

@Controller(".well-known")
export class JwksController {
  constructor(private readonly tokens: TokensService) {}

  /** Public keys for verifying access tokens (OIDC-style JWKS). */
  @Get("jwks.json")
  jwks(): { keys: JWK[] } {
    return this.tokens.jwks();
  }
}
