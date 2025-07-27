ALTER TABLE "chatbots" ADD COLUMN "popup_sound_enabled" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "chatbots" ADD COLUMN "custom_popup_sound" text;--> statement-breakpoint
ALTER TABLE "chatbots" ADD COLUMN "popup_sound_volume" integer DEFAULT 50;--> statement-breakpoint
ALTER TABLE "chatbots" ADD COLUMN "popup_delay" integer DEFAULT 2000;--> statement-breakpoint
ALTER TABLE "chatbots" ADD COLUMN "reply_delay" integer DEFAULT 1000;--> statement-breakpoint
ALTER TABLE "chatbots" DROP COLUMN "enable_notification_sound";--> statement-breakpoint
ALTER TABLE "chatbots" DROP COLUMN "custom_notification_sound";