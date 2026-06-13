import type { NextResponse } from "next/server";
import { proxyAuthedJson } from "@/lib/backend";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  return proxyAuthedJson(`/auth/sessions/${encodeURIComponent(id)}`, "DELETE");
}
