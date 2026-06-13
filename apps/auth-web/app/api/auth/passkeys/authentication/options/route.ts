import { NextResponse } from "next/server";
import { API } from "@/lib/backend";

// Public — discoverable-credential login options, no session required.
export async function POST(): Promise<NextResponse> {
  const res = await fetch(`${API}/auth/passkeys/authentication/options`, {
    method: "POST",
    cache: "no-store",
  });
  return NextResponse.json(await res.json().catch(() => ({ error: "options failed" })), {
    status: res.status,
  });
}
