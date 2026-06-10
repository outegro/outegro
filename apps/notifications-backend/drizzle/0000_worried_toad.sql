CREATE TABLE "delivery_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" text NOT NULL,
	"channel" text NOT NULL,
	"user_id" text NOT NULL,
	"template" text NOT NULL,
	"status" text NOT NULL,
	"provider_message_id" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"channel" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegram_links" (
	"user_id" text PRIMARY KEY NOT NULL,
	"chat_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "delivery_event_channel_uq" ON "delivery_log" USING btree ("event_id","channel");--> statement-breakpoint
CREATE UNIQUE INDEX "pref_user_type_channel_uq" ON "preferences" USING btree ("user_id","type","channel");--> statement-breakpoint
CREATE INDEX "telegram_chat_idx" ON "telegram_links" USING btree ("chat_id");