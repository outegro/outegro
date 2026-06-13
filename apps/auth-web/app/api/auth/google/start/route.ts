import { type NextRequest, NextResponse } from "next/server";
import { API } from "@/lib/backend";

// Public login start — backend mints state/PKCE in Redis and 302s to Google's
// consent screen; we forward that redirect (state lives in the URL, not a cookie).
export async function GET(req: NextRequest): Promise<NextResponse> {
  const res = await fetch(`${API}/auth/google/start`, { redirect: "manual", cache: "no-store" });
  const location = res.headers.get("location");
  if (!location) {
    return NextResponse.redirect(new URL("/?error=google", req.url));
  }
  return NextResponse.redirect(location);
}
