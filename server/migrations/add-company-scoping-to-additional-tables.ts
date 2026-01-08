/**
 * Migration: Add Company Scoping to Additional Tables
 *
 * This migration adds company_id to additional tables for complete multi-tenant
 * data isolation:
 * - contact_notes
 * - bank_accounts
 * - csv_mapping_preferences
 * - transaction_attachments
 * - bank_transaction_matches
 *
 * Existing data is backfilled using relationships to determine company ownership.
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

export async function addCompanyScopingToAdditionalTables(): Promise<void> {
  console.log('[Migration] Starting company scoping migration for additional tables...');

  try {
    // ============ CONTACT NOTES ============
    const contactNotesCheck = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'contact_notes' AND column_name = 'company_id'
    `);

    if (contactNotesCheck.rows.length === 0) {
      console.log('[Migration] Adding company_id to contact_notes...');
      await db.execute(sql`
        ALTER TABLE contact_notes
        ADD COLUMN company_id INTEGER REFERENCES companies(id)
      `);

      // Backfill from contact's company_id
      await db.execute(sql`
        UPDATE contact_notes cn
        SET company_id = c.company_id
        FROM contacts c
        WHERE cn.contact_id = c.id AND c.company_id IS NOT NULL
      `);

      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_contact_notes_company_id ON contact_notes(company_id)
      `);
      console.log('[Migration] contact_notes updated successfully');
    } else {
      console.log('[Migration] company_id already exists in contact_notes');
    }

    // ============ BANK ACCOUNTS ============
    const bankAccountsCheck = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'bank_accounts' AND column_name = 'company_id'
    `);

    if (bankAccountsCheck.rows.length === 0) {
      console.log('[Migration] Adding company_id to bank_accounts...');
      await db.execute(sql`
        ALTER TABLE bank_accounts
        ADD COLUMN company_id INTEGER REFERENCES companies(id)
      `);

      // Backfill from bank_connection's company_id
      await db.execute(sql`
        UPDATE bank_accounts ba
        SET company_id = bc.company_id
        FROM bank_connections bc
        WHERE ba.connection_id = bc.id AND bc.company_id IS NOT NULL
      `);

      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_bank_accounts_company_id ON bank_accounts(company_id)
      `);
      console.log('[Migration] bank_accounts updated successfully');
    } else {
      console.log('[Migration] company_id already exists in bank_accounts');
    }

    // ============ CSV MAPPING PREFERENCES ============
    const csvMappingCheck = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'csv_mapping_preferences' AND column_name = 'company_id'
    `);

    if (csvMappingCheck.rows.length === 0) {
      console.log('[Migration] Adding company_id to csv_mapping_preferences...');
      await db.execute(sql`
        ALTER TABLE csv_mapping_preferences
        ADD COLUMN company_id INTEGER REFERENCES companies(id)
      `);

      // Backfill from account's company_id
      await db.execute(sql`
        UPDATE csv_mapping_preferences cmp
        SET company_id = a.company_id
        FROM accounts a
        WHERE cmp.account_id = a.id AND a.company_id IS NOT NULL
      `);

      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_csv_mapping_preferences_company_id ON csv_mapping_preferences(company_id)
      `);
      console.log('[Migration] csv_mapping_preferences updated successfully');
    } else {
      console.log('[Migration] company_id already exists in csv_mapping_preferences');
    }

    // ============ TRANSACTION ATTACHMENTS ============
    const attachmentsCheck = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'transaction_attachments' AND column_name = 'company_id'
    `);

    if (attachmentsCheck.rows.length === 0) {
      console.log('[Migration] Adding company_id to transaction_attachments...');
      await db.execute(sql`
        ALTER TABLE transaction_attachments
        ADD COLUMN company_id INTEGER REFERENCES companies(id)
      `);

      // Backfill from imported_transaction's company_id
      await db.execute(sql`
        UPDATE transaction_attachments ta
        SET company_id = it.company_id
        FROM imported_transactions it
        WHERE ta.imported_transaction_id = it.id AND it.company_id IS NOT NULL
      `);

      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_transaction_attachments_company_id ON transaction_attachments(company_id)
      `);
      console.log('[Migration] transaction_attachments updated successfully');
    } else {
      console.log('[Migration] company_id already exists in transaction_attachments');
    }

    // ============ BANK TRANSACTION MATCHES ============
    const matchesCheck = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'bank_transaction_matches' AND column_name = 'company_id'
    `);

    if (matchesCheck.rows.length === 0) {
      console.log('[Migration] Adding company_id to bank_transaction_matches...');
      await db.execute(sql`
        ALTER TABLE bank_transaction_matches
        ADD COLUMN company_id INTEGER REFERENCES companies(id)
      `);

      // Backfill from imported_transaction's company_id
      await db.execute(sql`
        UPDATE bank_transaction_matches btm
        SET company_id = it.company_id
        FROM imported_transactions it
        WHERE btm.imported_transaction_id = it.id AND it.company_id IS NOT NULL
      `);

      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_bank_transaction_matches_company_id ON bank_transaction_matches(company_id)
      `);
      console.log('[Migration] bank_transaction_matches updated successfully');
    } else {
      console.log('[Migration] company_id already exists in bank_transaction_matches');
    }

    console.log('[Migration] All additional tables updated successfully!');
  } catch (error) {
    console.error('[Migration] Error adding company scoping to additional tables:', error);
    throw error;
  }
}

// Run migration if executed directly
if (require.main === module) {
  addCompanyScopingToAdditionalTables()
    .then(() => {
      console.log('[Migration] Done');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Migration] Failed:', error);
      process.exit(1);
    });
}
