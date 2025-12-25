-- AI Categorization Migration
-- Creates tables and columns for AI-powered transaction categorization

-- Create rule_type enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE rule_type AS ENUM ('manual', 'ai');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create suggestion_source enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE suggestion_source AS ENUM ('pattern', 'rule', 'ai', 'none');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add new columns to categorization_rules table for AI rules
ALTER TABLE "categorization_rules" ADD COLUMN IF NOT EXISTS "rule_type" rule_type DEFAULT 'manual' NOT NULL;
ALTER TABLE "categorization_rules" ADD COLUMN IF NOT EXISTS "source_merchant_pattern" text;
ALTER TABLE "categorization_rules" ADD COLUMN IF NOT EXISTS "auto_generated_at" timestamp;
ALTER TABLE "categorization_rules" ADD COLUMN IF NOT EXISTS "promoted_to_manual_at" timestamp;
ALTER TABLE "categorization_rules" ADD COLUMN IF NOT EXISTS "occurrence_count" integer DEFAULT 0;
ALTER TABLE "categorization_rules" ADD COLUMN IF NOT EXISTS "confidence_score" numeric(5, 4);

-- Create merchant_patterns table for learning user categorization behavior
CREATE TABLE IF NOT EXISTS "merchant_patterns" (
    "id" serial PRIMARY KEY NOT NULL,
    "merchant_name_normalized" text NOT NULL,
    "merchant_name_variants" json DEFAULT '[]',
    "default_account_id" integer REFERENCES "accounts"("id"),
    "default_contact_id" integer REFERENCES "contacts"("id"),
    "default_sales_tax_id" integer REFERENCES "sales_taxes"("id"),
    "default_transaction_type" text,
    "total_occurrences" integer DEFAULT 0 NOT NULL,
    "user_confirmations" integer DEFAULT 0 NOT NULL,
    "user_corrections" integer DEFAULT 0 NOT NULL,
    "confidence_score" numeric(5, 4) DEFAULT '0.5000' NOT NULL,
    "last_seen_at" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create categorization_feedback table for tracking user decisions
CREATE TABLE IF NOT EXISTS "categorization_feedback" (
    "id" serial PRIMARY KEY NOT NULL,
    "imported_transaction_id" integer REFERENCES "imported_transactions"("id"),
    "merchant_name" text,
    "merchant_name_normalized" text,
    "transaction_amount" numeric(15, 2),
    "transaction_date" date,
    "suggestion_source" suggestion_source,
    "suggested_account_id" integer REFERENCES "accounts"("id"),
    "suggested_contact_id" integer REFERENCES "contacts"("id"),
    "suggested_tax_id" integer REFERENCES "sales_taxes"("id"),
    "ai_confidence" text,
    "chosen_account_id" integer REFERENCES "accounts"("id"),
    "chosen_contact_id" integer REFERENCES "contacts"("id"),
    "chosen_tax_id" integer REFERENCES "sales_taxes"("id"),
    "was_suggestion_accepted" boolean,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- Add AI settings columns to preferences table
ALTER TABLE "preferences" ADD COLUMN IF NOT EXISTS "ai_categorization_enabled" boolean DEFAULT true;
ALTER TABLE "preferences" ADD COLUMN IF NOT EXISTS "ai_auto_post_enabled" boolean DEFAULT false;
ALTER TABLE "preferences" ADD COLUMN IF NOT EXISTS "ai_auto_post_min_confidence" numeric(5, 4) DEFAULT '0.9500';
ALTER TABLE "preferences" ADD COLUMN IF NOT EXISTS "ai_rule_generation_enabled" boolean DEFAULT true;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_merchant_patterns_normalized" ON "merchant_patterns" ("merchant_name_normalized");
CREATE INDEX IF NOT EXISTS "idx_categorization_feedback_merchant" ON "categorization_feedback" ("merchant_name_normalized");
CREATE INDEX IF NOT EXISTS "idx_categorization_rules_rule_type" ON "categorization_rules" ("rule_type");
CREATE INDEX IF NOT EXISTS "idx_categorization_rules_source_merchant" ON "categorization_rules" ("source_merchant_pattern");
