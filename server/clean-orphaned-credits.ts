import { db } from './db';
import { transactions, ledgerEntries } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

/**
 * This utility function cleans up orphaned credit transactions that remain after
 * their parent payment transactions have been deleted.
 */
export async function removeOrphanedCredits() {
  try {
    console.log("Starting orphaned credit cleanup...");
    
    // Find credit transactions (deposits with unapplied_credit status)
    // that reference payments in their description
    const credits = await db.select().from(transactions)
      .where(eq(transactions.type, 'deposit'));
      
    console.log(`Found ${credits.length} credit transactions to analyze`);
    
    let orphanedCount = 0;
    
    for (const credit of credits) {
      // Check if this is a system-generated credit from a payment
      if (credit.description?.includes('Unapplied credit from payment #')) {
        // Extract the payment ID from the description
        const paymentIdMatch = credit.description.match(/Unapplied credit from payment #(\d+)/);
        
        if (paymentIdMatch && paymentIdMatch[1]) {
          const paymentId = parseInt(paymentIdMatch[1], 10);
          
          // Check if the referenced payment exists
          const [payment] = await db.select().from(transactions)
            .where(eq(transactions.id, paymentId));
            
          if (!payment) {
            console.log(`Credit #${credit.id} references non-existent payment #${paymentId} - orphaned credit`);
            
            // Delete ledger entries for this orphaned credit first
            const deleteLedgerResult = await db.execute(
              sql`DELETE FROM ledger_entries WHERE transaction_id = ${credit.id}`
            );
            console.log(`Deleted ${deleteLedgerResult.rowCount} ledger entries for orphaned credit #${credit.id}`);
            
            // Delete the orphaned credit transaction itself
            const deleteResult = await db.execute(
              sql`DELETE FROM transactions WHERE id = ${credit.id}`
            );
            console.log(`Deleted orphaned credit #${credit.id}, rows affected: ${deleteResult.rowCount}`);
            
            orphanedCount++;
          }
        }
      }
    }
    
    console.log(`Cleanup complete. Removed ${orphanedCount} orphaned credit transactions.`);
    return `Successfully removed ${orphanedCount} orphaned credit transactions.`;
  } catch (error) {
    console.error("Error cleaning up orphaned credits:", error);
    throw new Error(`Failed to clean up orphaned credits: ${error instanceof Error ? error.message : String(error)}`);
  }
}