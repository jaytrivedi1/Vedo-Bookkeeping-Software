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
  console.log("[AI-Migration] Starting AI categorization migration...");

  // Step 1: Create rule_type enum
  try {
    console.log("[AI-Migration] Step 1: Creating rule_type enum...");
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE rule_type AS ENUM ('manual', 'ai');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log("[AI-Migration] Step 1: rule_type enum created/exists");
  } catch (error) {
    console.error("[AI-Migration] Step 1 failed:", error);
  }

  // Step 2: Create suggestion_source enum
  try {
    console.log("[AI-Migration] Step 2: Creating suggestion_source enum...");
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE suggestion_source AS ENUM ('pattern', 'rule', 'ai', 'none');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log("[AI-Migration] Step 2: suggestion_source enum created/exists");
  } catch (error) {
    console.error("[AI-Migration] Step 2 failed:", error);
  }

  // Step 3: Add columns to categorization_rules table
  try {
    console.log("[AI-Migration] Step 3: Adding AI columns to categorization_rules...");
    await db.execute(sql`ALTER TABLE "categorization_rules" ADD COLUMN IF NOT EXISTS "rule_type" text DEFAULT 'manual'`);
    await db.execute(sql`ALTER TABLE "categorization_rules" ADD COLUMN IF NOT EXISTS "source_merchant_pattern" text`);
    await db.execute(sql`ALTER TABLE "categorization_rules" ADD COLUMN IF NOT EXISTS "auto_generated_at" timestamp`);
    await db.execute(sql`ALTER TABLE "categorization_rules" ADD COLUMN IF NOT EXISTS "promoted_to_manual_at" timestamp`);
    await db.execute(sql`ALTER TABLE "categorization_rules" ADD COLUMN IF NOT EXISTS "occurrence_count" integer DEFAULT 0`);
    await db.execute(sql`ALTER TABLE "categorization_rules" ADD COLUMN IF NOT EXISTS "confidence_score" numeric(5, 4)`);
    console.log("[AI-Migration] Step 3: categorization_rules columns added");
  } catch (error) {
    console.error("[AI-Migration] Step 3 failed:", error);
  }

  // Step 4: Create merchant_patterns table
  try {
    console.log("[AI-Migration] Step 4: Creating merchant_patterns table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "merchant_patterns" (
        "id" serial PRIMARY KEY NOT NULL,
        "merchant_name_normalized" text NOT NULL,
        "merchant_name_variants" json DEFAULT '[]',
        "default_account_id" integer,
        "default_contact_id" integer,
        "default_sales_tax_id" integer,
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
    console.log("[AI-Migration] Step 4: merchant_patterns table created/exists");
  } catch (error) {
    console.error("[AI-Migration] Step 4 failed:", error);
  }

  // Step 5: Create categorization_feedback table
  try {
    console.log("[AI-Migration] Step 5: Creating categorization_feedback table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "categorization_feedback" (
        "id" serial PRIMARY KEY NOT NULL,
        "imported_transaction_id" integer,
        "merchant_name" text,
        "merchant_name_normalized" text,
        "transaction_amount" numeric(15, 2),
        "transaction_date" date,
        "suggestion_source" text,
        "suggested_account_id" integer,
        "suggested_contact_id" integer,
        "suggested_tax_id" integer,
        "ai_confidence" text,
        "chosen_account_id" integer,
        "chosen_contact_id" integer,
        "chosen_tax_id" integer,
        "was_suggestion_accepted" boolean,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `);
    console.log("[AI-Migration] Step 5: categorization_feedback table created/exists");
  } catch (error) {
    console.error("[AI-Migration] Step 5 failed:", error);
  }

  // Step 6: Add AI settings columns to preferences table
  try {
    console.log("[AI-Migration] Step 6: Adding AI settings to preferences...");
    await db.execute(sql`ALTER TABLE "preferences" ADD COLUMN IF NOT EXISTS "ai_categorization_enabled" boolean DEFAULT true`);
    await db.execute(sql`ALTER TABLE "preferences" ADD COLUMN IF NOT EXISTS "ai_auto_post_enabled" boolean DEFAULT false`);
    await db.execute(sql`ALTER TABLE "preferences" ADD COLUMN IF NOT EXISTS "ai_auto_post_min_confidence" numeric(5, 4) DEFAULT '0.9500'`);
    await db.execute(sql`ALTER TABLE "preferences" ADD COLUMN IF NOT EXISTS "ai_rule_generation_enabled" boolean DEFAULT true`);
    console.log("[AI-Migration] Step 6: preferences columns added");
  } catch (error) {
    console.error("[AI-Migration] Step 6 failed:", error);
  }

  // Step 7: Create indexes
  try {
    console.log("[AI-Migration] Step 7: Creating indexes...");
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_merchant_patterns_normalized" ON "merchant_patterns" ("merchant_name_normalized")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_categorization_feedback_merchant" ON "categorization_feedback" ("merchant_name_normalized")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_categorization_rules_rule_type" ON "categorization_rules" ("rule_type")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "idx_categorization_rules_source_merchant" ON "categorization_rules" ("source_merchant_pattern")`);
    console.log("[AI-Migration] Step 7: indexes created");
  } catch (error) {
    console.error("[AI-Migration] Step 7 failed:", error);
  }

  console.log("[AI-Migration] AI categorization migration completed!");
}
