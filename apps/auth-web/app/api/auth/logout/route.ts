import { type NextRequest, NextResponse } from "next/server";
import { API, clearAuthCookies, REFRESH_COOKIE } from "@/lib/backend";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const refresh = req.cookies.get(REFRESH_COOKIE)?.value;
  if (refresh) {
    await fetch(`${API}/auth/logout`, {
      method: "POST",
      headers: { cookie: `${REFRESH_COOKIE}=${refresh}` },
    }).catch(() => {});
  }
  const out = NextResponse.redirect(new URL("/", req.url), 303);
  clearAuthCookies(out);
  return out;
}
