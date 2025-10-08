import { db } from './db';
import { sql } from 'drizzle-orm';

/**
 * Migration script to add 'cheque' to transaction_type enum
 */
async function migrateChequeTransactionType() {
  console.log("Starting migration to add 'cheque' to transaction_type enum...");
  
  try {
    // Check for existing enum values
    const checkValues = await db.execute(sql`
      SELECT e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname = 'transaction_type'
    `);
    
    // Log all existing values
    console.log("Existing transaction_type enum values:", checkValues.rows.map((row: any) => row.enumlabel));
    
    // If 'cheque' already exists, no need to update
    const hasCheque = checkValues.rows.some((row: any) => row.enumlabel === 'cheque');
    
    if (hasCheque) {
      console.log("'cheque' value already exists in transaction_type enum. Skipping.");
      return;
    }
    
    console.log("Adding 'cheque' to transaction_type enum...");
    
    // Add the new enum value
    await db.execute(sql`
      ALTER TYPE transaction_type ADD VALUE 'cheque'
    `);
    
    console.log("Successfully added 'cheque' to transaction_type enum.");
    
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// Export the migration function
export default migrateChequeTransactionType;
