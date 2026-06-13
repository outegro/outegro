import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { createLogger } from "@outegro/core";
import type Redis from "ioredis";
import { createRemoteJWKSet, type JWTPayload, jwtVerify } from "jose";
import { env } from "../config";
import { REDIS } from "../redis/redis.module";

const logger = createLogger({ service: "auth-backend" });

const STATE_TTL = 600; // 10 minutes
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUER = "https://accounts.google.com";

interface OAuthState {
  codeVerifier: string;
  linkUserId?: string;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
}

function base64url(buf: Buffer): string {
  return buf.toString("base64url");
}

const googleJwks = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));

@Injectable()
export class GoogleService {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  get enabled(): boolean {
    return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  }

  /** Build the redirect URL to Google's consent screen and persist PKCE/state in Redis. */
  async authorizationUrl(linkUserId?: string): Promise<string> {
    const codeVerifier = base64url(randomBytes(32));
    const codeChallenge = base64url(createHash("sha256").update(codeVerifier).digest());
    const state = randomUUID();

    const data: OAuthState = { codeVerifier, ...(linkUserId ? { linkUserId } : {}) };
    await this.redis.set(`google:oauth:${state}`, JSON.stringify(data), "EX", STATE_TTL);

    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID ?? "",
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      response_type: "code",
      scope: "openid email",
      state,
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });
    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  /** Consume the state, exchange the code, and verify the id_token. */
  async handleCallback(
    code: string,
    state: string,
  ): Promise<{ profile: GoogleProfile; linkUserId?: string }> {
    const raw = await this.redis.get(`google:oauth:${state}`);
    if (!raw) throw new UnauthorizedException("OAuth state expired");
    await this.redis.del(`google:oauth:${state}`);
    const { codeVerifier, linkUserId } = JSON.parse(raw) as OAuthState;

    const body = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID ?? "",
      client_secret: env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
      code,
      code_verifier: codeVerifier,
    });
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) {
      logger.error("google token exchange failed", { status: res.status, body: await res.text() });
      throw new UnauthorizedException("Google token exchange failed");
    }
    const tokenResponse = (await res.json()) as { id_token?: string };
    if (!tokenResponse.id_token) throw new UnauthorizedException("Missing id_token from Google");

    const { payload } = await jwtVerify(tokenResponse.id_token, googleJwks, {
      issuer: GOOGLE_ISSUER,
      audience: env.GOOGLE_CLIENT_ID,
    });
    const profile = toProfile(payload);
    return { profile, linkUserId };
  }
}

function toProfile(payload: JWTPayload): GoogleProfile {
  const sub = payload.sub;
  const email = payload.email as string | undefined;
  if (!sub || !email) throw new UnauthorizedException("Google id_token missing sub/email");
  return { sub, email, emailVerified: Boolean(payload.email_verified) };
}
