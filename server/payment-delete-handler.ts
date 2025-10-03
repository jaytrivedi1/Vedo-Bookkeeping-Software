import { db } from './db';
import { transactions, ledgerEntries } from '@shared/schema';
import { eq, and, like, sql } from 'drizzle-orm';

/**
 * Comprehensive payment deletion handler that ensures:
 * 1. Credit transactions created from the payment are removed
 * 2. Invoice balances and statuses are properly restored
 * 3. All operations occur in a single atomic transaction
 * 
 * @param paymentId The ID of the payment to delete
 * @returns Result object with details of the deletion operation
 */
export async function deletePaymentAndRelatedTransactions(paymentId: number) {
  console.log(`Starting comprehensive payment deletion for payment #${paymentId}`);
  
  try {
    // Execute all operations in a single database transaction
    return await db.transaction(async (tx) => {
      // Step 1: Get the payment to verify it exists
      const [payment] = await tx.select().from(transactions)
        .where(and(
          eq(transactions.id, paymentId),
          eq(transactions.type, 'payment')
        ));
      
      if (!payment) {
        throw new Error(`Payment #${paymentId} not found or is not a payment transaction`);
      }
      
      // Step 2: Find credit transactions generated from this payment
      const searchPattern = `%Unapplied credit from payment #${paymentId}%`;
      const relatedCredits = await tx.select().from(transactions)
        .where(and(
          eq(transactions.type, 'deposit'),
          like(transactions.description, searchPattern)
        ));
      
      console.log(`Found ${relatedCredits.length} credit transactions created from payment #${paymentId}`);
      
      // Step 3: Find invoices affected by this payment
      const paymentLedgerEntries = await tx.select().from(ledgerEntries)
        .where(eq(ledgerEntries.transactionId, paymentId));
      
      // Map to track invoices that need to be restored with their payment amounts
      const invoicesToRestore = new Map<string, { 
        id: number, 
        reference: string,
        amountPaid: number
      }>();
      
      // Analyze ledger entries to find affected invoices and payment amounts
      for (const entry of paymentLedgerEntries) {
        if (entry.description?.includes('invoice #')) {
          const match = entry.description.match(/invoice #([a-zA-Z0-9-]+)/i);
          if (match && match[1] && entry.credit) {
            const invoiceRef = match[1];
            
            // Find the invoice
            const [invoice] = await tx.select().from(transactions)
              .where(and(
                eq(transactions.type, 'invoice'),
                eq(transactions.reference, invoiceRef)
              ));
              
            if (invoice) {
              // Add or update the invoice data in our map
              const currentAmount = invoicesToRestore.get(invoiceRef)?.amountPaid || 0;
              invoicesToRestore.set(invoiceRef, {
                id: invoice.id,
                reference: invoice.reference,
                amountPaid: currentAmount + Number(entry.credit)
              });
            }
          }
        }
      }
      
      console.log(`Found ${invoicesToRestore.size} invoices affected by payment #${paymentId}`);
      
      // Step 4: Delete credit transactions
      for (const credit of relatedCredits) {
        // Delete ledger entries for the credit
        const deleteCreditLedgerResult = await tx.execute(
          sql`DELETE FROM ledger_entries WHERE transaction_id = ${credit.id}`
        );
        console.log(`Deleted ${deleteCreditLedgerResult.rowCount} ledger entries for credit #${credit.id}`);
        
        // Delete the credit transaction
        const deleteCreditResult = await tx.execute(
          sql`DELETE FROM transactions WHERE id = ${credit.id}`
        );
        console.log(`Deleted credit transaction #${credit.id} (${credit.reference}), rows affected: ${deleteCreditResult.rowCount}`);
      }
      
      // Step 5: Restore invoice balances and statuses
      const restoredInvoices = [];
      for (const [invoiceRef, info] of Array.from(invoicesToRestore.entries())) {
        // Get current invoice data
        const [invoice] = await tx.select().from(transactions)
          .where(eq(transactions.id, info.id));
          
        if (invoice) {
          // Calculate new balance by adding back what was paid
          const newBalance = Number(invoice.balance) + info.amountPaid;
          // Determine appropriate status based on balance
          const newStatus = newBalance > 0 ? 'open' : 'completed';
          
          console.log(`Restoring invoice #${invoiceRef} to balance ${newBalance} and status ${newStatus}`);
          await tx.execute(
            sql`UPDATE transactions 
                SET balance = ${newBalance}, status = ${newStatus}
                WHERE id = ${info.id}`
          );
          
          restoredInvoices.push({
            id: info.id,
            reference: invoiceRef,
            previousBalance: invoice.balance,
            newBalance: newBalance,
            newStatus: newStatus
          });
        }
      }
      
      // Step 6: Delete payment ledger entries
      const deleteLedgerResult = await tx.execute(
        sql`DELETE FROM ledger_entries WHERE transaction_id = ${paymentId}`
      );
      console.log(`Deleted ${deleteLedgerResult.rowCount} ledger entries for payment #${paymentId}`);
      
      // Step 7: Delete payment line items if any
      const deleteLineItemsResult = await tx.execute(
        sql`DELETE FROM line_items WHERE transaction_id = ${paymentId}`
      );
      console.log(`Deleted ${deleteLineItemsResult.rowCount} line items for payment #${paymentId}`);
      
      // Step 8: Delete the payment transaction itself
      const deleteResult = await tx.execute(
        sql`DELETE FROM transactions WHERE id = ${paymentId}`
      );
      console.log(`Deleted payment transaction #${paymentId}, rows affected: ${deleteResult.rowCount}`);
      
      // Return detailed results of the operation
      return {
        success: true,
        paymentId: paymentId,
        creditsDeleted: relatedCredits.map(c => ({ id: c.id, reference: c.reference })),
        invoicesRestored: restoredInvoices,
        message: "Payment and related transactions successfully deleted"
      };
    });
  } catch (error) {
    console.error("Error in payment deletion process:", error);
    throw new Error(`Failed to delete payment: ${error instanceof Error ? error.message : String(error)}`);
  }
}