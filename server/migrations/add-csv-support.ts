import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function addCsvSupport() {
  console.log("Starting migration to add CSV upload support...");

  try {
    // Add source column to imported_transactions
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'imported_transactions' 
          AND column_name = 'source'
        ) THEN
          ALTER TABLE imported_transactions 
          ADD COLUMN source TEXT NOT NULL DEFAULT 'plaid';
        END IF;
      END $$;
    `;
    console.log("Added source column");

    // Add accountId column for CSV imports (chart of accounts link)
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'imported_transactions' 
          AND column_name = 'account_id'
        ) THEN
          ALTER TABLE imported_transactions 
          ADD COLUMN account_id INTEGER REFERENCES accounts(id);
        END IF;
      END $$;
    `;
    console.log("Added account_id column");

    // Make bankAccountId nullable for CSV imports
    await sql`
      ALTER TABLE imported_transactions 
      ALTER COLUMN bank_account_id DROP NOT NULL;
    `;
    console.log("Made bank_account_id nullable");

    // Make plaidTransactionId nullable for CSV imports
    await sql`
      ALTER TABLE imported_transactions 
      ALTER COLUMN plaid_transaction_id DROP NOT NULL;
    `;
    console.log("Made plaid_transaction_id nullable");

    // Create CSV mapping preferences table
    await sql`
      CREATE TABLE IF NOT EXISTS csv_mapping_preferences (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        account_id INTEGER NOT NULL REFERENCES accounts(id),
        date_column TEXT NOT NULL,
        description_column TEXT NOT NULL,
        amount_column TEXT,
        credit_column TEXT,
        debit_column TEXT,
        date_format TEXT NOT NULL DEFAULT 'MM/DD/YYYY',
        has_header_row BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    console.log("Created csv_mapping_preferences table");

    console.log("CSV support migration completed successfully!");
  } catch (error) {
    console.error("Error in CSV support migration:", error);
    throw error;
  }
}
