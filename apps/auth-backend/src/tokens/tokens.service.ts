import { randomBytes } from "node:crypto";
import { Inject, Injectable, type OnModuleInit } from "@nestjs/common";
import type Redis from "ioredis";
import {
  calculateJwkThumbprint,
  exportJWK,
  generateKeyPair,
  importPKCS8,
  type JWK,
  type KeyLike,
  SignJWT,
} from "jose";
import { env } from "../config";
import { REDIS } from "../redis/redis.module";

const ALG = "ES256";

export interface RefreshData {
  sessionId: string;
  userId: string;
}

@Injectable()
export class TokensService implements OnModuleInit {
  private privateKey!: KeyLike;
  private publicJwk!: JWK;
  private kid!: string;

  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async onModuleInit(): Promise<void> {
    if (env.JWT_PRIVATE_KEY) {
      this.privateKey = await importPKCS8(env.JWT_PRIVATE_KEY, ALG, { extractable: true });
    } else {
      const { privateKey } = await generateKeyPair(ALG, { extractable: true });
      this.privateKey = privateKey;
    }
    const jwk = await exportJWK(this.privateKey);
    const publicOnly: JWK = { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y };
    this.kid = await calculateJwkThumbprint(publicOnly);
    this.publicJwk = { ...publicOnly, kid: this.kid, use: "sig", alg: ALG };
  }

  jwks(): { keys: JWK[] } {
    return { keys: [this.publicJwk] };
  }

  async signAccess(
    userId: string,
    sessionId: string,
    email: string,
    roles: string[],
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const accessToken = await new SignJWT({ sid: sessionId, email, roles })
      .setProtectedHeader({ alg: ALG, kid: this.kid })
      .setSubject(userId)
      .setIssuer(env.JWT_ISSUER)
      .setAudience(env.JWT_AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(`${env.ACCESS_TTL}s`)
      .sign(this.privateKey);
    return { accessToken, expiresIn: env.ACCESS_TTL };
  }

  // --- Rotating refresh tokens (opaque, stored revocably in Redis) ---

  private newToken(): string {
    return randomBytes(32).toString("hex");
  }

  async issueRefresh(sessionId: string, userId: string): Promise<string> {
    const token = this.newToken();
    const data: RefreshData = { sessionId, userId };
    await this.redis.set(`refresh:${token}`, JSON.stringify(data), "EX", env.REFRESH_TTL);
    await this.redis.set(`sessrt:${sessionId}`, token, "EX", env.REFRESH_TTL);
    return token;
  }

  /** Validate + rotate. Returns the new token + identity, or null if invalid. */
  async rotateRefresh(
    oldToken: string,
  ): Promise<{ token: string; sessionId: string; userId: string } | null> {
    const raw = await this.redis.get(`refresh:${oldToken}`);
    if (!raw) return null;
    const data = JSON.parse(raw) as RefreshData;

    // Reuse detection: if the presented token isn't the session's current one,
    // someone replayed a rotated token — revoke the whole session.
    const current = await this.redis.get(`sessrt:${data.sessionId}`);
    if (current !== oldToken) {
      await this.revokeSession(data.sessionId);
      return null;
    }

    await this.redis.del(`refresh:${oldToken}`);
    const token = this.newToken();
    await this.redis.set(`refresh:${token}`, JSON.stringify(data), "EX", env.REFRESH_TTL);
    await this.redis.set(`sessrt:${data.sessionId}`, token, "EX", env.REFRESH_TTL);
    return { token, sessionId: data.sessionId, userId: data.userId };
  }

  async readRefresh(token: string): Promise<RefreshData | null> {
    const raw = await this.redis.get(`refresh:${token}`);
    return raw ? (JSON.parse(raw) as RefreshData) : null;
  }

  async revokeSession(sessionId: string): Promise<void> {
    const token = await this.redis.get(`sessrt:${sessionId}`);
    if (token) await this.redis.del(`refresh:${token}`);
    await this.redis.del(`sessrt:${sessionId}`);
  }
}
