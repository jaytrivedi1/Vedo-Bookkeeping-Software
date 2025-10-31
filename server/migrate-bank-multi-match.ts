import { db } from './db';
import { sql } from 'drizzle-orm';

export async function migrateBankMultiMatch() {
  console.log('Starting migration to add multi-match support for bank feeds...');
  
  try {
    // Add isMultiMatch column to imported_transactions
    try {
      await db.execute(sql`
        ALTER TABLE imported_transactions 
        ADD COLUMN IF NOT EXISTS is_multi_match BOOLEAN DEFAULT false
      `);
      console.log('Added is_multi_match column to imported_transactions');
    } catch (error) {
      console.log('is_multi_match column already exists or error adding it:', error);
    }

    // Create bank_transaction_matches table
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS bank_transaction_matches (
          id SERIAL PRIMARY KEY,
          imported_transaction_id INTEGER NOT NULL REFERENCES imported_transactions(id),
          matched_transaction_id INTEGER NOT NULL REFERENCES transactions(id),
          amount_applied DOUBLE PRECISION NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      console.log('Created bank_transaction_matches table');
    } catch (error) {
      console.log('bank_transaction_matches table already exists or error creating it:', error);
    }

    console.log('Migration completed successfully!');
    return { success: true };
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}
