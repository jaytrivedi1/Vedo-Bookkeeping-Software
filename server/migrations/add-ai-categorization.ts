/**
 * Migration: Add AI Categorization Tables
 *
 * Creates the tables and columns needed for AI-powered transaction categorization:
 * - merchant_patterns: Learns user categorization patterns
 * - categorization_feedback: Tracks user decisions for learning
 * - Updates categorization_rules with AI-specific columns
 * - Updates preferences with AI settings
 */

import { db } from "../db";
import { sql } from "drizzle-orm";

export async function addAiCategorizationTables(): Promise<void> {
  console.log("Starting AI categorization migration...");

  try {
    // Create rule_type enum if it doesn't exist
    console.log("Creating rule_type enum...");
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE rule_type AS ENUM ('manual', 'ai');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create suggestion_source enum if it doesn't exist
    console.log("Creating suggestion_source enum...");
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE suggestion_source AS ENUM ('pattern', 'rule', 'ai', 'none');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add new columns to categorization_rules table for AI rules
    console.log("Adding AI columns to categorization_rules...");
    await db.execute(sql`
      ALTER TABLE "categorization_rules"
      ADD COLUMN IF NOT EXISTS "rule_type" rule_type DEFAULT 'manual' NOT NULL
    `);
    await db.execute(sql`
      ALTER TABLE "categorization_rules"
      ADD COLUMN IF NOT EXISTS "source_merchant_pattern" text
    `);
    await db.execute(sql`
      ALTER TABLE "categorization_rules"
      ADD COLUMN IF NOT EXISTS "auto_generated_at" timestamp
    `);
    await db.execute(sql`
      ALTER TABLE "categorization_rules"
      ADD COLUMN IF NOT EXISTS "promoted_to_manual_at" timestamp
    `);
    await db.execute(sql`
      ALTER TABLE "categorization_rules"
      ADD COLUMN IF NOT EXISTS "occurrence_count" integer DEFAULT 0
    `);
    await db.execute(sql`
      ALTER TABLE "categorization_rules"
      ADD COLUMN IF NOT EXISTS "confidence_score" numeric(5, 4)
    `);

    // Create merchant_patterns table
    console.log("Creating merchant_patterns table...");
    await db.execute(sql`
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
      )
    `);

    // Create categorization_feedback table
    console.log("Creating categorization_feedback table...");
    await db.execute(sql`
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
      )
    `);

    // Add AI settings columns to preferences table
    console.log("Adding AI settings to preferences...");
    await db.execute(sql`
      ALTER TABLE "preferences"
      ADD COLUMN IF NOT EXISTS "ai_categorization_enabled" boolean DEFAULT true
    `);
    await db.execute(sql`
      ALTER TABLE "preferences"
      ADD COLUMN IF NOT EXISTS "ai_auto_post_enabled" boolean DEFAULT false
    `);
    await db.execute(sql`
      ALTER TABLE "preferences"
      ADD COLUMN IF NOT EXISTS "ai_auto_post_min_confidence" numeric(5, 4) DEFAULT '0.9500'
    `);
    await db.execute(sql`
      ALTER TABLE "preferences"
      ADD COLUMN IF NOT EXISTS "ai_rule_generation_enabled" boolean DEFAULT true
    `);

    // Create indexes for better query performance
    console.log("Creating indexes...");
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_merchant_patterns_normalized"
      ON "merchant_patterns" ("merchant_name_normalized")
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_categorization_feedback_merchant"
      ON "categorization_feedback" ("merchant_name_normalized")
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_categorization_rules_rule_type"
      ON "categorization_rules" ("rule_type")
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_categorization_rules_source_merchant"
      ON "categorization_rules" ("source_merchant_pattern")
    `);

    console.log("AI categorization migration completed successfully!");
  } catch (error) {
    console.error("AI categorization migration failed:", error);
    throw error;
  }
}
