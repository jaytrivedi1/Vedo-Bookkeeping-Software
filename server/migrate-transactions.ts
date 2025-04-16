import { db } from './db';
import { sql } from 'drizzle-orm';

/**
 * Migration script to add balance column to transactions table
 */
async function migrateTransactions() {
  console.log("Starting migration to add balance column to transactions table...");
  
  try {
    // Check if the balance column already exists
    const checkColumnExists = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'transactions' AND column_name = 'balance'
    `);
    
    if (checkColumnExists.rows.length > 0) {
      console.log("balance column already exists. Skipping.");
      return;
    }
    
    // Add the balance column to the transactions table
    await db.execute(sql`
      ALTER TABLE transactions
      ADD COLUMN balance DOUBLE PRECISION
    `);
    
    console.log("Added balance column to transactions table.");
    
    // Update existing invoices to have balance equal to amount
    await db.execute(sql`
      UPDATE transactions
      SET balance = amount
      WHERE type = 'invoice' AND (status = 'pending' OR status = 'overdue')
    `);
    
    console.log("Updated balance for existing invoices.");
    
    // Set balance to 0 for paid invoices
    await db.execute(sql`
      UPDATE transactions
      SET balance = 0
      WHERE type = 'invoice' AND status = 'paid'
    `);
    
    console.log("Set balance to 0 for paid invoices.");
    
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

// Export the migration function so it can be imported and run from other files
export default migrateTransactions;