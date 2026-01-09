import crypto from 'crypto';
import { db } from '../db';
import { usersSchema } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { sendEmail } from '../resend-client';

const TOKEN_EXPIRY_HOURS = 24;
const APP_URL = process.env.APP_URL || 'http://localhost:5000';

/**
 * Generate a secure random token for email verification
 */
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Send verification email to user
 */
export async function sendVerificationEmail(
  email: string,
  token: string,
  firstName?: string | null
): Promise<{ success: boolean; error?: string }> {
  const verifyUrl = `${APP_URL}/verify-email?token=${token}`;
  const name = firstName || 'there';

  const result = await sendEmail({
    to: email,
    subject: 'Verify your email - Vedo Bookkeeping',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
              <!-- Logo -->
              <div style="text-align: center; margin-bottom: 32px;">
                <div style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #14b8a6); width: 48px; height: 48px; border-radius: 12px; line-height: 48px; color: white; font-weight: bold; font-size: 20px;">V</div>
                <h1 style="margin: 8px 0 0 0; font-size: 24px; color: #0f172a;">Vedo Bookkeeping</h1>
              </div>

              <!-- Content -->
              <h2 style="color: #0f172a; font-size: 20px; margin: 0 0 16px 0;">Verify your email address</h2>
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Hi ${name},
              </p>
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Thanks for signing up for Vedo Bookkeeping! Please verify your email address by clicking the button below:
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${verifyUrl}" style="display: inline-block; background-color: #0284c7; background-image: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Verify Email Address
                </a>
              </div>

              <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
                This link will expire in ${TOKEN_EXPIRY_HOURS} hours.
              </p>

              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
                If you didn't create an account with Vedo, you can safely ignore this email.
              </p>

              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">

              <!-- Footer -->
              <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${verifyUrl}" style="color: #0ea5e9; word-break: break-all;">${verifyUrl}</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Hi ${name},\n\nThanks for signing up for Vedo Bookkeeping! Please verify your email address by visiting:\n\n${verifyUrl}\n\nThis link will expire in ${TOKEN_EXPIRY_HOURS} hours.\n\nIf you didn't create an account with Vedo, you can safely ignore this email.`
  });

  return result;
}

/**
 * Create verification token for a user and store it in the database
 */
export async function createVerificationToken(userId: number): Promise<string> {
  const token = generateVerificationToken();
  const expires = new Date();
  expires.setHours(expires.getHours() + TOKEN_EXPIRY_HOURS);

  await db.update(usersSchema)
    .set({
      emailVerificationToken: token,
      emailVerificationExpires: expires
    })
    .where(eq(usersSchema.id, userId));

  return token;
}

/**
 * Verify email token and mark user as verified
 */
export async function verifyEmailToken(token: string): Promise<{
  success: boolean;
  error?: string;
  userId?: number;
}> {
  // Find user with this token
  const users = await db.select()
    .from(usersSchema)
    .where(eq(usersSchema.emailVerificationToken, token));

  if (users.length === 0) {
    return { success: false, error: 'Invalid verification token' };
  }

  const user = users[0];

  // Check if token is expired
  if (user.emailVerificationExpires && new Date() > user.emailVerificationExpires) {
    return { success: false, error: 'Verification token has expired. Please request a new one.' };
  }

  // Mark user as verified and clear token
  await db.update(usersSchema)
    .set({
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null
    })
    .where(eq(usersSchema.id, user.id));

  return { success: true, userId: user.id };
}

/**
 * Resend verification email to user
 */
export async function resendVerificationEmail(email: string): Promise<{
  success: boolean;
  error?: string;
}> {
  // Find user by email
  const users = await db.select()
    .from(usersSchema)
    .where(eq(usersSchema.email, email));

  if (users.length === 0) {
    // Don't reveal if email exists
    return { success: true };
  }

  const user = users[0];

  // Check if already verified
  if (user.emailVerified) {
    return { success: false, error: 'Email is already verified' };
  }

  // Create new token
  const token = await createVerificationToken(user.id);

  // Send email
  const result = await sendVerificationEmail(email, token, user.firstName);

  return result;
}
