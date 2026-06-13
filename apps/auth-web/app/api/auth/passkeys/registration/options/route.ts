import type { NextResponse } from "next/server";
import { proxyAuthedJson } from "@/lib/backend";

// Authed: backend reads the user from the Bearer token (og_access).
export async function POST(): Promise<NextResponse> {
  return proxyAuthedJson("/auth/passkeys/registration/options", "POST");
}
