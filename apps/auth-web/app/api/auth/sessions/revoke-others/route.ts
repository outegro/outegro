import type { NextResponse } from "next/server";
import { proxyAuthedJson } from "@/lib/backend";

export async function POST(): Promise<NextResponse> {
  return proxyAuthedJson("/auth/sessions/revoke-others", "POST");
}
