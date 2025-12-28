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
    // Get default company ID for backfill (first company or create one)
    const companiesResult = await db.execute(sql`
      SELECT id FROM companies ORDER BY id LIMIT 1
    `);

    let defaultCompanyId: number;
    if (companiesResult.rows.length === 0) {
      console.log('[Migration] No companies found, creating default company...');
      const newCompany = await db.execute(sql`
        INSERT INTO companies (name, company_code)
        VALUES ('Default Company', 'VED-DEFAULT')
        RETURNING id
      `);
      defaultCompanyId = (newCompany.rows[0] as any).id;
    } else {
      defaultCompanyId = (companiesResult.rows[0] as any).id;
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
      console.log('[Migration] accounts.company_id already exists, skipping...');
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
      console.log('[Migration] contacts.company_id already exists, skipping...');
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
      console.log('[Migration] transactions.company_id already exists, skipping...');
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
      console.log('[Migration] sales_taxes.company_id already exists, skipping...');
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
      console.log('[Migration] products.company_id already exists, skipping...');
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
      console.log('[Migration] bank_connections.company_id already exists, skipping...');
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
      console.log('[Migration] imported_transactions.company_id already exists, skipping...');
    }

    console.log('[Migration] Company scoping migration completed successfully!');
  } catch (error) {
    console.error('[Migration] Error during company scoping migration:', error);
    throw error;
  }
}
