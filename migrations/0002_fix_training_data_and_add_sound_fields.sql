-- Migration: Fix training_data column type and add sound/delay fields
-- Created: 2024-01-15

-- First, safely convert training_data from text to jsonb
-- This handles the case where the column might already exist as text
DO $$ 
BEGIN
    -- Check if training_data column exists and is text type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chatbots' 
        AND column_name = 'training_data' 
        AND data_type = 'text'
    ) THEN
        -- Convert text to jsonb safely
        ALTER TABLE "chatbots" ALTER COLUMN "training_data" TYPE jsonb USING training_data::jsonb;
    END IF;
END $$;

-- Add popup sound fields (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chatbots' 
        AND column_name = 'popup_sound_enabled'
    ) THEN
        ALTER TABLE "chatbots" ADD COLUMN "popup_sound_enabled" boolean DEFAULT true;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chatbots' 
        AND column_name = 'custom_popup_sound'
    ) THEN
        ALTER TABLE "chatbots" ADD COLUMN "custom_popup_sound" text;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chatbots' 
        AND column_name = 'popup_sound_volume'
    ) THEN
        ALTER TABLE "chatbots" ADD COLUMN "popup_sound_volume" integer DEFAULT 50;
    END IF;
END $$;

-- Add timing delay fields (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chatbots' 
        AND column_name = 'popup_delay'
    ) THEN
        ALTER TABLE "chatbots" ADD COLUMN "popup_delay" integer DEFAULT 2000;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chatbots' 
        AND column_name = 'reply_delay'
    ) THEN
        ALTER TABLE "chatbots" ADD COLUMN "reply_delay" integer DEFAULT 1000;
    END IF;
END $$;

-- Add comments to document the new columns
COMMENT ON COLUMN "chatbots"."popup_sound_enabled" IS 'Enable/disable popup sound notifications (default: true)';
COMMENT ON COLUMN "chatbots"."custom_popup_sound" IS 'Data URI for custom popup sound file';
COMMENT ON COLUMN "chatbots"."popup_sound_volume" IS 'Popup sound volume level 0-100 (default: 50)';
COMMENT ON COLUMN "chatbots"."popup_delay" IS 'Delay in milliseconds before showing chat popup (default: 2000ms)';
COMMENT ON COLUMN "chatbots"."reply_delay" IS 'Delay in milliseconds before showing bot reply (default: 1000ms)'; 