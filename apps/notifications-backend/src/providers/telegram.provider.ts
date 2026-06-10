import { Injectable } from "@nestjs/common";
import { createLogger } from "@outegro/core";
import { env } from "../config";

const logger = createLogger({ service: "notifications-backend" });

@Injectable()
export class TelegramProvider {
  async send(chatId: string, text: string): Promise<{ id?: string }> {
    if (!env.TELEGRAM_BOT_TOKEN) {
      logger.info("DEV telegram (no TELEGRAM_BOT_TOKEN) — not sent", { chatId, text });
      return {};
    }
    const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) throw new Error(`telegram ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { result?: { message_id?: number } };
    return { id: data.result?.message_id?.toString() };
  }
}
