import { db } from './db';
import { transactions, ledgerEntries, paymentApplications } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Comprehensive deposit deletion handler that ensures:
 * 1. Invoice balances and statuses are properly restored when deposits were applied to invoices
 * 2. All ledger entries are removed
 * 3. All operations occur in a single atomic transaction
 * 4. Uses payment_applications table as the source of truth
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
      
      // Step 2: Find all payment_applications records where this deposit was used
      const applications = await tx.select().from(paymentApplications)
        .where(eq(paymentApplications.paymentId, depositId));
      
      console.log(`Found ${applications.length} payment applications for deposit #${depositId}`);
      
      // Map to track invoices that need to be restored with their applied amounts
      const invoicesToRestore = new Map<number, { 
        id: number, 
        reference: string,
        amountApplied: number
      }>();
      
      // Step 3: Process each application to gather invoice restoration data
      for (const application of applications) {
        // Get the invoice transaction
        const [invoice] = await tx.select().from(transactions)
          .where(eq(transactions.id, application.invoiceId));
        
        if (!invoice) {
          console.log(`Invoice #${application.invoiceId} not found, skipping`);
          continue;
        }
        
        const appliedAmount = Number(application.amountApplied || 0);
        
        // Add or update the invoice data in our map
        const existing = invoicesToRestore.get(invoice.id);
        if (existing) {
          invoicesToRestore.set(invoice.id, {
            ...existing,
            amountApplied: existing.amountApplied + appliedAmount
          });
        } else {
          invoicesToRestore.set(invoice.id, {
            id: invoice.id,
            reference: invoice.reference,
            amountApplied: appliedAmount
          });
        }
        
        console.log(`Invoice #${invoice.reference} (ID: ${invoice.id}) had $${appliedAmount} applied from deposit #${depositId}`);
      }
      
      console.log(`Found ${invoicesToRestore.size} invoices affected by deposit #${depositId}`);
      
      // Step 4: Delete payment_applications records for this deposit
      if (applications.length > 0) {
        await tx.delete(paymentApplications)
          .where(eq(paymentApplications.paymentId, depositId));
        console.log(`Deleted ${applications.length} payment_applications records`);
      }
      
      // Step 5: Restore invoice balances and statuses
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
          const newStatus = newBalance > 0 ? 'open' : 'paid';
          
          console.log(`Restoring invoice #${info.reference}: balance ${currentBalance} + ${info.amountApplied} = ${newBalance}, status: ${newStatus}`);
          
          await tx.update(transactions)
            .set({ 
              balance: newBalance, 
              status: newStatus 
            })
            .where(eq(transactions.id, info.id));
          
          restoredInvoices.push({
            id: info.id,
            reference: info.reference,
            previousBalance: currentBalance,
            newBalance: newBalance,
            newStatus: newStatus,
            amountRestored: info.amountApplied
          });
        }
      }
      
      // Step 6: Delete deposit's own ledger entries
      const depositLedgerEntries = await tx.select().from(ledgerEntries)
        .where(eq(ledgerEntries.transactionId, depositId));
      
      if (depositLedgerEntries.length > 0) {
        await tx.delete(ledgerEntries)
          .where(eq(ledgerEntries.transactionId, depositId));
        console.log(`Deleted ${depositLedgerEntries.length} ledger entries for deposit #${depositId}`);
      }
      
      // Step 7: Delete the deposit transaction itself
      await tx.delete(transactions)
        .where(eq(transactions.id, depositId));
      console.log(`Deleted deposit transaction #${depositId}`);
      
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
