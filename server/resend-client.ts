import { Resend } from 'resend';

// Configuration for Resend email service
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@vedobookkeeping.com';

// Try Replit connector first, fall back to environment variables
async function getReplitCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!hostname || !xReplitToken) {
    return null;
  }

  try {
    const response = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    );

    const data = await response.json();
    const connectionSettings = data.items?.[0];

    if (connectionSettings?.settings?.api_key) {
      return {
        apiKey: connectionSettings.settings.api_key,
        fromEmail: connectionSettings.settings.from_email || FROM_EMAIL
      };
    }
  } catch (error) {
    console.log('Replit connector not available, using environment variables');
  }

  return null;
}

// Get Resend client - tries Replit connector first, then environment variables
export async function getResendClient(): Promise<{ client: Resend; fromEmail: string } | null> {
  // Try Replit connector first
  const replitCredentials = await getReplitCredentials();
  if (replitCredentials) {
    return {
      client: new Resend(replitCredentials.apiKey),
      fromEmail: replitCredentials.fromEmail
    };
  }

  // Fall back to environment variables
  if (RESEND_API_KEY) {
    return {
      client: new Resend(RESEND_API_KEY),
      fromEmail: FROM_EMAIL
    };
  }

  console.warn('Resend not configured: Set RESEND_API_KEY environment variable');
  return null;
}

// Legacy export for backward compatibility
export async function getUncachableResendClient() {
  const result = await getResendClient();
  if (!result) {
    throw new Error('Resend not connected. Set RESEND_API_KEY environment variable.');
  }
  return result;
}

// Send email helper function
export async function sendEmail(options: {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = await getResendClient();

    if (!resend) {
      console.error('Resend not configured - email not sent');
      return { success: false, error: 'Email service not configured' };
    }

    const { client, fromEmail } = resend;

    await client.emails.send({
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Failed to send email:', error);
    return { success: false, error: error.message };
  }
}
