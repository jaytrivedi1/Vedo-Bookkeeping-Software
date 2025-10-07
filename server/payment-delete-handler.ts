import { db } from './db';
import { transactions, ledgerEntries, paymentApplications } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Comprehensive payment deletion handler that ensures:
 * 1. Payment applications are properly removed
 * 2. Invoice balances and statuses are properly restored
 * 3. Related ledger entries and transactions are cleaned up
 * 4. All operations occur in a single atomic transaction
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
      
      console.log(`Deleting payment #${paymentId} with balance: ${payment.balance}`);
      
      // Step 2: Find all payment applications for this payment using the payment_applications table
      const applications = await tx.select().from(paymentApplications)
        .where(eq(paymentApplications.paymentId, paymentId));
      
      console.log(`Found ${applications.length} payment applications to reverse`);
      
      // Step 3: Restore invoice balances and statuses
      const restoredInvoices = [];
      for (const app of applications) {
        // Get current invoice data
        const [invoice] = await tx.select().from(transactions)
          .where(eq(transactions.id, app.invoiceId));
          
        if (invoice) {
          // Calculate new balance by adding back what was paid
          const newBalance = Number(invoice.balance) + Number(app.amountApplied);
          // Determine appropriate status based on balance
          const newStatus = newBalance > 0 ? 'open' : 'completed';
          
          console.log(`Restoring invoice #${invoice.reference}: balance from ${invoice.balance} to ${newBalance}, status to ${newStatus}`);
          
          await tx.execute(
            sql`UPDATE transactions 
                SET balance = ${newBalance}, status = ${newStatus}
                WHERE id = ${app.invoiceId}`
          );
          
          restoredInvoices.push({
            id: invoice.id,
            reference: invoice.reference,
            previousBalance: invoice.balance,
            newBalance: newBalance,
            previousStatus: invoice.status,
            newStatus: newStatus,
            amountRestored: app.amountApplied
          });
        }
      }
      
      // Step 4: Delete payment application records
      const deleteAppsResult = await tx.execute(
        sql`DELETE FROM payment_applications WHERE payment_id = ${paymentId}`
      );
      console.log(`Deleted ${deleteAppsResult.rowCount} payment application records`);
      
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
      
      // Return detailed results of the operation
      return {
        success: true,
        paymentId: paymentId,
        applicationsDeleted: applications.length,
        invoicesRestored: restoredInvoices,
        message: "Payment and related records successfully deleted"
      };
    });
  } catch (error) {
    console.error("Error in payment deletion process:", error);
    throw new Error(`Failed to delete payment: ${error instanceof Error ? error.message : String(error)}`);
  }
}
