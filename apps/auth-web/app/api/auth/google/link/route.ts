import { type NextRequest, NextResponse } from "next/server";
import { authedFetch } from "@/lib/backend";

// Linking needs the user's Bearer (a top-level browser nav can't send it), so the
// BFF calls /auth/google/link server-side and forwards Google's consent redirect.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const res = await authedFetch("/auth/google/link", { redirect: "manual" });
  const location = res.headers.get("location");
  if (!location) {
    return NextResponse.redirect(new URL("/profile?error=google_link", req.url));
  }
  return NextResponse.redirect(location);
}
