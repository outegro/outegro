import type { NextResponse } from "next/server";
import { NOTIFY_API, proxyAuthed, proxyAuthedJson } from "@/lib/backend";

// Telegram link status + unlink live in notifications-backend (owns telegram_links).
export async function GET(): Promise<NextResponse> {
  return proxyAuthed("/me/telegram", {}, NOTIFY_API);
}

export async function DELETE(): Promise<NextResponse> {
  return proxyAuthedJson("/me/telegram", "DELETE", undefined, NOTIFY_API);
}
