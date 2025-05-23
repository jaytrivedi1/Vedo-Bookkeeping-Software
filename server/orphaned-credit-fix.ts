import { db } from './db';
import { eq, like, and, sql } from 'drizzle-orm';
import { transactions, ledgerEntries } from '@shared/schema';

export async function cleanupOrphanedCredits() {
  console.log("Starting orphaned credit cleanup process...");
  try {
    // Find all deposit transactions of type 'unapplied_credit'
    const creditTransactions = await db.select().from(transactions)
      .where(and(
        eq(transactions.type, 'deposit'),
        eq(transactions.status, 'unapplied_credit')
      ));
    
    console.log(`Found ${creditTransactions.length} credit transactions to analyze`);
    
    let orphanedCredits = 0;
    
    // Check each credit to see if it's orphaned
    for (const credit of creditTransactions) {
      // Check if this is a system-generated credit from a payment
      const isFromPayment = credit.description?.includes('Unapplied credit from payment #');
      
      if (isFromPayment) {
        // Extract payment ID from description
        const paymentIdMatch = credit.description.match(/Unapplied credit from payment #(\d+)/);
        if (paymentIdMatch && paymentIdMatch[1]) {
          const paymentId = parseInt(paymentIdMatch[1], 10);
          
          // Check if referenced payment exists
          const [payment] = await db.select().from(transactions)
            .where(eq(transactions.id, paymentId));
          
          if (!payment) {
            console.log(`Credit #${credit.id} (${credit.reference}) references non-existent payment #${paymentId} - marking as orphaned`);
            orphanedCredits++;
            
            // Delete ledger entries for this orphaned credit
            const deleteLedgerResult = await db.execute(
              sql`DELETE FROM ledger_entries WHERE transaction_id = ${credit.id}`
            );
            console.log(`Deleted ${deleteLedgerResult.rowCount} ledger entries for orphaned credit #${credit.id}`);
            
            // Delete the orphaned credit transaction
            const deleteResult = await db.execute(
              sql`DELETE FROM transactions WHERE id = ${credit.id}`
            );
            console.log(`Deleted orphaned credit transaction #${credit.id}, rows affected: ${deleteResult.rowCount}`);
          }
        }
      }
    }
    
    console.log(`Cleanup complete. Removed ${orphanedCredits} orphaned credit transactions.`);
    return orphanedCredits;
  } catch (error) {
    console.error("Error during orphaned credit cleanup:", error);
    throw error;
  }
}