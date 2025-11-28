import { db } from './db';
import { sql } from 'drizzle-orm';

async function migrateCompanyTable() {
  console.log('Starting migration to create companies table...');
  
  try {
    // Check if companies table exists using raw SQL
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'companies'
      )
    `);
    
    if (!tableExists.rows[0]?.exists) {
      // Create companies table with base columns (company_code added by separate migration)
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS companies (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          address TEXT,
          phone TEXT,
          email TEXT,
          website TEXT,
          tax_id TEXT,
          logo_url TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          is_default BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log('Companies table created successfully.');
    } else {
      console.log('Companies table already exists. Checking for default company...');
    }
    
    // Check if default company exists using raw SQL
    const defaultCompanies = await db.execute(sql`
      SELECT id FROM companies WHERE is_default = true LIMIT 1
    `);
    
    if (defaultCompanies.rows.length === 0) {
      // Create default company using raw SQL
      await db.execute(sql`
        INSERT INTO companies (name, phone, email, is_default)
        VALUES ('My Company', '(555) 123-4567', 'contact@mycompany.com', true)
      `);
      console.log('Default company created successfully.');
    } else {
      console.log('Default company already exists.');
    }
    
    console.log('Company migration completed successfully!');
  } catch (err) {
    console.error('Error during company migration:', err);
    throw err;
  }
}

export { migrateCompanyTable };