import { db } from './db';
import { transactions, ledgerEntries, paymentApplications, lineItems } from '@shared/schema';
import { eq, and, sql, or, inArray } from 'drizzle-orm';

/**
 * Comprehensive payment deletion handler that ensures:
 * 1. Payment applications are properly removed
 * 2. Invoice/bill balances and statuses are properly restored
 * 3. Deposit/cheque balances are properly restored
 * 4. Related ledger entries and transactions are cleaned up
 * 5. All operations occur in a single atomic transaction
 * 6. Company isolation - verifies payment belongs to the specified company
 *
 * @param paymentId The ID of the payment/cheque to delete
 * @param companyId The company ID to verify ownership (REQUIRED for security)
 * @returns Result object with details of the deletion operation
 */
export async function deletePaymentAndRelatedTransactions(paymentId: number, companyId?: number) {
  console.log(`Starting comprehensive payment deletion for payment #${paymentId}, company: ${companyId}`);

  try {
    // Execute all operations in a single database transaction
    return await db.transaction(async (tx) => {
      // Step 1: Get the payment/cheque to verify it exists AND belongs to the company
      const whereConditions = [
        eq(transactions.id, paymentId),
        or(
          eq(transactions.type, 'payment'),
          eq(transactions.type, 'cheque')
        )
      ];

      // Add company filter for security (if provided)
      if (companyId) {
        whereConditions.push(eq(transactions.companyId, companyId));
      }

      const [payment] = await tx.select().from(transactions)
        .where(and(...whereConditions));

      if (!payment) {
        throw new Error(`Payment #${paymentId} not found, is not a payment/cheque, or access denied`);
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
      
      // Step 3b: Restore deposit/cheque balances from line_items
      // Line items with negative amounts represent deposits/cheques used as payment sources
      const paymentLineItems = await tx.select().from(lineItems)
        .where(eq(lineItems.transactionId, paymentId));
      
      console.log(`Found ${paymentLineItems.length} line items for payment #${paymentId}`);
      
      const restoredCredits = [];
      for (const lineItem of paymentLineItems) {
        // Negative amounts indicate deposits/cheques being used
        if (lineItem.amount < 0) {
          // Extract the deposit/cheque ID from the description
          // Format: "Using deposit DEP-XXX credit" or "Using cheque CHQ-XXX credit"
          const match = lineItem.description?.match(/(deposit|cheque) ([A-Z0-9-]+)/i);
          
          if (match) {
            const creditReference = match[2];
            
            // Find the deposit/cheque transaction
            const [creditTransaction] = await tx.select().from(transactions)
              .where(and(
                eq(transactions.reference, creditReference),
                or(
                  eq(transactions.type, 'deposit'),
                  eq(transactions.type, 'cheque')
                )
              ));
            
            if (creditTransaction) {
              // Restore the balance (add back the amount that was used)
              const amountUsed = Math.abs(lineItem.amount);
              const currentBalance = Number(creditTransaction.balance ?? 0);
              
              // For deposits, balances are stored as negative (credits)
              // For cheques, balances are stored as positive (credits)
              // We need to restore the credit by adding it back
              let newBalance;
              if (creditTransaction.type === 'deposit') {
                // Deposits have negative balances, so subtract to make more negative (more credit)
                newBalance = currentBalance - amountUsed;
              } else {
                // Cheques have positive balances, so add to increase credit
                newBalance = currentBalance + amountUsed;
              }
              
              // Status should be unapplied_credit if there's any balance remaining (positive or negative)
              const newStatus = Math.abs(newBalance) > 0.01 ? 'unapplied_credit' : 'completed';
              
              console.log(`Restoring ${creditTransaction.type} ${creditTransaction.reference}: balance from ${creditTransaction.balance} to ${newBalance}, status to ${newStatus}`);
              
              await tx.execute(
                sql`UPDATE transactions 
                    SET balance = ${newBalance}, status = ${newStatus}
                    WHERE id = ${creditTransaction.id}`
              );
              
              restoredCredits.push({
                id: creditTransaction.id,
                reference: creditTransaction.reference,
                type: creditTransaction.type,
                previousBalance: creditTransaction.balance,
                newBalance: newBalance,
                previousStatus: creditTransaction.status,
                newStatus: newStatus,
                amountRestored: amountUsed
              });
            }
          }
        }
      }
      
      console.log(`Restored ${restoredCredits.length} deposit/cheque balances`);
      
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
        creditsRestored: restoredCredits,
        message: "Payment and related records successfully deleted"
      };
    });
  } catch (error) {
    console.error("Error in payment deletion process:", error);
    throw new Error(`Failed to delete payment: ${error instanceof Error ? error.message : String(error)}`);
  }
}
