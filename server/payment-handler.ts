import { db } from './db';
import { transactions, ledgerEntries } from '@shared/schema';
import { eq, like, and, sql } from 'drizzle-orm';

/**
 * Properly deletes a payment transaction and handles all related changes:
 * 1. Deletes credit transactions generated from the payment
 * 2. Restores invoice balances and statuses
 * 3. Removes all payment-related entries
 */
export async function deletePaymentAndRelatedTransactions(paymentId: number) {
  console.log(`Starting comprehensive payment deletion for payment #${paymentId}`);
  
  try {
    return await db.transaction(async (tx) => {
      // Step 1: Find credit transactions generated from this payment
      const creditPattern = `%Unapplied credit from payment #${paymentId}%`;
      const relatedCredits = await tx.select().from(transactions)
        .where(and(
          eq(transactions.type, 'deposit'),
          like(transactions.description, creditPattern)
        ));
      
      console.log(`Found ${relatedCredits.length} credit transactions from payment #${paymentId}`);
      
      // Step 2: Find invoices affected by this payment
      const paymentLedgerEntries = await tx.select().from(ledgerEntries)
        .where(eq(ledgerEntries.transactionId, paymentId));
      
      // Extract invoice references from ledger entries
      const affectedInvoices = new Map<string, {id: number, amount: number}>();
      
      for (const entry of paymentLedgerEntries) {
        // Look for invoice references in ledger descriptions
        const invoiceMatch = entry.description?.match(/invoice #([a-zA-Z0-9-]+)/i);
        if (invoiceMatch && invoiceMatch[1] && entry.credit) {
          const invoiceRef = invoiceMatch[1];
          
          // Find the invoice
          const [invoice] = await tx.select().from(transactions)
            .where(and(
              eq(transactions.type, 'invoice'),
              eq(transactions.reference, invoiceRef)
            ));
          
          if (invoice) {
            // Add to our map of affected invoices with the payment amount
            const currentAmount = affectedInvoices.get(invoiceRef)?.amount || 0;
            affectedInvoices.set(invoiceRef, {
              id: invoice.id,
              amount: currentAmount + Number(entry.credit)
            });
          }
        }
      }
      
      console.log(`Found ${affectedInvoices.size} invoices affected by payment #${paymentId}`);
      
      // Step 3: Delete credit transactions
      for (const credit of relatedCredits) {
        // First delete ledger entries for the credit
        const deleteLedgerResult = await tx.execute(
          sql`DELETE FROM ledger_entries WHERE transaction_id = ${credit.id}`
        );
        console.log(`Deleted ${deleteLedgerResult.rowCount} ledger entries for credit #${credit.id}`);
        
        // Then delete the credit transaction
        const deleteCreditResult = await tx.execute(
          sql`DELETE FROM transactions WHERE id = ${credit.id}`
        );
        console.log(`Deleted credit #${credit.id} (${credit.reference}), rows affected: ${deleteCreditResult.rowCount}`);
      }
      
      // Step 4: Restore invoice balances and statuses
      for (const [invoiceRef, info] of affectedInvoices.entries()) {
        const [invoice] = await tx.select().from(transactions)
          .where(eq(transactions.id, info.id));
        
        if (invoice) {
          // Calculate new balance and determine status
          const newBalance = Number(invoice.balance) + info.amount;
          const newStatus = newBalance > 0 ? 'open' : 'completed';
          
          console.log(`Restoring invoice #${invoiceRef} to balance ${newBalance} and status ${newStatus}`);
          await tx.execute(
            sql`UPDATE transactions 
                SET balance = ${newBalance}, status = ${newStatus}
                WHERE id = ${info.id}`
          );
        }
      }
      
      // Step 5: Delete payment ledger entries
      const deletePaymentLedgerResult = await tx.execute(
        sql`DELETE FROM ledger_entries WHERE transaction_id = ${paymentId}`
      );
      console.log(`Deleted ${deletePaymentLedgerResult.rowCount} ledger entries for payment #${paymentId}`);
      
      // Step 6: Delete payment line items if any
      const deleteLineItemsResult = await tx.execute(
        sql`DELETE FROM line_items WHERE transaction_id = ${paymentId}`
      );
      console.log(`Deleted ${deleteLineItemsResult.rowCount} line items for payment #${paymentId}`);
      
      // Step 7: Delete the payment transaction itself
      const deletePaymentResult = await tx.execute(
        sql`DELETE FROM transactions WHERE id = ${paymentId}`
      );
      console.log(`Deleted payment #${paymentId}, rows affected: ${deletePaymentResult.rowCount}`);
      
      return {
        success: true,
        creditsDeleted: relatedCredits.length,
        invoicesRestored: affectedInvoices.size,
        message: "Payment and related transactions successfully deleted"
      };
    });
  } catch (error) {
    console.error("Error in payment deletion:", error);
    throw new Error(`Failed to delete payment: ${error instanceof Error ? error.message : String(error)}`);
  }
}