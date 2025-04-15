import { db } from './db';
import { companiesSchema } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

async function migrateCompanyTable() {
  console.log('Starting migration to create companies table...');
  
  try {
    // Check if companies table exists
    try {
      await db.select().from(companiesSchema).limit(1);
      console.log('Companies table already exists. Checking for default company...');
    } catch (err) {
      // Create companies table
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
    }
    
    // Check if default company exists
    const defaultCompanies = await db.select()
      .from(companiesSchema)
      .where(eq(companiesSchema.isDefault, true));
    
    if (defaultCompanies.length === 0) {
      // Create default company
      await db.insert(companiesSchema).values({
        name: 'My Company',
        address: '123 Main St, City, Country',
        phone: '(555) 123-4567',
        email: 'contact@mycompany.com',
        isDefault: true
      });
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