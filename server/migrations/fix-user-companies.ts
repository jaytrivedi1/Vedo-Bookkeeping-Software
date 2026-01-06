/**
 * Migration script to diagnose and fix incorrect user_companies associations
 *
 * Run with: npx ts-node -r tsconfig-paths/register server/migrations/fix-user-companies.ts
 *
 * This script will:
 * 1. Show all user-company associations
 * 2. Identify users with multiple company associations that may be incorrect
 * 3. Option to remove specific associations
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { usersSchema, userCompaniesSchema, companiesSchema } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

interface UserCompanyAssociation {
  userId: number;
  userEmail: string;
  companyId: number;
  companyName: string;
  role: string;
  isPrimary: boolean | null;
}

async function diagnoseUserCompanyAssociations(): Promise<UserCompanyAssociation[]> {
  console.log("=== User-Company Association Diagnostic Report ===\n");

  // Get all user-company associations with user and company details
  const associations = await db
    .select({
      ucId: userCompaniesSchema.id,
      userId: userCompaniesSchema.userId,
      companyId: userCompaniesSchema.companyId,
      role: userCompaniesSchema.role,
      isPrimary: userCompaniesSchema.isPrimary,
      userEmail: usersSchema.email,
      userName: usersSchema.username,
      companyName: companiesSchema.name,
    })
    .from(userCompaniesSchema)
    .innerJoin(usersSchema, eq(userCompaniesSchema.userId, usersSchema.id))
    .innerJoin(companiesSchema, eq(userCompaniesSchema.companyId, companiesSchema.id))
    .orderBy(usersSchema.email, companiesSchema.name);

  console.log("Current User-Company Associations:");
  console.log("-".repeat(100));
  console.log(
    "UC_ID".padEnd(8) +
    "User Email".padEnd(35) +
    "Company Name".padEnd(30) +
    "Role".padEnd(15) +
    "Primary"
  );
  console.log("-".repeat(100));

  for (const assoc of associations) {
    console.log(
      String(assoc.ucId).padEnd(8) +
      (assoc.userEmail || "N/A").padEnd(35) +
      (assoc.companyName || "N/A").padEnd(30) +
      (assoc.role || "N/A").padEnd(15) +
      String(assoc.isPrimary || false)
    );
  }

  console.log("-".repeat(100));
  console.log(`\nTotal associations: ${associations.length}`);

  // Identify users with multiple companies (potential issues)
  const usersWithMultipleCompanies = new Map<string, typeof associations>();
  for (const assoc of associations) {
    const email = assoc.userEmail || "";
    if (!usersWithMultipleCompanies.has(email)) {
      usersWithMultipleCompanies.set(email, []);
    }
    usersWithMultipleCompanies.get(email)!.push(assoc);
  }

  console.log("\n=== Users with Multiple Company Associations ===");
  let foundMultiple = false;
  for (const [email, assocs] of usersWithMultipleCompanies.entries()) {
    if (assocs.length > 1) {
      foundMultiple = true;
      console.log(`\nUser: ${email} has access to ${assocs.length} companies:`);
      for (const a of assocs) {
        console.log(`  - Company ID ${a.companyId}: "${a.companyName}" (Role: ${a.role}, Primary: ${a.isPrimary})`);
      }
    }
  }

  if (!foundMultiple) {
    console.log("\nNo users found with multiple company associations.");
  }

  return associations.map(a => ({
    userId: a.userId,
    userEmail: a.userEmail || "",
    companyId: a.companyId,
    companyName: a.companyName || "",
    role: a.role || "",
    isPrimary: a.isPrimary,
  }));
}

async function removeUserCompanyAssociation(userId: number, companyId: number): Promise<boolean> {
  try {
    const result = await db
      .delete(userCompaniesSchema)
      .where(
        and(
          eq(userCompaniesSchema.userId, userId),
          eq(userCompaniesSchema.companyId, companyId)
        )
      )
      .returning();

    if (result.length > 0) {
      console.log(`Successfully removed user ${userId} from company ${companyId}`);
      return true;
    } else {
      console.log(`No association found for user ${userId} and company ${companyId}`);
      return false;
    }
  } catch (error) {
    console.error(`Error removing association:`, error);
    return false;
  }
}

async function findAndRemoveIncorrectAssociations() {
  console.log("\n=== Checking for Specific Incorrect Associations ===\n");

  // Find user info@excelfrontbiz.com
  const excelfrontUser = await db
    .select()
    .from(usersSchema)
    .where(eq(usersSchema.email, "info@excelfrontbiz.com"));

  if (excelfrontUser.length === 0) {
    console.log("User info@excelfrontbiz.com not found in database.");
    return;
  }

  const userId = excelfrontUser[0].id;
  console.log(`Found user info@excelfrontbiz.com with ID: ${userId}`);

  // Get their company associations
  const userAssociations = await db
    .select({
      ucId: userCompaniesSchema.id,
      companyId: userCompaniesSchema.companyId,
      companyName: companiesSchema.name,
      role: userCompaniesSchema.role,
      isPrimary: userCompaniesSchema.isPrimary,
    })
    .from(userCompaniesSchema)
    .innerJoin(companiesSchema, eq(userCompaniesSchema.companyId, companiesSchema.id))
    .where(eq(userCompaniesSchema.userId, userId));

  console.log(`\nCompanies accessible by info@excelfrontbiz.com:`);
  for (const assoc of userAssociations) {
    console.log(`  - ID ${assoc.companyId}: "${assoc.companyName}" (Role: ${assoc.role}, Primary: ${assoc.isPrimary})`);
  }

  // Find "My Company Inc." association that should be removed
  const myCompanyAssoc = userAssociations.find(a =>
    a.companyName?.toLowerCase().includes("my company") ||
    a.companyName === "My Company Inc."
  );

  if (myCompanyAssoc) {
    console.log(`\n*** FOUND INCORRECT ASSOCIATION ***`);
    console.log(`User info@excelfrontbiz.com should NOT have access to "${myCompanyAssoc.companyName}" (ID: ${myCompanyAssoc.companyId})`);
    console.log(`\nTo remove this association, set REMOVE_INCORRECT=true and run again.`);

    if (process.env.REMOVE_INCORRECT === "true") {
      console.log(`\nRemoving incorrect association...`);
      await removeUserCompanyAssociation(userId, myCompanyAssoc.companyId);
    }
  } else {
    console.log(`\nNo incorrect "My Company Inc." association found for info@excelfrontbiz.com.`);
  }
}

async function main() {
  try {
    console.log("Starting user_companies diagnostic...\n");

    await diagnoseUserCompanyAssociations();
    await findAndRemoveIncorrectAssociations();

    console.log("\n=== Diagnostic Complete ===");
    console.log("\nTo remove a specific association, use:");
    console.log("  REMOVE_INCORRECT=true npx ts-node -r tsconfig-paths/register server/migrations/fix-user-companies.ts");

  } catch (error) {
    console.error("Error during diagnostic:", error);
    process.exit(1);
  }
}

// Export for use as a module
export { diagnoseUserCompanyAssociations, removeUserCompanyAssociation, findAndRemoveIncorrectAssociations };

// Run if executed directly
if (require.main === module) {
  main().then(() => process.exit(0));
}
