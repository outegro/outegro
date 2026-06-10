import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true });

// Idempotent delivery log — one row per (event, channel).
export const deliveryLog = pgTable(
  "delivery_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: text("event_id").notNull(),
    channel: text("channel").notNull(),
    userId: text("user_id").notNull(),
    template: text("template").notNull(),
    status: text("status").notNull(), // sent | failed | skipped
    providerMessageId: text("provider_message_id"),
    error: text("error"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("delivery_event_channel_uq").on(t.eventId, t.channel)],
);

// Per-user preference matrix (type × channel). Mandatory types ignore this.
export const preferences = pgTable(
  "preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    type: text("type").notNull(),
    channel: text("channel").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("pref_user_type_channel_uq").on(t.userId, t.type, t.channel)],
);

// Telegram chat linking (set via auth-frontend deep-link flow).
export const telegramLinks = pgTable(
  "telegram_links",
  {
    userId: text("user_id").primaryKey(),
    chatId: text("chat_id").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("telegram_chat_idx").on(t.chatId)],
);

export const schema = { deliveryLog, preferences, telegramLinks };
export type Schema = typeof schema;
