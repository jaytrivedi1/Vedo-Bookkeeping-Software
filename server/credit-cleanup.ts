import { db } from './db';
import { transactions, ledgerEntries } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Special utility to clean up orphaned credit transactions that cannot be deleted normally
 */
export async function cleanupOrphanedCredit(creditId: number) {
  console.log(`Starting cleanup process for orphaned credit ID: ${creditId}`);

  try {
    // First verify this is indeed an orphaned credit
    const [credit] = await db.select().from(transactions).where(eq(transactions.id, creditId));
    
    if (!credit) {
      throw new Error(`Credit with ID ${creditId} not found`);
    }
    
    if (credit.type !== 'deposit' || !credit.reference.includes('CREDIT-')) {
      throw new Error(`Transaction ${creditId} is not a credit transaction`);
    }
    
    console.log(`Found credit: ${credit.reference} with balance ${credit.balance}`);
    
    // Get any ledger entries for this credit
    const ledgerEntries = await db.select().from(ledgerEntries).where(eq(ledgerEntries.transactionId, creditId));
    console.log(`Found ${ledgerEntries.length} ledger entries for credit ${creditId}`);
    
    // Begin transaction to ensure atomic cleanup
    return await db.transaction(async (tx) => {
      // Delete ledger entries first
      if (ledgerEntries.length > 0) {
        await tx.delete(ledgerEntries).where(eq(ledgerEntries.transactionId, creditId));
        console.log(`Deleted ${ledgerEntries.length} ledger entries for credit ${creditId}`);
      }
      
      // Then delete the credit transaction
      const result = await tx.delete(transactions).where(eq(transactions.id, creditId));
      console.log(`Deleted credit transaction ${creditId}, rows affected: ${result.rowCount}`);
      
      return {
        success: true,
        message: `Successfully removed orphaned credit ${credit.reference} (ID: ${creditId})`
      };
    });
  } catch (error) {
    console.error(`Error cleaning up orphaned credit ${creditId}:`, error);
    return {
      success: false,
      message: `Failed to clean up credit: ${error.message}`
    };
  }
}