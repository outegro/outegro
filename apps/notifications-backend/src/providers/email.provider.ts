import { Injectable } from "@nestjs/common";
import { createLogger } from "@outegro/core";
import { env } from "../config";

const logger = createLogger({ service: "notifications-backend" });

@Injectable()
export class EmailProvider {
  async send(to: string, subject: string, text: string, html: string): Promise<{ id?: string }> {
    if (!env.RESEND_API_KEY) {
      // Dev / setup gap: log instead of sending (so login codes stay usable).
      logger.info("DEV email (no RESEND_API_KEY) — not sent", { to, subject, text });
      return { id: "dev" };
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from: env.RESEND_FROM, to, subject, text, html }),
    });
    if (!res.ok) throw new Error(`resend ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { id?: string };
    return { id: data.id };
  }
}
