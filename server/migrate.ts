import { db } from "./db";
import { sql } from "drizzle-orm";

/**
 * Special migration script to update account types and related schema
 */
async function migrate() {
  console.log("Starting migration...");

  try {
    console.log("Backing up existing accounts...");
    // First, get all existing accounts
    const existingAccounts = await db.execute(sql`SELECT * FROM accounts`);
    console.log(`Backed up ${existingAccounts.rows.length} accounts`);

    // Map old account types to new account types
    const typeMapping: Record<string, string> = {
      'asset': 'current_assets', // Default fallback for assets
      'liability': 'other_current_liabilities', // Default fallback for liabilities
      'equity': 'equity',
      'income': 'income',
      'expense': 'expenses'
    };

    // More specific mappings for certain accounts based on their names or codes
    const specificMappings: Record<string, string> = {
      '1000': 'bank',
      '1100': 'accounts_receivable',
      '2000': 'accounts_payable',
      '4200': 'other_income',
      '5000': 'cost_of_goods_sold'
    };

    console.log("Dropping account type enum and recreating tables...");
    
    // We need to drop the accounts table first as it depends on the enum, and then ledger_entries as it depends on accounts
    await db.execute(sql`DROP TABLE IF EXISTS ledger_entries CASCADE`);
    await db.execute(sql`DROP TABLE IF EXISTS accounts CASCADE`);
    await db.execute(sql`DROP TYPE IF EXISTS account_type CASCADE`);
    
    // Create the new enum type with all the specified account types
    await db.execute(sql`
      CREATE TYPE account_type AS ENUM (
        'accounts_receivable', 'current_assets', 'bank', 'property_plant_equipment', 'long_term_assets',
        'accounts_payable', 'credit_card', 'other_current_liabilities', 'long_term_liabilities',
        'equity', 'income', 'other_income', 'cost_of_goods_sold', 'expenses', 'other_expense'
      )
    `);

    // Recreate the accounts table
    await db.execute(sql`
      CREATE TABLE accounts (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        type account_type NOT NULL,
        description TEXT,
        balance DOUBLE PRECISION NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true
      )
    `);

    // Recreate the ledger_entries table with foreign key reference
    await db.execute(sql`
      CREATE TABLE ledger_entries (
        id SERIAL PRIMARY KEY,
        transaction_id INTEGER NOT NULL REFERENCES transactions(id),
        account_id INTEGER NOT NULL REFERENCES accounts(id),
        description TEXT,
        debit DOUBLE PRECISION NOT NULL DEFAULT 0,
        credit DOUBLE PRECISION NOT NULL DEFAULT 0,
        date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("Reinsert accounts with new types...");
    
    // Reinsert the accounts with the new types
    for (const account of existingAccounts.rows) {
      let newType = specificMappings[account.code] || typeMapping[account.type] || 'current_assets';
      
      await db.execute(sql`
        INSERT INTO accounts (id, code, name, type, description, balance, is_active)
        VALUES (${account.id}, ${account.code}, ${account.name}, ${newType}::account_type, ${account.description}, ${account.balance}, ${account.is_active})
      `);
    }

    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// Run directly when this file is executed
console.log("Running migration script...");
process.stdout.write("This is a direct write to stdout\n");
process.stderr.write("This is a direct write to stderr\n");

// Always run the migration regardless of how the script is invoked
migrate()
  .then(() => {
    console.log("Migration completed successfully");
    process.stdout.write("Migration done - direct stdout write\n");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error during migration:", error);
    process.stderr.write(`Migration error: ${error}\n`);
    process.exit(1);
  });

export { migrate };