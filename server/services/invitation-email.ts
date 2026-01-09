import { sendEmail } from '../resend-client';

const APP_URL = process.env.APP_URL || 'http://localhost:5000';
const INVITATION_EXPIRY_DAYS = 7;

/**
 * Send invitation email to a new user
 */
export async function sendInvitationEmail(
  email: string,
  token: string,
  role: string,
  inviterName?: string | null,
  companyName?: string | null
): Promise<{ success: boolean; error?: string }> {
  const acceptUrl = `${APP_URL}/accept-invitation/${token}`;
  const inviter = inviterName || 'A team member';
  const organization = companyName || 'the organization';

  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    staff: 'Staff',
    read_only: 'Read Only',
    accountant: 'Accountant',
  };
  const roleLabel = roleLabels[role] || role;

  const result = await sendEmail({
    to: email,
    subject: `You're invited to join ${organization} on Vedo Bookkeeping`,
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
              <h2 style="color: #0f172a; font-size: 20px; margin: 0 0 16px 0;">You've been invited!</h2>
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                ${inviter} has invited you to join ${organization} on Vedo Bookkeeping as a <strong>${roleLabel}</strong>.
              </p>
              <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Vedo Bookkeeping is a powerful accounting and invoicing platform designed to help businesses manage their finances efficiently.
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${acceptUrl}" style="display: inline-block; background-color: #0284c7; background-image: linear-gradient(135deg, #0ea5e9, #0284c7); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Accept Invitation
                </a>
              </div>

              <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
                This invitation will expire in ${INVITATION_EXPIRY_DAYS} days.
              </p>

              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
                If you weren't expecting this invitation, you can safely ignore this email.
              </p>

              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">

              <!-- Footer -->
              <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${acceptUrl}" style="color: #0ea5e9; word-break: break-all;">${acceptUrl}</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `You've been invited to join ${organization} on Vedo Bookkeeping!\n\n${inviter} has invited you to join as a ${roleLabel}.\n\nVedo Bookkeeping is a powerful accounting and invoicing platform designed to help businesses manage their finances efficiently.\n\nAccept your invitation by visiting:\n${acceptUrl}\n\nThis invitation will expire in ${INVITATION_EXPIRY_DAYS} days.\n\nIf you weren't expecting this invitation, you can safely ignore this email.`
  });

  return result;
}
