ALTER TABLE "chatbots" ALTER COLUMN "welcome_message" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "chatbots" ALTER COLUMN "popup_sound_enabled" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "chatbots" ALTER COLUMN "training_data" DROP DEFAULT;