/**
 * Migration: Add Company Scoping to AI Categorization
 *
 * Makes AI categorization rules, merchant patterns, and feedback
 * company-specific. This ensures:
 * - Rules created from Company A's transactions only apply to Company A
 * - The 3-transaction threshold counts per-company
 * - Complete data isolation between companies
 */

import { db } from "../db";
import { sql } from "drizzle-orm";

export async function addCompanyScopingToAi(): Promise<void> {
  console.log("[Company-Scoping] Starting company scoping migration for AI categorization...");

  // Step 1: Add company_id to categorization_rules
  try {
    console.log("[Company-Scoping] Step 1: Adding company_id to categorization_rules...");
    await db.execute(sql`
      ALTER TABLE "categorization_rules"
      ADD COLUMN IF NOT EXISTS "company_id" integer REFERENCES "companies"("id")
    `);
    console.log("[Company-Scoping] Step 1: company_id column added to categorization_rules");
  } catch (error) {
    console.error("[Company-Scoping] Step 1 failed:", error);
  }

  // Step 2: Add company_id to merchant_patterns
  try {
    console.log("[Company-Scoping] Step 2: Adding company_id to merchant_patterns...");
    await db.execute(sql`
      ALTER TABLE "merchant_patterns"
      ADD COLUMN IF NOT EXISTS "company_id" integer REFERENCES "companies"("id")
    `);
    console.log("[Company-Scoping] Step 2: company_id column added to merchant_patterns");
  } catch (error) {
    console.error("[Company-Scoping] Step 2 failed:", error);
  }

  // Step 3: Add company_id to categorization_feedback
  try {
    console.log("[Company-Scoping] Step 3: Adding company_id to categorization_feedback...");
    await db.execute(sql`
      ALTER TABLE "categorization_feedback"
      ADD COLUMN IF NOT EXISTS "company_id" integer REFERENCES "companies"("id")
    `);
    console.log("[Company-Scoping] Step 3: company_id column added to categorization_feedback");
  } catch (error) {
    console.error("[Company-Scoping] Step 3 failed:", error);
  }

  // Step 4: Create indexes for efficient company-scoped queries
  try {
    console.log("[Company-Scoping] Step 4: Creating indexes...");
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_categorization_rules_company"
      ON "categorization_rules" ("company_id")
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_merchant_patterns_company"
      ON "merchant_patterns" ("company_id")
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_categorization_feedback_company"
      ON "categorization_feedback" ("company_id")
    `);
    // Composite index for efficient merchant pattern lookup by company
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_merchant_patterns_company_merchant"
      ON "merchant_patterns" ("company_id", "merchant_name_normalized")
    `);
    console.log("[Company-Scoping] Step 4: indexes created");
  } catch (error) {
    console.error("[Company-Scoping] Step 4 failed:", error);
  }

  // Step 5: Backfill existing data with default company (company_id = 1)
  try {
    console.log("[Company-Scoping] Step 5: Backfilling existing records with default company...");

    // Get the default company ID
    const result = await db.execute(sql`
      SELECT id FROM companies WHERE is_default = true LIMIT 1
    `);

    const defaultCompanyId = result.rows?.[0]?.id || 1;
    console.log("[Company-Scoping] Default company ID:", defaultCompanyId);

    // Update categorization_rules
    await db.execute(sql`
      UPDATE "categorization_rules"
      SET "company_id" = ${defaultCompanyId}
      WHERE "company_id" IS NULL
    `);

    // Update merchant_patterns
    await db.execute(sql`
      UPDATE "merchant_patterns"
      SET "company_id" = ${defaultCompanyId}
      WHERE "company_id" IS NULL
    `);

    // Update categorization_feedback
    await db.execute(sql`
      UPDATE "categorization_feedback"
      SET "company_id" = ${defaultCompanyId}
      WHERE "company_id" IS NULL
    `);

    console.log("[Company-Scoping] Step 5: existing records backfilled");
  } catch (error) {
    console.error("[Company-Scoping] Step 5 failed:", error);
  }

  console.log("[Company-Scoping] Company scoping migration completed!");
}
