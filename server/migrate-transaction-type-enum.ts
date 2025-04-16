import { db } from './db';
import { sql } from 'drizzle-orm';

/**
 * Migration script to update transaction_type enum in the database
 */
async function migrateTransactionTypeEnum() {
  console.log("Starting migration to update transaction_type enum in the database...");
  
  try {
    // First check for 'payment' value in the existing enum
    const checkValues = await db.execute(sql`
      SELECT e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname = 'transaction_type'
    `);
    
    // Log all existing values
    console.log("Existing transaction_type enum values:", checkValues.rows.map((row: any) => row.enumlabel));
    
    // If 'payment' already exists, no need to update
    const hasPayment = checkValues.rows.some((row: any) => row.enumlabel === 'payment');
    
    if (hasPayment) {
      console.log("Enum value 'payment' already exists. Skipping.");
      return;
    }
    
    console.log("Adding 'payment' to transaction_type enum...");
    
    // Add the new enum value - this is the safe way to add a value to an existing enum
    await db.execute(sql`
      ALTER TYPE transaction_type ADD VALUE 'payment' AFTER 'deposit'
    `);
    
    console.log("Successfully added 'payment' to transaction_type enum.");
    
  } catch (error) {
    console.error("Migration failed:", error);
    console.error("Migration error details:", error);
    
    // If there was an error, let's try a different approach
    if ((error as any).code === '42710') {
      console.log("Error suggests type already exists. Trying alternative approach...");
      
      try {
        // Create a temporary enum type
        await db.execute(sql`
          CREATE TYPE transaction_type_new AS ENUM (
            'invoice', 'expense', 'journal_entry', 'deposit', 'payment'
          )
        `);
        
        // Update the column to use the new type
        await db.execute(sql`
          ALTER TABLE transactions
          ALTER COLUMN type TYPE transaction_type_new USING type::text::transaction_type_new
        `);
        
        // Drop the old type
        await db.execute(sql`
          DROP TYPE transaction_type
        `);
        
        // Rename the new type to the old name
        await db.execute(sql`
          ALTER TYPE transaction_type_new RENAME TO transaction_type
        `);
        
        console.log("Successfully replaced transaction_type enum with new version including 'payment'.");
      } catch (err) {
        console.error("Alternative migration approach failed:", err);
      }
    }
  }
}

// Export the migration function
export default migrateTransactionTypeEnum;