import { type NextRequest, NextResponse } from "next/server";
import { API, applyAuthCookies } from "@/lib/backend";

// Public — verifies the passkey and, on success, mints a session (sets cookies).
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.text();
  const res = await fetch(`${API}/auth/passkeys/authentication/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
  if (!res.ok) {
    return NextResponse.json(await res.json().catch(() => ({ error: "verify failed" })), {
      status: res.status,
    });
  }
  const out = NextResponse.json({ ok: true });
  await applyAuthCookies(res, out); // set og_access + forward refresh cookie
  return out;
}
