import { db, pool } from './db';
import { log } from './vite';
import { eq } from 'drizzle-orm';
import { transactions } from '@shared/schema';

// Migration to add 'open' status to the enum
export default async function migrateStatusEnum() {
  try {
    log('Starting migration to update status enum...');
    
    // First check if 'open' already exists in the status enum
    const checkOpenResult = await pool.query(`
      SELECT 
        enumlabel 
      FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE pg_type.typname = 'status' AND enumlabel = 'open'
    `);
    
    if (checkOpenResult.rows.length === 0) {
      // Add 'open' value to the status enum if it doesn't exist
      await pool.query(`
        ALTER TYPE status ADD VALUE IF NOT EXISTS 'open';
      `);
      
      log("Added 'open' value to status enum");
      
      // Update all invoices with status 'pending' to 'open'
      const result = await pool.query(`
        UPDATE transactions
        SET status = 'open'
        WHERE type = 'invoice' AND status = 'pending'
        RETURNING id
      `);
      
      log(`Updated ${result.rowCount} invoice statuses from 'pending' to 'open'`);
    } else {
      log("'open' value already exists in status enum.");
      
      // Even if the enum exists, make sure all pending invoices are updated to open
      const result = await pool.query(`
        UPDATE transactions
        SET status = 'open'
        WHERE type = 'invoice' AND status = 'pending'
        RETURNING id
      `);
      
      log(`Updated ${result.rowCount} invoice statuses from 'pending' to 'open'`);
    }
    
    log('Status enum migration completed successfully!');
  } catch (error) {
    console.error('Error in status enum migration:', error);
    log(`Error in status enum migration: ${error}`);
    throw error;
  }
}