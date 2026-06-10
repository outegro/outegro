import type { MeResponse } from "@outegro/contracts";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

// All token handling lives here + the route handlers — the single auth point.
export const API = process.env.AUTH_API_BASE ?? "https://api.outegro.com";
export const ACCESS_COOKIE = "og_access";
export const REFRESH_COOKIE = "outegro_refresh"; // matches auth-backend's cookie name
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN; // ".outegro.com" in prod
const SECURE = process.env.COOKIE_INSECURE !== "true";

/** Read current user via /auth/me using the og_access cookie. null if unauthenticated. */
export async function getMe(): Promise<MeResponse | null> {
  const access = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!access) return null;
  const res = await fetch(`${API}/auth/me`, {
    headers: { authorization: `Bearer ${access}` },
    cache: "no-store",
  });
  return res.ok ? ((await res.json()) as MeResponse) : null;
}

/** Set og_access (host-only) + forward the backend's refresh cookie onto a route response. */
export async function applyAuthCookies(backendRes: Response, out: NextResponse): Promise<void> {
  const data = (await backendRes.json()) as { accessToken: string; expiresIn: number };
  out.cookies.set(ACCESS_COOKIE, data.accessToken, {
    httpOnly: true,
    secure: SECURE,
    sameSite: "lax",
    path: "/",
    maxAge: data.expiresIn,
  });
  for (const cookie of backendRes.headers.getSetCookie()) {
    out.headers.append("set-cookie", cookie);
  }
}

export function clearAuthCookies(out: NextResponse): void {
  out.cookies.delete(ACCESS_COOKIE);
  out.cookies.set(REFRESH_COOKIE, "", { domain: COOKIE_DOMAIN, path: "/", maxAge: 0 });
}
