import { db } from './db';
import { transactions, ledgerEntries } from '@shared/schema';
import { eq, like, and, sql } from 'drizzle-orm';

/**
 * Utility to properly handle payment deletion by:
 * 1. Finding and removing credit transactions created from the payment
 * 2. Restoring invoice balances and statuses
 * 3. Deleting the payment transaction itself
 */
export async function fixPaymentDeletion(paymentId: number) {
  console.log(`Starting payment deletion process for payment #${paymentId}`);
  
  return await db.transaction(async (tx) => {
    // Step 1: Find credit transactions created from this payment
    const relatedCredits = await tx.select().from(transactions)
      .where(like(transactions.description, `%Unapplied credit from payment #${paymentId}%`));
    
    console.log(`Found ${relatedCredits.length} credit transactions from payment #${paymentId}`);
    
    // Step 2: Delete the credit transactions and their ledger entries
    for (const credit of relatedCredits) {
      // Delete ledger entries for the credit first
      await tx.execute(sql`DELETE FROM ledger_entries WHERE transaction_id = ${credit.id}`);
      
      // Delete the credit transaction
      await tx.execute(sql`DELETE FROM transactions WHERE id = ${credit.id}`);
      
      console.log(`Deleted credit #${credit.id} (${credit.reference})`);
    }
    
    // Step 3: Find invoices affected by this payment
    const paymentEntries = await tx.select().from(ledgerEntries)
      .where(eq(ledgerEntries.transactionId, paymentId));
    
    // Track invoices that need to be restored
    const invoicesToRestore = new Map();
    
    for (const entry of paymentEntries) {
      if (entry.description && entry.description.includes('invoice #')) {
        // Extract invoice reference from description
        const match = entry.description.match(/invoice #([a-zA-Z0-9-]+)/i);
        if (match && match[1]) {
          const invoiceRef = match[1];
          
          // Find the invoice
          const [invoice] = await tx.select().from(transactions)
            .where(and(
              eq(transactions.type, 'invoice'),
              eq(transactions.reference, invoiceRef)
            ));
            
          if (invoice) {
            // Calculate amount paid through this payment
            const amount = Number(entry.credit) || 0;
            invoicesToRestore.set(invoiceRef, {
              id: invoice.id,
              amount,
              currentBalance: Number(invoice.balance)
            });
          }
        }
      }
    }
    
    // Step 4: Restore invoice balances
    for (const [invoiceRef, data] of invoicesToRestore.entries()) {
      // Calculate new balance and status
      const newBalance = data.currentBalance + data.amount;
      const newStatus = newBalance > 0 ? 'open' : 'completed';
      
      // Update the invoice
      await tx.execute(sql`
        UPDATE transactions 
        SET balance = ${newBalance}, 
            status = ${newStatus}
        WHERE id = ${data.id}
      `);
      
      console.log(`Restored invoice #${invoiceRef} to balance ${newBalance} and status ${newStatus}`);
    }
    
    // Step 5: Delete payment ledger entries and the payment itself
    await tx.execute(sql`DELETE FROM ledger_entries WHERE transaction_id = ${paymentId}`);
    await tx.execute(sql`DELETE FROM transactions WHERE id = ${paymentId}`);
    
    console.log(`Successfully deleted payment #${paymentId}`);
    
    return {
      success: true,
      creditsDeleted: relatedCredits.length,
      invoicesRestored: invoicesToRestore.size
    };
  });
}