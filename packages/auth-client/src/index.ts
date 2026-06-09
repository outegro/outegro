import { createRemoteJWKSet, type JWTPayload, jwtVerify } from "jose";

/**
 * Shared auth client: verifies Outegro JWTs against the auth service's JWKS.
 * Every backend uses this to authenticate requests — no shared secret, just
 * the public keys fetched (and cached) from the JWKS endpoint.
 */

export interface AuthUser {
  /** Subject — the user id. */
  sub: string;
  /** Session id this token belongs to. */
  sid?: string;
  /** Granted entitlements as `service:role` (e.g. `itmaxxing:pro`). */
  roles: string[];
  email?: string;
}

export interface AuthClientOptions {
  /** JWKS endpoint, e.g. https://api.outegro.com/.well-known/jwks.json */
  jwksUrl: string;
  issuer?: string;
  audience?: string;
}

export interface AuthClient {
  /** Verify a bearer token and return the authenticated user. Throws on invalid. */
  verify(token: string): Promise<AuthUser>;
}

function toAuthUser(payload: JWTPayload): AuthUser {
  return {
    sub: String(payload.sub ?? ""),
    sid: typeof payload.sid === "string" ? payload.sid : undefined,
    email: typeof payload.email === "string" ? payload.email : undefined,
    roles: Array.isArray(payload.roles) ? payload.roles.map(String) : [],
  };
}

export function createAuthClient(options: AuthClientOptions): AuthClient {
  // createRemoteJWKSet caches keys and refreshes on unknown `kid` (with cooldown).
  const jwks = createRemoteJWKSet(new URL(options.jwksUrl));
  return {
    async verify(token: string): Promise<AuthUser> {
      const { payload } = await jwtVerify(token, jwks, {
        issuer: options.issuer,
        audience: options.audience,
      });
      return toAuthUser(payload);
    },
  };
}
