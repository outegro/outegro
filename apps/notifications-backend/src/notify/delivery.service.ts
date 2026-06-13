import { Inject, Injectable } from "@nestjs/common";
import { createLogger } from "@outegro/core";
import { isMandatory, type NotificationChannel, type NotifyRequestedEvent } from "@outegro/events";
import { and, eq } from "drizzle-orm";
import { DB, type NotifyDb } from "../db/db.module";
import { deliveryLog, preferences, telegramLinks } from "../db/schema";
import { EmailProvider } from "../providers/email.provider";
import { TelegramProvider } from "../providers/telegram.provider";
import { type RenderedMessage, renderTemplate } from "../providers/templates";

const logger = createLogger({ service: "notifications-backend" });

@Injectable()
export class DeliveryService {
  constructor(
    @Inject(DB) private readonly db: NotifyDb,
    private readonly email: EmailProvider,
    private readonly telegram: TelegramProvider,
  ) {}

  async deliver(event: NotifyRequestedEvent): Promise<void> {
    const rendered = renderTemplate(event.template, event.data);
    if (!rendered) {
      logger.warn("unknown template — dropping", { template: event.template, id: event.id });
      return;
    }

    for (const channel of await this.resolveChannels(event)) {
      // Idempotency: skip only if this (event, channel) already succeeded.
      const [existing] = await this.db
        .select({ status: deliveryLog.status })
        .from(deliveryLog)
        .where(and(eq(deliveryLog.eventId, event.id), eq(deliveryLog.channel, channel)))
        .limit(1);
      if (existing?.status === "sent") continue;

      // Telegram is best-effort: if the user never linked a chat, skip it
      // gracefully (no throw → no nack/redelivery) rather than fail the event.
      if (channel === "telegram" && !(await this.resolveTelegramChatId(event))) {
        await this.upsertLog(event, channel, "skipped", {});
        logger.info("no telegram link — skipping", { id: event.id, template: event.template });
        continue;
      }

      try {
        const result = await this.dispatch(channel, event, rendered);
        await this.upsertLog(event, channel, "sent", { providerMessageId: result.id ?? null });
        logger.info("delivered", { id: event.id, channel, template: event.template });
      } catch (error) {
        await this.upsertLog(event, channel, "failed", { error: String(error) });
        throw error; // bubble up → consumer nacks to DLX
      }
    }
  }

  private async dispatch(
    channel: NotificationChannel,
    event: NotifyRequestedEvent,
    rendered: RenderedMessage,
  ): Promise<{ id?: string }> {
    if (channel === "email") {
      if (!event.to.email) throw new Error("no email target");
      return this.email.send(event.to.email, rendered.subject, rendered.text, rendered.html);
    }
    if (channel === "telegram") {
      const chatId = await this.resolveTelegramChatId(event);
      if (!chatId) throw new Error("no telegram link for user");
      return this.telegram.send(chatId, rendered.text);
    }
    throw new Error(`unknown channel: ${channel}`);
  }

  /** Explicit target on the event, else the user's linked Telegram chat (or null). */
  private async resolveTelegramChatId(event: NotifyRequestedEvent): Promise<string | undefined> {
    if (event.to.telegramChatId) return event.to.telegramChatId;
    const [link] = await this.db
      .select({ chatId: telegramLinks.chatId })
      .from(telegramLinks)
      .where(eq(telegramLinks.userId, event.userId))
      .limit(1);
    return link?.chatId;
  }

  private async resolveChannels(event: NotifyRequestedEvent): Promise<NotificationChannel[]> {
    if (isMandatory(event.template)) return event.channels; // security/transactional → always
    const allowed: NotificationChannel[] = [];
    for (const channel of event.channels) {
      const [pref] = await this.db
        .select({ enabled: preferences.enabled })
        .from(preferences)
        .where(
          and(
            eq(preferences.userId, event.userId),
            eq(preferences.type, event.template),
            eq(preferences.channel, channel),
          ),
        )
        .limit(1);
      if (!pref || pref.enabled) allowed.push(channel); // default-on
    }
    return allowed;
  }

  private async upsertLog(
    event: NotifyRequestedEvent,
    channel: NotificationChannel,
    status: "sent" | "failed" | "skipped",
    extra: { providerMessageId?: string | null; error?: string },
  ): Promise<void> {
    await this.db
      .insert(deliveryLog)
      .values({
        eventId: event.id,
        channel,
        userId: event.userId,
        template: event.template,
        status,
        providerMessageId: extra.providerMessageId ?? null,
        error: extra.error ?? null,
      })
      .onConflictDoUpdate({
        target: [deliveryLog.eventId, deliveryLog.channel],
        set: {
          status,
          providerMessageId: extra.providerMessageId ?? null,
          error: extra.error ?? null,
        },
      });
  }
}
