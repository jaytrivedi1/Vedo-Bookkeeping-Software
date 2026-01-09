import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { usersSchema, userCompaniesSchema } from "@shared/schema";
import { eq } from "drizzle-orm";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// Super admin email from environment variable (with fallback)
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || "admin@vedo.com";

export async function addSuperAdminRole() {
  console.log("Starting super_admin role migration...");

  try {
    // Step 1: Add 'super_admin' to the role enum
    // PostgreSQL enums need to be altered to add new values
    console.log("Adding 'super_admin' to role enum...");
    await sql`ALTER TYPE role ADD VALUE IF NOT EXISTS 'super_admin' BEFORE 'admin'`;
    console.log("Role enum updated successfully.");

    // Step 2: Update the super admin user to have the super_admin role
    console.log(`Updating ${SUPER_ADMIN_EMAIL} to super_admin role...`);

    const existingAdmin = await db
      .select()
      .from(usersSchema)
      .where(eq(usersSchema.email, SUPER_ADMIN_EMAIL));

    if (existingAdmin.length > 0) {
      // Update the user's role to super_admin
      await sql`UPDATE users SET role = 'super_admin' WHERE email = ${SUPER_ADMIN_EMAIL}`;
      console.log(`User ${SUPER_ADMIN_EMAIL} updated to super_admin role.`);

      // Also update their role in user_companies table
      await sql`UPDATE user_companies SET role = 'super_admin' WHERE user_id = ${existingAdmin[0].id}`;
      console.log("User company role updated to super_admin.");
    } else {
      console.log(`User ${SUPER_ADMIN_EMAIL} not found. Skipping role update.`);
    }

    console.log("Super admin role migration completed successfully!");
  } catch (error) {
    console.error("Error in super_admin role migration:", error);
    throw error;
  }
}
