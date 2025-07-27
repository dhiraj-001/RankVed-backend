ALTER TABLE "chatbots" ADD COLUMN "lead_collection_fields" text[] DEFAULT '{"name","phone"}';--> statement-breakpoint
ALTER TABLE "chatbots" DROP COLUMN "lead_collection_after_messages";--> statement-breakpoint
ALTER TABLE "chatbots" DROP COLUMN "lead_collection_message";