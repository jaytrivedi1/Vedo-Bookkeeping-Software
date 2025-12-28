/**
 * Migration: Add Reconciliation Enhancements
 *
 * Adds new columns to support enhanced reconciliation features:
 * - Opening balance tracking
 * - Last reconciled balance reference
 * - Account-level last reconciliation tracking
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

export async function addReconciliationEnhancements(): Promise<void> {
  console.log('[Migration] Starting reconciliation enhancements migration...');

  try {
    // Check if openingBalance column exists in reconciliations table
    const checkOpeningBalance = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'reconciliations' AND column_name = 'opening_balance'
    `);

    if (checkOpeningBalance.rows.length === 0) {
      console.log('[Migration] Adding opening_balance column to reconciliations table...');
      await db.execute(sql`
        ALTER TABLE reconciliations
        ADD COLUMN opening_balance DOUBLE PRECISION DEFAULT 0
      `);
    } else {
      console.log('[Migration] opening_balance column already exists, skipping...');
    }

    // Check if previousReconciliationId column exists
    const checkPrevReconciliation = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'reconciliations' AND column_name = 'previous_reconciliation_id'
    `);

    if (checkPrevReconciliation.rows.length === 0) {
      console.log('[Migration] Adding previous_reconciliation_id column to reconciliations table...');
      await db.execute(sql`
        ALTER TABLE reconciliations
        ADD COLUMN previous_reconciliation_id INTEGER REFERENCES reconciliations(id)
      `);
    } else {
      console.log('[Migration] previous_reconciliation_id column already exists, skipping...');
    }

    // Check if lastReconciledDate column exists on accounts table
    const checkAccountLastReconciled = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'accounts' AND column_name = 'last_reconciled_date'
    `);

    if (checkAccountLastReconciled.rows.length === 0) {
      console.log('[Migration] Adding last_reconciled_date column to accounts table...');
      await db.execute(sql`
        ALTER TABLE accounts
        ADD COLUMN last_reconciled_date TIMESTAMP
      `);
    } else {
      console.log('[Migration] last_reconciled_date column already exists, skipping...');
    }

    // Check if lastReconciledBalance column exists on accounts table
    const checkAccountLastBalance = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'accounts' AND column_name = 'last_reconciled_balance'
    `);

    if (checkAccountLastBalance.rows.length === 0) {
      console.log('[Migration] Adding last_reconciled_balance column to accounts table...');
      await db.execute(sql`
        ALTER TABLE accounts
        ADD COLUMN last_reconciled_balance DOUBLE PRECISION DEFAULT 0
      `);
    } else {
      console.log('[Migration] last_reconciled_balance column already exists, skipping...');
    }

    // Backfill: Update accounts with last reconciliation info from completed reconciliations
    console.log('[Migration] Backfilling account last reconciliation data...');
    await db.execute(sql`
      UPDATE accounts a
      SET
        last_reconciled_date = subquery.statement_date,
        last_reconciled_balance = subquery.statement_ending_balance
      FROM (
        SELECT DISTINCT ON (account_id)
          account_id,
          statement_date,
          statement_ending_balance
        FROM reconciliations
        WHERE status = 'completed'
        ORDER BY account_id, completed_at DESC
      ) subquery
      WHERE a.id = subquery.account_id
    `);

    // Add index for faster lookups of in-progress reconciliations
    const checkInProgressIndex = await db.execute(sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'reconciliations' AND indexname = 'idx_reconciliations_account_status'
    `);

    if (checkInProgressIndex.rows.length === 0) {
      console.log('[Migration] Creating index for reconciliation account/status lookups...');
      await db.execute(sql`
        CREATE INDEX idx_reconciliations_account_status
        ON reconciliations(account_id, status)
      `);
    } else {
      console.log('[Migration] idx_reconciliations_account_status index already exists, skipping...');
    }

    console.log('[Migration] Reconciliation enhancements migration completed successfully!');
  } catch (error) {
    console.error('[Migration] Error during reconciliation enhancements migration:', error);
    throw error;
  }
}
