import { randomUUID } from "node:crypto";
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Passkey } from "@outegro/contracts";
import {
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  generateAuthenticationOptions,
  generateRegistrationOptions,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type WebAuthnCredential,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { and, eq } from "drizzle-orm";
import type Redis from "ioredis";
import { AuthService, type PublicUser, type ReqMeta } from "../auth/auth.service";
import { env } from "../config";
import { type AuthDb, DB } from "../db/db.module";
import { users, webauthnCredentials } from "../db/schema";
import { REDIS } from "../redis/redis.module";

const CHALLENGE_TTL = 300; // 5 minutes

function toTransports(raw: string | null): AuthenticatorTransportFuture[] | undefined {
  return raw ? (JSON.parse(raw) as AuthenticatorTransportFuture[]) : undefined;
}

@Injectable()
export class PasskeysService {
  constructor(
    @Inject(DB) private readonly db: AuthDb,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly auth: AuthService,
  ) {}

  /** Step 1 of registration: options for navigator.credentials.create(). */
  async registrationOptions(
    userId: string,
    email: string,
  ): Promise<PublicKeyCredentialCreationOptionsJSON> {
    const existing = await this.db
      .select({
        credentialId: webauthnCredentials.credentialId,
        transports: webauthnCredentials.transports,
      })
      .from(webauthnCredentials)
      .where(eq(webauthnCredentials.userId, userId));

    const options = await generateRegistrationOptions({
      rpName: env.WEBAUTHN_RP_NAME,
      rpID: env.WEBAUTHN_RP_ID,
      userID: new TextEncoder().encode(userId),
      userName: email,
      attestationType: "none",
      excludeCredentials: existing.map((c) => ({
        id: c.credentialId,
        transports: toTransports(c.transports),
      })),
      authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
    });

    await this.redis.set(`webauthn:reg:${userId}`, options.challenge, "EX", CHALLENGE_TTL);
    return options;
  }

  /** Step 2 of registration: verify the browser's response and persist the credential. */
  async registrationVerify(
    userId: string,
    response: RegistrationResponseJSON,
    name?: string,
  ): Promise<void> {
    const expectedChallenge = await this.redis.get(`webauthn:reg:${userId}`);
    if (!expectedChallenge) throw new UnauthorizedException("Registration challenge expired");

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: env.WEBAUTHN_RP_ORIGIN,
      expectedRPID: env.WEBAUTHN_RP_ID,
    });
    await this.redis.del(`webauthn:reg:${userId}`);
    if (!verification.verified || !verification.registrationInfo) {
      throw new UnauthorizedException("Passkey registration verification failed");
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
    await this.db.insert(webauthnCredentials).values({
      userId,
      credentialId: credential.id,
      publicKey: isoBase64URL.fromBuffer(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports ? JSON.stringify(credential.transports) : null,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      name: name ?? null,
    });
  }

  async list(userId: string): Promise<Passkey[]> {
    const rows = await this.db
      .select({
        id: webauthnCredentials.id,
        name: webauthnCredentials.name,
        createdAt: webauthnCredentials.createdAt,
        lastUsedAt: webauthnCredentials.lastUsedAt,
      })
      .from(webauthnCredentials)
      .where(eq(webauthnCredentials.userId, userId));
    return rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      lastUsedAt: r.lastUsedAt ? r.lastUsedAt.toISOString() : null,
    }));
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.db
      .delete(webauthnCredentials)
      .where(and(eq(webauthnCredentials.id, id), eq(webauthnCredentials.userId, userId)));
  }

  /** Step 1 of authentication (login): discoverable-credential options. */
  async authenticationOptions(): Promise<{
    challengeId: string;
    options: PublicKeyCredentialRequestOptionsJSON;
  }> {
    const options = await generateAuthenticationOptions({
      rpID: env.WEBAUTHN_RP_ID,
      userVerification: "preferred",
    });
    const challengeId = randomUUID();
    await this.redis.set(`webauthn:auth:${challengeId}`, options.challenge, "EX", CHALLENGE_TTL);
    return { challengeId, options };
  }

  /** Step 2 of authentication: verify + issue a session, same shape as email login. */
  async authenticationVerify(
    challengeId: string,
    response: AuthenticationResponseJSON,
    meta: ReqMeta,
  ): Promise<{ accessToken: string; expiresIn: number; refreshToken: string; user: PublicUser }> {
    const expectedChallenge = await this.redis.get(`webauthn:auth:${challengeId}`);
    if (!expectedChallenge) throw new UnauthorizedException("Authentication challenge expired");

    const [stored] = await this.db
      .select()
      .from(webauthnCredentials)
      .where(eq(webauthnCredentials.credentialId, response.id))
      .limit(1);
    if (!stored) throw new UnauthorizedException("Unknown passkey");

    const credential: WebAuthnCredential = {
      id: stored.credentialId,
      publicKey: isoBase64URL.toBuffer(stored.publicKey),
      counter: stored.counter,
      transports: toTransports(stored.transports),
    };

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: env.WEBAUTHN_RP_ORIGIN,
      expectedRPID: env.WEBAUTHN_RP_ID,
      credential,
    });
    await this.redis.del(`webauthn:auth:${challengeId}`);
    if (!verification.verified) throw new UnauthorizedException("Passkey verification failed");

    await this.db
      .update(webauthnCredentials)
      .set({ counter: verification.authenticationInfo.newCounter, lastUsedAt: new Date() })
      .where(eq(webauthnCredentials.id, stored.id));

    const [user] = await this.db.select().from(users).where(eq(users.id, stored.userId)).limit(1);
    if (!user) throw new UnauthorizedException("User not found");

    return this.auth.startSession(user.id, user.email, meta);
  }
}
