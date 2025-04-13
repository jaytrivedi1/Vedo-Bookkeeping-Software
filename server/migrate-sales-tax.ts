import { pool, db } from "./db";
import { salesTaxSchema } from "@shared/schema";
import { sql } from "drizzle-orm";

async function migrateSalesTax() {
  console.log("Starting sales tax migration...");
  
  try {
    // Check if the sales_taxes table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sales_taxes'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log("Creating sales_taxes table...");
      
      // Create the sales_taxes table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS sales_taxes (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          rate DOUBLE PRECISION NOT NULL DEFAULT 0,
          account_id INTEGER REFERENCES accounts(id),
          is_active BOOLEAN DEFAULT TRUE
        );
      `);
      
      console.log("Sales_taxes table created successfully");
      
      // Insert some default sales tax entries
      await db.insert(salesTaxSchema).values([
        {
          name: "GST/HST",
          description: "Goods and Services Tax / Harmonized Sales Tax",
          rate: 5.0,
          isActive: true
        },
        {
          name: "PST",
          description: "Provincial Sales Tax",
          rate: 7.0,
          isActive: true
        },
        {
          name: "QST",
          description: "Quebec Sales Tax",
          rate: 9.975,
          isActive: true
        }
      ]);
      
      console.log("Default sales tax entries created");
    } else {
      console.log("Sales_taxes table already exists");
    }
    
    console.log("Sales tax migration completed successfully");
  } catch (error) {
    console.error("Error during sales tax migration:", error);
    throw error;
  } finally {
    // We don't close the pool here since it's used elsewhere in the application
  }
}

// Run the migration
migrateSalesTax()
  .then(() => console.log("Migration script completed"))
  .catch((error) => {
    console.error("Migration script failed:", error);
    process.exit(1);
  });