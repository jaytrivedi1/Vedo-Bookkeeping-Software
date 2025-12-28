import crypto from 'crypto';
import { db } from '../db';
import { usersSchema } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { sendEmail } from '../resend-client';
import { storage } from '../storage';

const TOKEN_EXPIRY_HOURS = 1; // Password reset tokens expire in 1 hour
const APP_URL = process.env.APP_URL || 'http://localhost:5000';

/**
 * Generate a secure random token for password reset
 */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Send password reset email to user
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string,
  firstName?: string | null
): Promise<{ success: boolean; error?: string }> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;
  const name = firstName || 'there';

  const result = await sendEmail({
    to: email,
    subject: 'Reset your password - Vedo Bookkeeping',
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
              <h2 style="color: #0f172a; font-size: 20px; margin: 0 0 16px 0;">Reset your password</h2>
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Hi ${name},
              </p>
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                We received a request to reset your password. Click the button below to create a new password:
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Reset Password
                </a>
              </div>

              <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
                This link will expire in ${TOKEN_EXPIRY_HOURS} hour.
              </p>

              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
                If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>

              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">

              <!-- Footer -->
              <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${resetUrl}" style="color: #0ea5e9; word-break: break-all;">${resetUrl}</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Hi ${name},\n\nWe received a request to reset your password. Visit this link to create a new password:\n\n${resetUrl}\n\nThis link will expire in ${TOKEN_EXPIRY_HOURS} hour.\n\nIf you didn't request a password reset, you can safely ignore this email.`
  });

  return result;
}

/**
 * Request password reset for a user
 */
export async function requestPasswordReset(email: string): Promise<{
  success: boolean;
  error?: string;
}> {
  // Find user by email
  const users = await db.select()
    .from(usersSchema)
    .where(eq(usersSchema.email, email));

  // Always return success to prevent email enumeration
  if (users.length === 0) {
    return { success: true };
  }

  const user = users[0];

  // Generate token
  const token = generateResetToken();
  const expires = new Date();
  expires.setHours(expires.getHours() + TOKEN_EXPIRY_HOURS);

  // Store token in database
  await db.update(usersSchema)
    .set({
      passwordResetToken: token,
      passwordResetExpires: expires
    })
    .where(eq(usersSchema.id, user.id));

  // Send email
  const result = await sendPasswordResetEmail(email, token, user.firstName);

  if (!result.success) {
    console.error('Failed to send password reset email:', result.error);
    return { success: false, error: 'Failed to send email. Please try again.' };
  }

  return { success: true };
}

/**
 * Validate password reset token
 */
export async function validateResetToken(token: string): Promise<{
  valid: boolean;
  error?: string;
  userId?: number;
}> {
  // Find user with this token
  const users = await db.select()
    .from(usersSchema)
    .where(eq(usersSchema.passwordResetToken, token));

  if (users.length === 0) {
    return { valid: false, error: 'Invalid or expired reset token' };
  }

  const user = users[0];

  // Check if token is expired
  if (user.passwordResetExpires && new Date() > user.passwordResetExpires) {
    return { valid: false, error: 'Reset token has expired. Please request a new one.' };
  }

  return { valid: true, userId: user.id };
}

/**
 * Reset password using token
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  // Validate token
  const validation = await validateResetToken(token);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  // Hash new password
  const hashedPassword = await storage.hashPassword(newPassword);

  // Update password and clear reset token
  await db.update(usersSchema)
    .set({
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null,
      // Reset failed login attempts when password is changed
      failedLoginAttempts: 0,
      lockedUntil: null
    })
    .where(eq(usersSchema.id, validation.userId!));

  return { success: true };
}

/**
 * Password strength validation
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*)');
  }

  // Calculate strength
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  const passedChecks = 5 - errors.length;

  if (passedChecks >= 5 && password.length >= 12) {
    strength = 'strong';
  } else if (passedChecks >= 4) {
    strength = 'medium';
  }

  return {
    valid: errors.length === 0,
    errors,
    strength
  };
}
