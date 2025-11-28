import { db } from "../db";
import { sql } from "drizzle-orm";
import { generateCompanyCode } from "../utils/company-code";

export async function addCompanyCodeMigration() {
  console.log("Starting migration to add company_code column...");

  try {
    const checkColumn = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'companies' AND column_name = 'company_code'
    `);

    if (checkColumn.rows.length === 0) {
      await db.execute(sql`
        ALTER TABLE companies ADD COLUMN company_code TEXT UNIQUE
      `);
      console.log("Added company_code column");
    } else {
      console.log("company_code column already exists. Skipping.");
    }

    const companiesWithoutCode = await db.execute(sql`
      SELECT id FROM companies WHERE company_code IS NULL
    `);

    console.log(`Found ${companiesWithoutCode.rows.length} companies without codes`);

    for (const row of companiesWithoutCode.rows) {
      const companyId = row.id as number;
      let code = generateCompanyCode();
      let attempts = 0;
      
      while (attempts < 10) {
        const existing = await db.execute(sql`
          SELECT id FROM companies WHERE company_code = ${code}
        `);
        
        if (existing.rows.length === 0) {
          break;
        }
        
        code = generateCompanyCode();
        attempts++;
      }

      await db.execute(sql`
        UPDATE companies SET company_code = ${code} WHERE id = ${companyId}
      `);
      console.log(`Assigned code ${code} to company ${companyId}`);
    }

    console.log("Company code migration completed successfully!");
  } catch (error) {
    console.error("Error in company code migration:", error);
    throw error;
  }
}
