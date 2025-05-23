import { db } from './db';
import { ledgerEntries, transactions } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm/sql';

/**
 * Special utility to clean up orphaned credit transactions that cannot be deleted normally
 * through the standard interface.
 */
export async function cleanupOrphanedCredit(creditId: number) {
  console.log(`Starting orphaned credit cleanup for ID: ${creditId}`);
  
  try {
    // First, verify this is indeed a credit transaction
    const [credit] = await db.select().from(transactions).where(eq(transactions.id, creditId));
    
    if (!credit) {
      throw new Error(`Transaction with ID ${creditId} not found`);
    }
    
    if (credit.type !== 'deposit' || !credit.reference.includes('CREDIT-')) {
      throw new Error(`Transaction ID ${creditId} is not a credit transaction`);
    }
    
    console.log(`Found credit transaction: ${credit.reference} with balance ${credit.balance}`);
    
    // Begin transaction for atomic operations
    return await db.transaction(async (tx) => {
      // Delete any ledger entries for this credit
      const deleteLedgerResult = await tx.execute(
        sql`DELETE FROM ledger_entries WHERE transaction_id = ${creditId}`
      );
      console.log(`Deleted ${deleteLedgerResult.rowCount} ledger entries for credit ID ${creditId}`);
      
      // Delete any line items (unlikely for a credit, but check anyway)
      const deleteLineItemsResult = await tx.execute(
        sql`DELETE FROM line_items WHERE transaction_id = ${creditId}`
      );
      console.log(`Deleted ${deleteLineItemsResult.rowCount} line items for credit ID ${creditId}`);
      
      // Now delete the credit transaction itself
      const deleteTransactionResult = await tx.execute(
        sql`DELETE FROM transactions WHERE id = ${creditId}`
      );
      console.log(`Deleted credit transaction ID ${creditId}, rows affected: ${deleteTransactionResult.rowCount}`);
      
      return {
        success: true,
        message: `Successfully removed orphaned credit ${credit.reference}`
      };
    });
  } catch (error) {
    console.error(`Failed to cleanup orphaned credit ${creditId}:`, error);
    return {
      success: false,
      message: `Failed to clean up orphaned credit: ${error.message}`
    };
  }
}