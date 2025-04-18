import { db, pool } from './db';
import { eq } from 'drizzle-orm';
import { transactions } from '@shared/schema';

// Script to update status enum and convert 'pending' to 'open'
export async function migrateStatusEnum() {
  console.log('Starting migration to update status enum and convert pending to open...');
  
  try {
    // Check if the 'open' value already exists in status enum
    const checkResult = await pool.query(`
      SELECT 
        enumlabel 
      FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE pg_type.typname = 'status' AND enumlabel = 'open'
    `);
    
    if (checkResult.rows.length === 0) {
      // Add 'open' value to the status enum
      await pool.query(`
        ALTER TYPE status ADD VALUE IF NOT EXISTS 'open';
      `);
      
      console.log("Added 'open' value to status enum");
      
      // Update all invoices with status 'pending' to 'open'
      const result = await db.update(transactions)
        .set({ status: 'open' })
        .where(
          eq(transactions.type, 'invoice'),
          eq(transactions.status, 'pending')
        )
        .returning({ id: transactions.id });
      
      console.log(`Updated ${result.length} invoice statuses from 'pending' to 'open'`);
    } else {
      console.log("'open' value already exists in status enum. Checking for pending invoices...");
      
      // Just update any remaining pending invoices
      const result = await db.update(transactions)
        .set({ status: 'open' })
        .where(
          eq(transactions.type, 'invoice'),
          eq(transactions.status, 'pending')
        )
        .returning({ id: transactions.id });
      
      console.log(`Updated ${result.length} invoice statuses from 'pending' to 'open'`);
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}