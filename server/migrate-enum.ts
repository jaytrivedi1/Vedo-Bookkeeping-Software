import { db } from './db';
import { sql } from 'drizzle-orm';

/**
 * Migration script to update status enum in the database
 */
async function migrateEnum() {
  console.log("Starting migration to update status enum in the database...");
  
  try {
    // First check for 'partial' value in the existing enum
    const checkValues = await db.execute(sql`
      SELECT e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname = 'status'
    `);
    
    // If 'partial' already exists, no need to update
    const hasPartial = checkValues.rows.some((row: any) => row.enumlabel === 'partial');
    
    if (hasPartial) {
      console.log("Enum value 'partial' already exists. Skipping.");
      return;
    }
    
    console.log("Adding 'partial' to status enum...");
    
    // Add the new enum value - this is the safe way to add a value to an existing enum
    await db.execute(sql`
      ALTER TYPE status ADD VALUE 'partial' AFTER 'overdue'
    `);
    
    console.log("Successfully added 'partial' to status enum.");
    
  } catch (error) {
    console.error("Migration failed:", error);
    console.error("Migration error details:", error);
    
    // If there was an error, let's try a different approach
    if ((error as any).code === '42710') {
      console.log("Error suggests type already exists. Trying alternative approach...");
      
      try {
        // Create a temporary enum type
        await db.execute(sql`
          CREATE TYPE status_new AS ENUM (
            'draft', 'pending', 'completed', 'cancelled', 'paid', 'overdue', 'partial'
          )
        `);
        
        // Update the column to use the new type
        await db.execute(sql`
          ALTER TABLE transactions
          ALTER COLUMN status TYPE status_new USING status::text::status_new
        `);
        
        // Drop the old type
        await db.execute(sql`
          DROP TYPE status
        `);
        
        // Rename the new type to the old name
        await db.execute(sql`
          ALTER TYPE status_new RENAME TO status
        `);
        
        console.log("Successfully replaced status enum with new version including 'partial'.");
      } catch (err) {
        console.error("Alternative migration approach failed:", err);
      }
    }
  }
}

// Export the migration function
export default migrateEnum;