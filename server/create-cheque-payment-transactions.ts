import { db } from './db';
import { transactions, paymentApplications, contacts } from '../shared/schema';
import { eq, and, inArray } from 'drizzle-orm';

export async function createChequePaymentTransactions() {
  console.log('Starting migration to create payment transactions for existing cheque applications...');

  try {
    // Find all cheque applications in payment_applications where the payment is a cheque
    const applications = await db
      .select({
        paymentId: paymentApplications.paymentId,
        invoiceId: paymentApplications.invoiceId,
        amountApplied: paymentApplications.amountApplied,
        createdAt: paymentApplications.createdAt
      })
      .from(paymentApplications);

    if (applications.length === 0) {
      console.log('No payment applications found. Skipping.');
      return;
    }

    // Get all unique payment IDs
    const paymentIds = [...new Set(applications.map(app => app.paymentId))];

    // Get all transactions that are cheques
    const cheques = await db
      .select()
      .from(transactions)
      .where(
        and(
          inArray(transactions.id, paymentIds),
          eq(transactions.type, 'cheque')
        )
      );

    if (cheques.length === 0) {
      console.log('No cheque applications found. Skipping.');
      return;
    }

    console.log(`Found ${cheques.length} cheques with applications to process`);

    // Group applications by cheque
    const applicationsByCheque = new Map<number, typeof applications>();
    for (const app of applications) {
      const isCheque = cheques.some(c => c.id === app.paymentId);
      if (isCheque) {
        if (!applicationsByCheque.has(app.paymentId)) {
          applicationsByCheque.set(app.paymentId, []);
        }
        applicationsByCheque.get(app.paymentId)!.push(app);
      }
    }

    let createdCount = 0;

    // For each cheque with applications, check if a payment transaction already exists
    for (const [chequeId, apps] of applicationsByCheque) {
      const cheque = cheques.find(c => c.id === chequeId);
      if (!cheque) continue;

      // Check if a payment transaction already exists for this cheque application
      // Look for payment transactions that reference this cheque in the description
      const existingPayment = await db
        .select()
        .from(transactions)
        .where(eq(transactions.type, 'payment'))
        .then(payments => 
          payments.find(p => 
            p.description?.includes(cheque.reference || '') ||
            p.date?.getTime() === apps[0].createdAt?.getTime()
          )
        );

      if (existingPayment) {
        console.log(`Payment transaction already exists for cheque ${cheque.reference}. Skipping.`);
        continue;
      }

      // Get the vendor/contact for this cheque
      const vendor = cheque.contactId 
        ? await db.select().from(contacts).where(eq(contacts.id, cheque.contactId)).then(rows => rows[0])
        : null;

      // Calculate total amount applied from this cheque
      const totalApplied = apps.reduce((sum, app) => sum + (app.amountApplied || 0), 0);

      // Get bill references for description
      const billIds = apps.map(app => app.invoiceId);
      const bills = await db
        .select()
        .from(transactions)
        .where(inArray(transactions.id, billIds));
      
      const billRefs = bills.map(b => b.reference).filter(Boolean).join(', ');

      // Generate payment reference
      const allTransactions = await db.select().from(transactions);
      const existingPayments = allTransactions.filter(t => t.type === 'payment');
      const nextPaymentNumber = existingPayments.length + 1;
      const paymentReference = `PAY-${String(nextPaymentNumber).padStart(4, '0')}`;

      // Create payment transaction
      const paymentData = {
        reference: paymentReference,
        type: 'payment' as const,
        date: apps[0].createdAt || new Date(),
        description: vendor
          ? `Bill payment to ${vendor.name} using cheque (${cheque.reference}) for bills: ${billRefs}`
          : `Bill payment using cheque (${cheque.reference}) for bills: ${billRefs}`,
        amount: totalApplied,
        balance: 0,
        contactId: cheque.contactId,
        status: 'open' as const
      };

      // Insert the payment transaction (no ledger entries for retroactive cheque payments)
      const [payment] = await db
        .insert(transactions)
        .values(paymentData)
        .returning();

      console.log(`Created payment transaction ${paymentReference} for cheque ${cheque.reference} ($${totalApplied})`);
      createdCount++;
    }

    console.log(`Migration completed successfully!`);
    console.log(`Created ${createdCount} payment transactions for existing cheque applications`);
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
}
