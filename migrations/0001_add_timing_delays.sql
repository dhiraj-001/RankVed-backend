-- Migration: Add timing delay fields to chatbots table
-- Created: 2024-01-15

-- Add popupDelay column (delay before showing popup in milliseconds)
ALTER TABLE "chatbots" ADD COLUMN "popup_delay" integer DEFAULT 2000;

-- Add replyDelay column (delay before showing bot reply in milliseconds)  
ALTER TABLE "chatbots" ADD COLUMN "reply_delay" integer DEFAULT 1000;

-- Add comments to document the new columns
COMMENT ON COLUMN "chatbots"."popup_delay" IS 'Delay in milliseconds before showing chat popup (default: 2000ms)';
COMMENT ON COLUMN "chatbots"."reply_delay" IS 'Delay in milliseconds before showing bot reply (default: 1000ms)'; 