import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { usersSchema, userCompaniesSchema } from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { eq, or } from "drizzle-orm";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const scryptAsync = promisify(scrypt);

// Super admin credentials from environment variables (with fallbacks)
const SUPER_ADMIN_USERNAME = process.env.SUPER_ADMIN_USERNAME || 'admin';
const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'admin@vedo.com';
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'admin123';

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(password, salt, 64) as Buffer;
  return `${derivedKey.toString('hex')}.${salt}`;
}

export async function seedAdminUser() {
  console.log("Starting super admin user seed...");

  try {
    // Check if super admin user already exists (by username or email)
    const existingAdmin = await db.select().from(usersSchema).where(
      or(
        eq(usersSchema.username, SUPER_ADMIN_USERNAME),
        eq(usersSchema.email, SUPER_ADMIN_EMAIL),
        eq(usersSchema.role, 'super_admin')
      )
    );

    // Hash the password
    const hashedPassword = await hashPassword(SUPER_ADMIN_PASSWORD);

    if (existingAdmin.length > 0) {
      const admin = existingAdmin[0];
      console.log(`Super admin user exists (ID: ${admin.id}). Updating credentials...`);

      // Update existing super admin with new credentials from env vars
      await db.update(usersSchema)
        .set({
          username: SUPER_ADMIN_USERNAME,
          email: SUPER_ADMIN_EMAIL,
          password: hashedPassword,
          role: 'super_admin',
          isActive: true,
        })
        .where(eq(usersSchema.id, admin.id));

      // Also update role in user_companies if exists
      await db.update(userCompaniesSchema)
        .set({ role: 'super_admin' })
        .where(eq(userCompaniesSchema.userId, admin.id));

      console.log("Super admin credentials updated successfully!");
      console.log(`\nSuper Admin Login:`);
      console.log(`Email: ${SUPER_ADMIN_EMAIL}`);
      console.log(`Password: [SET VIA SUPER_ADMIN_PASSWORD ENV VAR]`);
      return;
    }

    // Create new super admin user
    const [admin] = await db.insert(usersSchema).values({
      username: SUPER_ADMIN_USERNAME,
      email: SUPER_ADMIN_EMAIL,
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'super_admin',
      isActive: true,
      emailVerified: true,
    }).returning();

    console.log(`Super admin user created with ID: ${admin.id}`);

    // Assign super admin to the default company (ID 1)
    await db.insert(userCompaniesSchema).values({
      userId: admin.id,
      companyId: 1,
      role: 'super_admin',
    });

    console.log("Super admin user assigned to default company");
    console.log("Super admin user seed completed successfully!");
    console.log(`\nSuper Admin Login:`);
    console.log(`Email: ${SUPER_ADMIN_EMAIL}`);
    console.log(`Password: [SET VIA SUPER_ADMIN_PASSWORD ENV VAR]`);
  } catch (error) {
    console.error("Error seeding super admin user:", error);
    throw error;
  }
}
