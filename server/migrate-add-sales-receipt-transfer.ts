import { db } from './db';
import { sql } from 'drizzle-orm';

async function migrateAddSalesReceiptTransfer() {
  console.log("Starting migration to add 'sales_receipt' and 'transfer' to transaction_type enum...");
  
  try {
    const checkValues = await db.execute(sql`
      SELECT e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname = 'transaction_type'
    `);
    
    console.log("Existing transaction_type enum values:", checkValues.rows.map((row: any) => row.enumlabel));
    
    const hasSalesReceipt = checkValues.rows.some((row: any) => row.enumlabel === 'sales_receipt');
    const hasTransfer = checkValues.rows.some((row: any) => row.enumlabel === 'transfer');
    
    if (!hasSalesReceipt) {
      console.log("Adding 'sales_receipt' to transaction_type enum...");
      await db.execute(sql`
        ALTER TYPE transaction_type ADD VALUE 'sales_receipt'
      `);
      console.log("Successfully added 'sales_receipt' to transaction_type enum.");
    } else {
      console.log("'sales_receipt' value already exists in transaction_type enum. Skipping.");
    }
    
    if (!hasTransfer) {
      console.log("Adding 'transfer' to transaction_type enum...");
      await db.execute(sql`
        ALTER TYPE transaction_type ADD VALUE 'transfer'
      `);
      console.log("Successfully added 'transfer' to transaction_type enum.");
    } else {
      console.log("'transfer' value already exists in transaction_type enum. Skipping.");
    }
    
    console.log("Migration completed successfully!");
    
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

export default migrateAddSalesReceiptTransfer;
