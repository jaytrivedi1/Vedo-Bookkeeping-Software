import { db } from './db';
import { transactions, ledgerEntries } from '@shared/schema';
import { eq, like, and, sql } from 'drizzle-orm';

/**
 * This function properly handles payment deletion by:
 * 1. Finding and removing any credit transactions created from the payment
 * 2. Restoring affected invoices to their original balance and status
 * 3. Deleting the payment and all related entries
 */
export async function handlePaymentDeletion(paymentId: number) {
  console.log(`Starting comprehensive payment deletion for payment #${paymentId}`);
  
  try {
    // Begin a transaction to ensure all operations succeed or fail together
    return await db.transaction(async (tx) => {
      // Step 1: Find any credit transactions generated from this payment
      const searchPattern = `%Unapplied credit from payment #${paymentId}%`;
      const relatedCredits = await tx.select().from(transactions)
        .where(and(
          eq(transactions.type, 'deposit'),
          like(transactions.description, searchPattern)
        ));
      
      console.log(`Found ${relatedCredits.length} credit transactions created from payment #${paymentId}`);
      
      // Step 2: Find invoices affected by this payment through ledger entries
      const paymentLedgerEntries = await tx.select().from(ledgerEntries)
        .where(eq(ledgerEntries.transactionId, paymentId));
      
      // Extract invoice references and IDs from ledger entry descriptions
      const invoiceInfo = new Map<string, { id: number, amountPaid: number }>();
      
      for (const entry of paymentLedgerEntries) {
        const match = entry.description?.match(/invoice #([a-zA-Z0-9-]+)/i);
        if (match && match[1]) {
          const invoiceRef = match[1];
          // Find the actual invoice
          const [invoice] = await tx.select().from(transactions)
            .where(and(
              eq(transactions.type, 'invoice'),
              eq(transactions.reference, invoiceRef)
            ));
            
          if (invoice) {
            // Calculate amount paid through this payment for this invoice
            const amountPaid = entry.credit || 0;
            
            invoiceInfo.set(invoiceRef, {
              id: invoice.id,
              amountPaid: (invoiceInfo.get(invoiceRef)?.amountPaid || 0) + amountPaid
            });
          }
        }
      }
      
      console.log(`Found ${invoiceInfo.size} invoices affected by payment #${paymentId}`);
      
      // Step 3: Delete any credit transactions created from this payment
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
        console.log(`Deleted credit transaction #${credit.id}, rows affected: ${deleteCreditResult.rowCount}`);
      }
      
      // Step 4: Restore invoices to their original status and balance
      for (const [invoiceRef, info] of invoiceInfo.entries()) {
        // Get current invoice data
        const [invoice] = await tx.select().from(transactions)
          .where(eq(transactions.id, info.id));
          
        if (invoice) {
          // Calculate new balance (add back the amount that was paid)
          const newBalance = Number(invoice.balance) + info.amountPaid;
          const newStatus = newBalance > 0 ? 'open' : 'completed';
          
          console.log(`Updating invoice #${invoiceRef} to balance ${newBalance} and status ${newStatus}`);
          await tx.execute(
            sql`UPDATE transactions 
                SET balance = ${newBalance}, status = ${newStatus}
                WHERE id = ${info.id}`
          );
        }
      }
      
      // Step 5: Delete payment ledger entries
      const deleteLedgerResult = await tx.execute(
        sql`DELETE FROM ledger_entries WHERE transaction_id = ${paymentId}`
      );
      console.log(`Deleted ${deleteLedgerResult.rowCount} ledger entries for payment #${paymentId}`);
      
      // Step 6: Delete payment line items if any
      const deleteLineItemsResult = await tx.execute(
        sql`DELETE FROM line_items WHERE transaction_id = ${paymentId}`
      );
      console.log(`Deleted ${deleteLineItemsResult.rowCount} line items for payment #${paymentId}`);
      
      // Step 7: Delete the payment transaction itself
      const deleteResult = await tx.execute(
        sql`DELETE FROM transactions WHERE id = ${paymentId}`
      );
      console.log(`Deleted payment transaction #${paymentId}, rows affected: ${deleteResult.rowCount}`);
      
      return {
        success: true,
        message: "Payment and all related transactions deleted successfully",
        details: {
          creditsDeleted: relatedCredits.length,
          invoicesUpdated: invoiceInfo.size,
          ledgerEntriesDeleted: deleteLedgerResult.rowCount
        }
      };
    });
  } catch (error) {
    console.error("Error during payment deletion:", error);
    throw new Error(`Failed to delete payment: ${error instanceof Error ? error.message : String(error)}`);
  }
}