/**
 * Shared auth client: verifies Outegro JWTs (via JWKS) and exposes the
 * authenticated principal to services. The real JWKS verification lands in
 * Chapter 3 (auth foundations); this is the stable interface services code
 * against now.
 */

export interface AuthUser {
  /** Subject — the user id. */
  sub: string;
  /** Session id this token belongs to. */
  sid?: string;
  /** Granted roles / entitlements. */
  roles: string[];
  email?: string;
}

export interface AuthClientOptions {
  /** JWKS endpoint of the auth service, e.g. https://auth.outegro.com/.well-known/jwks.json */
  jwksUrl: string;
  issuer?: string;
  audience?: string;
}

export interface AuthClient {
  /** Verify a bearer token and return the authenticated user. */
  verify(token: string): Promise<AuthUser>;
}

class NotImplementedAuthClient implements AuthClient {
  constructor(private readonly options: AuthClientOptions) {}

  verify(_token: string): Promise<AuthUser> {
    return Promise.reject(
      new Error(
        `@outegro/auth-client: JWKS verification is implemented in Chapter 3 (jwksUrl=${this.options.jwksUrl})`,
      ),
    );
  }
}

export function createAuthClient(options: AuthClientOptions): AuthClient {
  return new NotImplementedAuthClient(options);
}
