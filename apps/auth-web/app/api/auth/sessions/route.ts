import type { NextResponse } from "next/server";
import { proxyAuthed } from "@/lib/backend";

export async function GET(): Promise<NextResponse> {
  return proxyAuthed("/auth/sessions");
}
