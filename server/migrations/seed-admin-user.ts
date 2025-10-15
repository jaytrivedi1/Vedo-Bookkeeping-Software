import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { usersSchema, userCompaniesSchema } from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { eq } from "drizzle-orm";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(password, salt, 64) as Buffer;
  return `${derivedKey.toString('hex')}.${salt}`;
}

export async function seedAdminUser() {
  console.log("Starting admin user seed...");
  
  try {
    // Check if admin user already exists
    const existingAdmin = await db.select().from(usersSchema).where(eq(usersSchema.username, 'admin'));
    
    if (existingAdmin.length > 0) {
      console.log("Admin user already exists. Skipping.");
      return;
    }
    
    // Hash the password
    const hashedPassword = await hashPassword('admin123');
    
    // Create admin user
    const [admin] = await db.insert(usersSchema).values({
      username: 'admin',
      email: 'admin@finledger.com',
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      role: 'admin',
      isActive: true,
    }).returning();
    
    console.log(`Admin user created with ID: ${admin.id}`);
    
    // Assign admin to the default company (ID 1)
    await db.insert(userCompaniesSchema).values({
      userId: admin.id,
      companyId: 1,
      role: 'admin',
    });
    
    console.log("Admin user assigned to default company");
    console.log("Admin user seed completed successfully!");
    console.log("\nLogin credentials:");
    console.log("Username: admin");
    console.log("Password: admin123");
  } catch (error) {
    console.error("Error seeding admin user:", error);
    throw error;
  }
}
