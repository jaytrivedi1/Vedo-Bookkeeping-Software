import { db } from "./db";
import { sql } from "drizzle-orm";
import { log } from "./vite";

/**
 * Migration script to add sales_tax_id column to line_items table
 */
async function migrateLineItems() {
  try {
    log("Starting migration to add sales_tax_id column to line_items table...", "migrate");

    // Check if the column already exists
    const checkColumn = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'line_items' AND column_name = 'sales_tax_id'
    `);

    if (checkColumn.rows.length === 0) {
      log("Adding sales_tax_id column to line_items table...", "migrate");
      
      // Add the sales_tax_id column
      await db.execute(sql`
        ALTER TABLE line_items 
        ADD COLUMN sales_tax_id INTEGER REFERENCES sales_taxes(id)
      `);
      
      log("sales_tax_id column added successfully!", "migrate");
    } else {
      log("sales_tax_id column already exists. Skipping.", "migrate");
    }

    log("Migration completed successfully!", "migrate");
  } catch (error) {
    log(`Migration failed: ${error}`, "migrate");
    throw error;
  }
}

export default migrateLineItems;