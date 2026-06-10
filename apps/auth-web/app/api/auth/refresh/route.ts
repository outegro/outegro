import { type NextRequest, NextResponse } from "next/server";
import { API, applyAuthCookies, clearAuthCookies, REFRESH_COOKIE } from "@/lib/backend";

// Called by the profile page when og_access is missing/expired:
//   redirect("/api/auth/refresh?next=/profile")
// Rotates the refresh token server-side (where we CAN set cookies) and bounces back.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const next = req.nextUrl.searchParams.get("next") ?? "/profile";
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!refresh) return NextResponse.redirect(new URL("/", req.url));

  const res = await fetch(`${API}/auth/refresh`, {
    method: "POST",
    headers: { cookie: `${REFRESH_COOKIE}=${refresh}` },
  });
  if (!res.ok) {
    const out = NextResponse.redirect(new URL("/", req.url));
    clearAuthCookies(out);
    return out;
  }
  const out = NextResponse.redirect(new URL(next, req.url));
  await applyAuthCookies(res, out);
  return out;
}
