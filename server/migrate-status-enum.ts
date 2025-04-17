import { pool } from "./db";

/**
 * Migration script to update status enum in the database to include 'unapplied_credit'
 */
async function migrateStatusEnum() {
  console.log("Starting migration to update status enum...");
  
  try {
    // Check if unapplied_credit is already in the enum type
    const checkQuery = `
      SELECT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'unapplied_credit'
        AND enumtypid = (
          SELECT oid FROM pg_type WHERE typname = 'status'
        )
      );
    `;
    
    const checkResult = await pool.query(checkQuery);
    
    if (checkResult.rows[0].exists) {
      console.log("'unapplied_credit' value already exists in status enum. Skipping migration.");
      return;
    }
    
    console.log("Adding 'unapplied_credit' to status enum type...");
    
    // Add the new enum value
    await pool.query(`
      ALTER TYPE status ADD VALUE IF NOT EXISTS 'unapplied_credit';
    `);
    
    console.log("Status enum migration completed successfully!");
  } catch (error) {
    console.error("Error migrating status enum:", error);
    throw error;
  }
}

export default migrateStatusEnum;