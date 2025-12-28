/**
 * Migration: Add Company Scoping to Core Tables
 *
 * CRITICAL: This migration adds company isolation to all core data tables.
 * All data will be scoped to companies for multi-tenant security.
 *
 * Tables affected:
 * - accounts
 * - contacts
 * - transactions
 * - sales_taxes
 * - products
 * - bank_connections
 * - imported_transactions
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

export async function addCompanyScopingToCoreTables(): Promise<void> {
  console.log('[Migration] Starting company scoping migration for core tables...');

  try {
    // IMPORTANT: Get the company that users are actually assigned to
    // This ensures existing data is backfilled to the right company that users log into
    let defaultCompanyId: number;

    // First, try to find the company that users are assigned to
    const userCompanyResult = await db.execute(sql`
      SELECT company_id FROM user_companies
      WHERE company_id IS NOT NULL
      ORDER BY is_primary DESC, created_at ASC
      LIMIT 1
    `);

    if (userCompanyResult.rows.length > 0 && (userCompanyResult.rows[0] as any).company_id) {
      defaultCompanyId = (userCompanyResult.rows[0] as any).company_id;
      console.log(`[Migration] Found user-assigned company ID ${defaultCompanyId}`);
    } else {
      // If no user-company assignments, try to find the default company
      const defaultCompany = await db.execute(sql`
        SELECT id FROM companies WHERE is_default = true LIMIT 1
      `);

      if (defaultCompany.rows.length > 0) {
        defaultCompanyId = (defaultCompany.rows[0] as any).id;
        console.log(`[Migration] Found default company ID ${defaultCompanyId}`);
      } else {
        // Fall back to first company by ID
        const companiesResult = await db.execute(sql`
          SELECT id FROM companies ORDER BY id LIMIT 1
        `);

        if (companiesResult.rows.length === 0) {
          console.log('[Migration] No companies found, creating default company...');
          const newCompany = await db.execute(sql`
            INSERT INTO companies (name, company_code, is_default)
            VALUES ('Default Company', 'VED-DEFAULT', true)
            RETURNING id
          `);
          defaultCompanyId = (newCompany.rows[0] as any).id;
        } else {
          defaultCompanyId = (companiesResult.rows[0] as any).id;
        }
      }
    }

    console.log(`[Migration] Using company ID ${defaultCompanyId} for backfill`);

    // ===== ACCOUNTS TABLE =====
    const checkAccountsCompanyId = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'accounts' AND column_name = 'company_id'
    `);

    if (checkAccountsCompanyId.rows.length === 0) {
      console.log('[Migration] Adding company_id to accounts table...');
      await db.execute(sql`ALTER TABLE accounts ADD COLUMN company_id INTEGER`);
      await db.execute(sql`UPDATE accounts SET company_id = ${defaultCompanyId} WHERE company_id IS NULL`);
      await db.execute(sql`
        ALTER TABLE accounts
        ADD CONSTRAINT fk_accounts_company
        FOREIGN KEY (company_id) REFERENCES companies(id)
      `);
      await db.execute(sql`CREATE INDEX idx_accounts_company_id ON accounts(company_id)`);
    } else {
      // Column exists - ensure data is assigned to the correct company
      console.log('[Migration] accounts.company_id exists, checking for data repair...');
      await db.execute(sql`UPDATE accounts SET company_id = ${defaultCompanyId} WHERE company_id IS NULL`);
      // Also repair any records that were assigned to a non-existent company
      await db.execute(sql`
        UPDATE accounts SET company_id = ${defaultCompanyId}
        WHERE company_id NOT IN (SELECT id FROM companies)
      `);
    }

    // ===== CONTACTS TABLE =====
    const checkContactsCompanyId = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'contacts' AND column_name = 'company_id'
    `);

    if (checkContactsCompanyId.rows.length === 0) {
      console.log('[Migration] Adding company_id to contacts table...');
      await db.execute(sql`ALTER TABLE contacts ADD COLUMN company_id INTEGER`);
      await db.execute(sql`UPDATE contacts SET company_id = ${defaultCompanyId} WHERE company_id IS NULL`);
      await db.execute(sql`
        ALTER TABLE contacts
        ADD CONSTRAINT fk_contacts_company
        FOREIGN KEY (company_id) REFERENCES companies(id)
      `);
      await db.execute(sql`CREATE INDEX idx_contacts_company_id ON contacts(company_id)`);
    } else {
      console.log('[Migration] contacts.company_id exists, checking for data repair...');
      await db.execute(sql`UPDATE contacts SET company_id = ${defaultCompanyId} WHERE company_id IS NULL`);
      await db.execute(sql`
        UPDATE contacts SET company_id = ${defaultCompanyId}
        WHERE company_id NOT IN (SELECT id FROM companies)
      `);
    }

    // ===== TRANSACTIONS TABLE =====
    const checkTransactionsCompanyId = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'transactions' AND column_name = 'company_id'
    `);

    if (checkTransactionsCompanyId.rows.length === 0) {
      console.log('[Migration] Adding company_id to transactions table...');
      await db.execute(sql`ALTER TABLE transactions ADD COLUMN company_id INTEGER`);
      await db.execute(sql`UPDATE transactions SET company_id = ${defaultCompanyId} WHERE company_id IS NULL`);
      await db.execute(sql`
        ALTER TABLE transactions
        ADD CONSTRAINT fk_transactions_company
        FOREIGN KEY (company_id) REFERENCES companies(id)
      `);
      await db.execute(sql`CREATE INDEX idx_transactions_company_id ON transactions(company_id)`);
    } else {
      console.log('[Migration] transactions.company_id exists, checking for data repair...');
      await db.execute(sql`UPDATE transactions SET company_id = ${defaultCompanyId} WHERE company_id IS NULL`);
      await db.execute(sql`
        UPDATE transactions SET company_id = ${defaultCompanyId}
        WHERE company_id NOT IN (SELECT id FROM companies)
      `);
    }

    // ===== SALES_TAXES TABLE =====
    const checkSalesTaxesCompanyId = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'sales_taxes' AND column_name = 'company_id'
    `);

    if (checkSalesTaxesCompanyId.rows.length === 0) {
      console.log('[Migration] Adding company_id to sales_taxes table...');
      await db.execute(sql`ALTER TABLE sales_taxes ADD COLUMN company_id INTEGER`);
      await db.execute(sql`UPDATE sales_taxes SET company_id = ${defaultCompanyId} WHERE company_id IS NULL`);
      await db.execute(sql`
        ALTER TABLE sales_taxes
        ADD CONSTRAINT fk_sales_taxes_company
        FOREIGN KEY (company_id) REFERENCES companies(id)
      `);
      await db.execute(sql`CREATE INDEX idx_sales_taxes_company_id ON sales_taxes(company_id)`);
    } else {
      console.log('[Migration] sales_taxes.company_id exists, checking for data repair...');
      await db.execute(sql`UPDATE sales_taxes SET company_id = ${defaultCompanyId} WHERE company_id IS NULL`);
      await db.execute(sql`
        UPDATE sales_taxes SET company_id = ${defaultCompanyId}
        WHERE company_id NOT IN (SELECT id FROM companies)
      `);
    }

    // ===== PRODUCTS TABLE =====
    const checkProductsCompanyId = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'products' AND column_name = 'company_id'
    `);

    if (checkProductsCompanyId.rows.length === 0) {
      console.log('[Migration] Adding company_id to products table...');
      await db.execute(sql`ALTER TABLE products ADD COLUMN company_id INTEGER`);
      await db.execute(sql`UPDATE products SET company_id = ${defaultCompanyId} WHERE company_id IS NULL`);
      await db.execute(sql`
        ALTER TABLE products
        ADD CONSTRAINT fk_products_company
        FOREIGN KEY (company_id) REFERENCES companies(id)
      `);
      await db.execute(sql`CREATE INDEX idx_products_company_id ON products(company_id)`);
    } else {
      console.log('[Migration] products.company_id exists, checking for data repair...');
      await db.execute(sql`UPDATE products SET company_id = ${defaultCompanyId} WHERE company_id IS NULL`);
      await db.execute(sql`
        UPDATE products SET company_id = ${defaultCompanyId}
        WHERE company_id NOT IN (SELECT id FROM companies)
      `);
    }

    // ===== BANK_CONNECTIONS TABLE =====
    const checkBankConnectionsCompanyId = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'bank_connections' AND column_name = 'company_id'
    `);

    if (checkBankConnectionsCompanyId.rows.length === 0) {
      console.log('[Migration] Adding company_id to bank_connections table...');
      await db.execute(sql`ALTER TABLE bank_connections ADD COLUMN company_id INTEGER`);
      await db.execute(sql`UPDATE bank_connections SET company_id = ${defaultCompanyId} WHERE company_id IS NULL`);
      await db.execute(sql`
        ALTER TABLE bank_connections
        ADD CONSTRAINT fk_bank_connections_company
        FOREIGN KEY (company_id) REFERENCES companies(id)
      `);
      await db.execute(sql`CREATE INDEX idx_bank_connections_company_id ON bank_connections(company_id)`);
    } else {
      console.log('[Migration] bank_connections.company_id exists, checking for data repair...');
      await db.execute(sql`UPDATE bank_connections SET company_id = ${defaultCompanyId} WHERE company_id IS NULL`);
      await db.execute(sql`
        UPDATE bank_connections SET company_id = ${defaultCompanyId}
        WHERE company_id NOT IN (SELECT id FROM companies)
      `);
    }

    // ===== IMPORTED_TRANSACTIONS TABLE =====
    const checkImportedTransactionsCompanyId = await db.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'imported_transactions' AND column_name = 'company_id'
    `);

    if (checkImportedTransactionsCompanyId.rows.length === 0) {
      console.log('[Migration] Adding company_id to imported_transactions table...');
      await db.execute(sql`ALTER TABLE imported_transactions ADD COLUMN company_id INTEGER`);
      await db.execute(sql`UPDATE imported_transactions SET company_id = ${defaultCompanyId} WHERE company_id IS NULL`);
      await db.execute(sql`
        ALTER TABLE imported_transactions
        ADD CONSTRAINT fk_imported_transactions_company
        FOREIGN KEY (company_id) REFERENCES companies(id)
      `);
      await db.execute(sql`CREATE INDEX idx_imported_transactions_company_id ON imported_transactions(company_id)`);
    } else {
      console.log('[Migration] imported_transactions.company_id exists, checking for data repair...');
      await db.execute(sql`UPDATE imported_transactions SET company_id = ${defaultCompanyId} WHERE company_id IS NULL`);
      await db.execute(sql`
        UPDATE imported_transactions SET company_id = ${defaultCompanyId}
        WHERE company_id NOT IN (SELECT id FROM companies)
      `);
    }

    console.log('[Migration] Company scoping migration completed successfully!');
  } catch (error) {
    console.error('[Migration] Error during company scoping migration:', error);
    throw error;
  }
}
