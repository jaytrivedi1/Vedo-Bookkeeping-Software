/**
 * Migration: Add Company Scoping to Preferences
 *
 * This migration adds company_id to the preferences table for multi-tenant
 * data isolation. Each company can have its own settings like transaction
 * lock date, AI categorization preferences, etc.
 *
 * Existing preferences (without company_id) become global defaults.
 * Company-specific preferences take precedence when available.
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

export async function addCompanyScopingToPreferences(): Promise<void> {
  console.log('[Migration] Starting company scoping migration for preferences...');

  try {
    // Check if company_id column already exists
    const columnCheck = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'preferences' AND column_name = 'company_id'
    `);

    if (columnCheck.rows.length > 0) {
      console.log('[Migration] company_id column already exists in preferences table');
      return;
    }

    // Add company_id column to preferences table
    console.log('[Migration] Adding company_id column to preferences table...');
    await db.execute(sql`
      ALTER TABLE preferences
      ADD COLUMN company_id INTEGER REFERENCES companies(id)
    `);

    console.log('[Migration] company_id column added successfully');

    // Create index for faster lookups by company
    console.log('[Migration] Creating index on company_id...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_preferences_company_id ON preferences(company_id)
    `);

    console.log('[Migration] Index created successfully');

    // Note: We don't backfill existing preferences to a specific company.
    // Existing rows with NULL company_id serve as global defaults.
    // Company-specific preferences will be created when companies update their settings.

    console.log('[Migration] Company scoping migration for preferences completed successfully');
  } catch (error) {
    console.error('[Migration] Error adding company scoping to preferences:', error);
    throw error;
  }
}

// Run migration if executed directly
if (require.main === module) {
  addCompanyScopingToPreferences()
    .then(() => {
      console.log('[Migration] Done');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Migration] Failed:', error);
      process.exit(1);
    });
}
