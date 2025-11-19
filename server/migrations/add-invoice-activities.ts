import { db } from "../db";
import { sql } from "drizzle-orm";

export async function migrateInvoiceActivities() {
  console.log("Starting migration to add invoice activities support...");

  try {
    // Add secureToken column to transactions table if it doesn't exist
    const hasSecureToken = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'transactions' 
      AND column_name = 'secure_token'
    `);

    if (hasSecureToken.rows.length === 0) {
      console.log("Adding secure_token column to transactions table...");
      await db.execute(sql`
        ALTER TABLE transactions 
        ADD COLUMN secure_token VARCHAR(64) UNIQUE
      `);
      console.log("secure_token column added successfully");
    } else {
      console.log("secure_token column already exists. Skipping.");
    }

    // Create invoice_activities table if it doesn't exist
    const hasTable = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'invoice_activities'
    `);

    if (hasTable.rows.length === 0) {
      console.log("Creating invoice_activities table...");
      await db.execute(sql`
        CREATE TABLE invoice_activities (
          id SERIAL PRIMARY KEY,
          invoice_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
          activity_type VARCHAR(50) NOT NULL,
          user_id INTEGER REFERENCES users(id),
          metadata JSONB,
          timestamp TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      
      // Create index for faster lookups
      await db.execute(sql`
        CREATE INDEX idx_invoice_activities_invoice_id 
        ON invoice_activities(invoice_id)
      `);
      
      await db.execute(sql`
        CREATE INDEX idx_invoice_activities_timestamp 
        ON invoice_activities(timestamp DESC)
      `);
      
      console.log("invoice_activities table created successfully");
    } else {
      console.log("invoice_activities table already exists. Skipping.");
    }

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration error:", error);
    throw error;
  }
}
