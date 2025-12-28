import { db } from "../db";
import { sql } from "drizzle-orm";

export async function addAuthSecurityFieldsMigration() {
  console.log("Starting migration to add auth security fields to users table...");

  try {
    // Email verification fields
    const checkEmailVerified = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'email_verified'
    `);

    if (checkEmailVerified.rows.length === 0) {
      await db.execute(sql`
        ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE
      `);
      console.log("Added email_verified column");
    } else {
      console.log("email_verified column already exists. Skipping.");
    }

    const checkEmailToken = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'email_verification_token'
    `);

    if (checkEmailToken.rows.length === 0) {
      await db.execute(sql`
        ALTER TABLE users ADD COLUMN email_verification_token TEXT
      `);
      console.log("Added email_verification_token column");
    } else {
      console.log("email_verification_token column already exists. Skipping.");
    }

    const checkEmailExpires = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'email_verification_expires'
    `);

    if (checkEmailExpires.rows.length === 0) {
      await db.execute(sql`
        ALTER TABLE users ADD COLUMN email_verification_expires TIMESTAMP
      `);
      console.log("Added email_verification_expires column");
    } else {
      console.log("email_verification_expires column already exists. Skipping.");
    }

    // Account lockout fields
    const checkFailedAttempts = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'failed_login_attempts'
    `);

    if (checkFailedAttempts.rows.length === 0) {
      await db.execute(sql`
        ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0
      `);
      console.log("Added failed_login_attempts column");
    } else {
      console.log("failed_login_attempts column already exists. Skipping.");
    }

    const checkLockedUntil = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'locked_until'
    `);

    if (checkLockedUntil.rows.length === 0) {
      await db.execute(sql`
        ALTER TABLE users ADD COLUMN locked_until TIMESTAMP
      `);
      console.log("Added locked_until column");
    } else {
      console.log("locked_until column already exists. Skipping.");
    }

    // Password reset fields
    const checkResetToken = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'password_reset_token'
    `);

    if (checkResetToken.rows.length === 0) {
      await db.execute(sql`
        ALTER TABLE users ADD COLUMN password_reset_token TEXT
      `);
      console.log("Added password_reset_token column");
    } else {
      console.log("password_reset_token column already exists. Skipping.");
    }

    const checkResetExpires = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'password_reset_expires'
    `);

    if (checkResetExpires.rows.length === 0) {
      await db.execute(sql`
        ALTER TABLE users ADD COLUMN password_reset_expires TIMESTAMP
      `);
      console.log("Added password_reset_expires column");
    } else {
      console.log("password_reset_expires column already exists. Skipping.");
    }

    // Mark existing users as email verified (so they don't get locked out)
    await db.execute(sql`
      UPDATE users SET email_verified = TRUE WHERE email_verified = FALSE
    `);
    console.log("Marked existing users as email verified");

    console.log("Auth security fields migration completed successfully!");
  } catch (error) {
    console.error("Error in auth security fields migration:", error);
    throw error;
  }
}
