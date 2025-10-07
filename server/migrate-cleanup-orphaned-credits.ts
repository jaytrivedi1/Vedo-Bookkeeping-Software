/**
 * Migration to clean up orphaned unapplied credit deposit transactions
 * and consolidate them back into their parent payment transactions
 */
import { db } from './db';
import { transactions, ledgerEntries, paymentApplications } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function cleanupOrphanedCredits() {
  console.log('Starting cleanup of orphaned unapplied credit deposits...');
  
  try {
    await db.transaction(async (tx) => {
      // Find all deposit transactions that were created as unapplied credits from payments
      const orphanedCredits = await tx
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.type, 'deposit'),
            eq(transactions.status, 'unapplied_credit'),
            sql`${transactions.description} LIKE '%Unapplied credit from payment%'`
          )
        );
      
      console.log(`Found ${orphanedCredits.length} orphaned credit deposits to process`);
      
      for (const credit of orphanedCredits) {
        // Extract the parent payment ID from the description
        const match = credit.description?.match(/payment #(\d+)/i);
        if (!match || !match[1]) {
          console.log(`Skipping credit #${credit.id}: Could not extract parent payment ID`);
          continue;
        }
        
        const parentPaymentId = parseInt(match[1], 10);
        
        // Get the parent payment
        const [parentPayment] = await tx
          .select()
          .from(transactions)
          .where(eq(transactions.id, parentPaymentId));
        
        if (!parentPayment) {
          console.log(`Skipping credit #${credit.id}: Parent payment #${parentPaymentId} not found`);
          continue;
        }
        
        // Check if the credit has been applied to any invoices
        const appliedLedgers = await tx
          .select()
          .from(ledgerEntries)
          .where(
            and(
              eq(ledgerEntries.transactionId, credit.id),
              sql`${ledgerEntries.description} LIKE '%Applied credit from deposit%'`
            )
          );
        
        if (appliedLedgers.length > 0) {
          console.log(`Skipping credit #${credit.id}: Already applied to invoices, cannot consolidate`);
          continue;
        }
        
        const creditAmount = Math.abs(Number(credit.balance) || Number(credit.amount));
        
        console.log(`Processing credit #${credit.id} (amount: ${creditAmount}) from payment #${parentPaymentId}`);
        
        // Update parent payment to include this credit amount in its balance
        const currentPaymentBalance = Number(parentPayment.balance) || 0;
        const newPaymentBalance = currentPaymentBalance + creditAmount;
        
        await tx
          .update(transactions)
          .set({
            balance: newPaymentBalance,
            status: 'unapplied_credit'
          })
          .where(eq(transactions.id, parentPaymentId));
        
        console.log(`Updated payment #${parentPaymentId}: balance ${currentPaymentBalance} -> ${newPaymentBalance}`);
        
        // Delete the ledger entries for this orphaned credit
        await tx
          .delete(ledgerEntries)
          .where(eq(ledgerEntries.transactionId, credit.id));
        
        // Delete the orphaned credit transaction
        await tx
          .delete(transactions)
          .where(eq(transactions.id, credit.id));
        
        console.log(`Deleted orphaned credit #${credit.id}`);
      }
      
      console.log('Orphaned credit cleanup completed successfully!');
    });
  } catch (error) {
    console.error('Error during orphaned credit cleanup:', error);
    throw error;
  }
}
