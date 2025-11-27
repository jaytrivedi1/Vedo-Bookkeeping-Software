import { db } from '../db';
import { userCompaniesSchema, usersSchema, companiesSchema } from '@shared/schema';
import { sql, eq, and } from 'drizzle-orm';

async function addUserCompaniesTable() {
  console.log('Starting migration to create user_companies table...');
  
  try {
    try {
      await db.select().from(userCompaniesSchema).limit(1);
      console.log('user_companies table already exists. Checking for existing assignments...');
    } catch (err) {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS user_companies (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
          role TEXT NOT NULL DEFAULT 'user',
          is_primary BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(user_id, company_id)
        )
      `);
      console.log('user_companies table created successfully.');
    }
    
    const existingAdmins = await db.select()
      .from(usersSchema)
      .where(eq(usersSchema.role, 'admin'));
    
    const defaultCompanies = await db.select()
      .from(companiesSchema)
      .where(eq(companiesSchema.isDefault, true));
    
    if (existingAdmins.length > 0 && defaultCompanies.length > 0) {
      const adminUser = existingAdmins[0];
      const defaultCompany = defaultCompanies[0];
      
      const existingAssignment = await db.select()
        .from(userCompaniesSchema)
        .where(
          and(
            eq(userCompaniesSchema.userId, adminUser.id),
            eq(userCompaniesSchema.companyId, defaultCompany.id)
          )
        );
      
      if (existingAssignment.length === 0) {
        await db.insert(userCompaniesSchema).values({
          userId: adminUser.id,
          companyId: defaultCompany.id,
          role: 'admin',
          isPrimary: true,
        });
        console.log(`Assigned admin user (ID: ${adminUser.id}) to default company (ID: ${defaultCompany.id})`);
      } else {
        console.log('Admin user already assigned to default company.');
      }
    }
    
    console.log('user_companies migration completed successfully!');
  } catch (err) {
    console.error('Error during user_companies migration:', err);
    throw err;
  }
}

export { addUserCompaniesTable };
