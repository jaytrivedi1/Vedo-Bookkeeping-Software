import { db } from './db';
import { transactions, ledgerEntries, lineItems } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Comprehensive deposit deletion handler that ensures:
 * 1. Invoice balances and statuses are properly restored when deposits were applied to invoices
 * 2. All ledger entries are removed
 * 3. All operations occur in a single atomic transaction
 * 
 * @param depositId The ID of the deposit to delete
 * @returns Result object with details of the deletion operation
 */
export async function deleteDepositAndReverseApplications(depositId: number) {
  console.log(`Starting comprehensive deposit deletion for deposit #${depositId}`);
  
  try {
    // Execute all operations in a single database transaction
    return await db.transaction(async (tx) => {
      // Step 1: Get the deposit to verify it exists
      const [deposit] = await tx.select().from(transactions)
        .where(and(
          eq(transactions.id, depositId),
          eq(transactions.type, 'deposit')
        ));
      
      if (!deposit) {
        throw new Error(`Deposit #${depositId} not found or is not a deposit transaction`);
      }
      
      console.log(`Found deposit #${deposit.reference} with amount $${deposit.amount}`);
      
      // Step 2: Find all ledger entries for this deposit
      const depositLedgerEntries = await tx.select().from(ledgerEntries)
        .where(eq(ledgerEntries.transactionId, depositId));
      
      console.log(`Found ${depositLedgerEntries.length} ledger entries for deposit #${depositId}`);
      
      // Step 3: Find all line items where this deposit was used (type='deposit', transactionId=depositId)
      // These line items belong to payment transactions that applied the deposit to invoices
      const depositLineItems = await tx.select().from(lineItems)
        .where(and(
          eq(lineItems.type, 'deposit'),
          eq(lineItems.transactionId, depositId)
        ));
      
      console.log(`Found ${depositLineItems.length} line items referencing this deposit`);
      
      // Map to track invoices that need to be restored with their applied amounts
      const invoicesToRestore = new Map<number, { 
        id: number, 
        reference: string,
        amountApplied: number,
        paymentIds: number[]
      }>();
      
      // Track auto-payment transactions to delete
      const autoPaymentIdsToDelete = new Set<number>();
      
      // Step 4: For each line item, find the payment transaction and the related invoice
      for (const depositLineItem of depositLineItems) {
        // Find the line item's parent transaction (the payment/auto-payment)
        const parentTransactionId = depositLineItem.parentTransactionId;
        
        if (!parentTransactionId) {
          console.log(`Skipping line item #${depositLineItem.id} - no parent transaction`);
          continue;
        }
        
        // Get the payment transaction
        const [paymentTransaction] = await tx.select().from(transactions)
          .where(eq(transactions.id, parentTransactionId));
        
        if (!paymentTransaction || paymentTransaction.type !== 'payment') {
          console.log(`Skipping line item #${depositLineItem.id} - parent #${parentTransactionId} is not a payment`);
          continue;
        }
        
        console.log(`Found payment transaction #${paymentTransaction.id} (${paymentTransaction.reference}) that used this deposit`);
        
        // Find invoice line items in the same payment
        const invoiceLineItems = await tx.select().from(lineItems)
          .where(and(
            eq(lineItems.parentTransactionId, parentTransactionId),
            eq(lineItems.type, 'invoice')
          ));
        
        // Process each invoice that this payment applied credits to
        for (const invoiceLineItem of invoiceLineItems) {
          const invoiceId = invoiceLineItem.transactionId;
          if (!invoiceId) continue;
          
          // Get the invoice transaction
          const [invoice] = await tx.select().from(transactions)
            .where(eq(transactions.id, invoiceId));
          
          if (!invoice) {
            console.log(`Invoice #${invoiceId} not found, skipping`);
            continue;
          }
          
          // The amount applied from this deposit to this invoice is in the deposit line item
          const appliedAmount = Number(depositLineItem.amount || 0);
          
          // Add or update the invoice data in our map
          const existing = invoicesToRestore.get(invoiceId);
          if (existing) {
            invoicesToRestore.set(invoiceId, {
              ...existing,
              amountApplied: existing.amountApplied + appliedAmount,
              paymentIds: [...existing.paymentIds, paymentTransaction.id]
            });
          } else {
            invoicesToRestore.set(invoiceId, {
              id: invoice.id,
              reference: invoice.reference,
              amountApplied: appliedAmount,
              paymentIds: [paymentTransaction.id]
            });
          }
          
          console.log(`Invoice #${invoice.reference} (ID: ${invoiceId}) had $${appliedAmount} applied from deposit #${depositId}`);
        }
        
        // Mark this auto-payment for deletion
        autoPaymentIdsToDelete.add(parentTransactionId);
      }
      
      console.log(`Found ${invoicesToRestore.size} invoices affected by deposit #${depositId}`);
      console.log(`Found ${autoPaymentIdsToDelete.size} auto-payment transactions to delete`);
      
      // Step 5: Delete auto-payment transactions that applied this deposit
      for (const paymentId of autoPaymentIdsToDelete) {
        // Delete line items for this payment
        const deleteLineItemsResult = await tx.execute(
          sql`DELETE FROM line_items WHERE parent_transaction_id = ${paymentId}`
        );
        console.log(`Deleted ${deleteLineItemsResult.rowCount} line items for payment #${paymentId}`);
        
        // Delete ledger entries for this payment
        const deleteLedgerResult = await tx.execute(
          sql`DELETE FROM ledger_entries WHERE transaction_id = ${paymentId}`
        );
        console.log(`Deleted ${deleteLedgerResult.rowCount} ledger entries for payment #${paymentId}`);
        
        // Delete the payment transaction itself
        const deletePaymentResult = await tx.execute(
          sql`DELETE FROM transactions WHERE id = ${paymentId}`
        );
        console.log(`Deleted payment transaction #${paymentId}`);
      }
      
      // Step 6: Restore invoice balances and statuses
      const restoredInvoices = [];
      for (const [invoiceId, info] of Array.from(invoicesToRestore.entries())) {
        // Get current invoice data
        const [invoice] = await tx.select().from(transactions)
          .where(eq(transactions.id, info.id));
          
        if (invoice) {
          // Calculate new balance by adding back what was applied
          const currentBalance = Number(invoice.balance || 0);
          const newBalance = Math.round((currentBalance + info.amountApplied) * 100) / 100;
          
          // Determine appropriate status based on balance
          const newStatus = newBalance > 0 ? 'open' : 'completed';
          
          console.log(`Restoring invoice #${invoiceRef}: balance ${currentBalance} + ${info.amountApplied} = ${newBalance}, status: ${newStatus}`);
          
          await tx.execute(
            sql`UPDATE transactions 
                SET balance = ${newBalance}, status = ${newStatus}
                WHERE id = ${info.id}`
          );
          
          restoredInvoices.push({
            id: info.id,
            reference: invoiceRef,
            previousBalance: currentBalance,
            newBalance: newBalance,
            newStatus: newStatus,
            amountRestored: info.amountApplied
          });
        }
      }
      
      // Step 7: Delete deposit's own ledger entries
      const deleteLedgerResult = await tx.execute(
        sql`DELETE FROM ledger_entries WHERE transaction_id = ${depositId}`
      );
      console.log(`Deleted ${deleteLedgerResult.rowCount} ledger entries for deposit #${depositId}`);
      
      // Step 8: Delete deposit line items if any
      const deleteLineItemsResult = await tx.execute(
        sql`DELETE FROM line_items WHERE transaction_id = ${depositId}`
      );
      console.log(`Deleted ${deleteLineItemsResult.rowCount} line items for deposit #${depositId}`);
      
      // Step 9: Delete the deposit transaction itself
      const deleteResult = await tx.execute(
        sql`DELETE FROM transactions WHERE id = ${depositId}`
      );
      console.log(`Deleted deposit transaction #${depositId}, rows affected: ${deleteResult.rowCount}`);
      
      // Return detailed results of the operation
      return {
        success: true,
        depositId: depositId,
        depositReference: deposit.reference,
        invoicesRestored: restoredInvoices,
        message: `Deposit ${deposit.reference} and related applications successfully deleted`
      };
    });
  } catch (error) {
    console.error("Error in deposit deletion process:", error);
    throw new Error(`Failed to delete deposit: ${error instanceof Error ? error.message : String(error)}`);
  }
}
