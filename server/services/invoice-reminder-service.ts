import { IStorage } from '../storage';
import { format } from 'date-fns';

interface ReminderResult {
  invoiceId: number;
  customerName: string;
  customerEmail: string | null;
  success: boolean;
  error?: string;
}

interface SendRemindersResponse {
  sent: number;
  failed: number;
  skipped: number;
  results: ReminderResult[];
}

// Format currency helper
function formatCurrency(amount: number, currency: string = 'CAD'): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

// Generate email HTML for invoice reminder
function generateReminderEmailHtml(
  customerName: string,
  invoiceNumber: string,
  amount: number,
  dueDate: string,
  companyName: string,
  currency: string = 'CAD'
): string {
  const formattedAmount = formatCurrency(amount, currency);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 24px;">Payment Reminder</h1>
  </div>

  <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Dear ${customerName},</p>

    <p style="margin-bottom: 20px;">This is a friendly reminder that payment for the following invoice is now overdue:</p>

    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Invoice Number:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${invoiceNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Amount Due:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #dc2626;">${formattedAmount}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b;">Due Date:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">${dueDate}</td>
        </tr>
      </table>
    </div>

    <p style="margin-bottom: 20px;">Please arrange payment at your earliest convenience. If you have already sent payment, please disregard this reminder.</p>

    <p style="margin-bottom: 20px;">If you have any questions about this invoice, please don't hesitate to reach out.</p>

    <p style="margin-bottom: 5px;">Thank you for your business!</p>
    <p style="margin: 0; font-weight: 600;">${companyName}</p>
  </div>

  <div style="text-align: center; padding: 20px; color: #64748b; font-size: 12px;">
    <p>This is an automated reminder from ${companyName}</p>
  </div>
</body>
</html>
  `.trim();
}

// Send invoice reminders
export async function sendInvoiceReminders(
  storage: IStorage,
  invoiceIds: number[],
  companyName: string,
  currency: string = 'CAD'
): Promise<SendRemindersResponse> {
  const results: ReminderResult[] = [];
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  try {
    // Get Resend client
    const { getUncachableResendClient } = await import('../resend-client');
    const { client: resend, fromEmail } = await getUncachableResendClient();

    // Get all transactions and contacts
    const transactions = await storage.getTransactions();
    const contacts = await storage.getContacts();
    const contactMap = new Map(contacts.map(c => [c.id, c]));

    for (const invoiceId of invoiceIds) {
      const invoice = transactions.find(t => t.id === invoiceId && t.type === 'invoice');

      if (!invoice) {
        results.push({
          invoiceId,
          customerName: 'Unknown',
          customerEmail: null,
          success: false,
          error: 'Invoice not found',
        });
        failed++;
        continue;
      }

      const contact = contactMap.get(invoice.contactId || 0);
      const customerName = contact?.name || 'Valued Customer';
      const customerEmail = contact?.email;

      if (!customerEmail) {
        results.push({
          invoiceId,
          customerName,
          customerEmail: null,
          success: false,
          error: 'No email address on file',
        });
        skipped++;
        continue;
      }

      try {
        const invoiceNumber = invoice.reference || `INV-${invoice.id}`;
        const amount = Number(invoice.balance || invoice.amount || 0);
        const dueDate = invoice.dueDate
          ? format(new Date(invoice.dueDate), 'MMMM d, yyyy')
          : 'N/A';

        const emailHtml = generateReminderEmailHtml(
          customerName,
          invoiceNumber,
          amount,
          dueDate,
          companyName,
          currency
        );

        await resend.emails.send({
          from: fromEmail,
          to: customerEmail,
          subject: `Payment Reminder: Invoice ${invoiceNumber} - ${formatCurrency(amount, currency)}`,
          html: emailHtml,
        });

        results.push({
          invoiceId,
          customerName,
          customerEmail,
          success: true,
        });
        sent++;
      } catch (emailError: any) {
        results.push({
          invoiceId,
          customerName,
          customerEmail,
          success: false,
          error: emailError?.message || 'Failed to send email',
        });
        failed++;
      }
    }
  } catch (error: any) {
    console.error('Error in sendInvoiceReminders:', error);
    // If we can't initialize Resend, mark all as failed
    for (const invoiceId of invoiceIds) {
      if (!results.find(r => r.invoiceId === invoiceId)) {
        results.push({
          invoiceId,
          customerName: 'Unknown',
          customerEmail: null,
          success: false,
          error: error?.message || 'Email service unavailable',
        });
        failed++;
      }
    }
  }

  return { sent, failed, skipped, results };
}

// Preview what reminders would be sent (for confirmation)
export async function previewInvoiceReminders(
  storage: IStorage,
  invoiceIds: number[]
): Promise<Array<{
  invoiceId: number;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string | null;
  amount: number;
  dueDate: string | null;
  canSend: boolean;
  reason?: string;
}>> {
  const transactions = await storage.getTransactions();
  const contacts = await storage.getContacts();
  const contactMap = new Map(contacts.map(c => [c.id, c]));

  const previews = [];

  for (const invoiceId of invoiceIds) {
    const invoice = transactions.find(t => t.id === invoiceId && t.type === 'invoice');

    if (!invoice) {
      previews.push({
        invoiceId,
        invoiceNumber: 'Unknown',
        customerName: 'Unknown',
        customerEmail: null,
        amount: 0,
        dueDate: null,
        canSend: false,
        reason: 'Invoice not found',
      });
      continue;
    }

    const contact = contactMap.get(invoice.contactId || 0);
    const customerEmail = contact?.email || null;

    previews.push({
      invoiceId,
      invoiceNumber: invoice.reference || `INV-${invoice.id}`,
      customerName: contact?.name || 'Unknown Customer',
      customerEmail,
      amount: Number(invoice.balance || invoice.amount || 0),
      dueDate: invoice.dueDate ? format(new Date(invoice.dueDate), 'MMM d, yyyy') : null,
      canSend: !!customerEmail,
      reason: customerEmail ? undefined : 'No email on file',
    });
  }

  return previews;
}
