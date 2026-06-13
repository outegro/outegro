import type { NextResponse } from "next/server";
import { proxyAuthedJson } from "@/lib/backend";

// Authed: auth-backend mints a one-time nonce and returns the t.me deep-link.
export async function POST(): Promise<NextResponse> {
  return proxyAuthedJson("/auth/telegram/link-token", "POST");
}
