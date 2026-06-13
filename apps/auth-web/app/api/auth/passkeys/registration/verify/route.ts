import type { NextRequest, NextResponse } from "next/server";
import { proxyAuthedJson } from "@/lib/backend";

export async function POST(req: NextRequest): Promise<NextResponse> {
  return proxyAuthedJson("/auth/passkeys/registration/verify", "POST", await req.json());
}
