import { db } from './db';
import { transactions } from '@shared/schema';
import { eq, and, ne, isNotNull, sql } from 'drizzle-orm';

/**
 * Utility script to update invoice statuses based on their balance
 * Can be run on-demand or scheduled
 */
async function batchUpdateInvoiceStatuses() {
  console.log('Starting batch update of invoice statuses...');
  
  try {
    // 1. Find completed invoices that still show as open
    const completedResult = await db
      .update(transactions)
      .set({ status: 'completed' })
      .where(
        and(
          eq(transactions.type, 'invoice'),
          eq(transactions.status, 'open'), 
          eq(transactions.balance, 0)
        )
      )
      .returning({ id: transactions.id, reference: transactions.reference });
    
    console.log(`Updated ${completedResult.length} paid invoices from 'open' to 'completed'`);
    
    if (completedResult.length > 0) {
      console.log('Updated the following invoices:');
      completedResult.forEach(invoice => {
        console.log(`- Invoice #${invoice.reference} (ID: ${invoice.id})`);
      });
    }
    
    // 2. Find open invoices marked as completed but with remaining balance
    const reopenedResult = await db
      .update(transactions)
      .set({ status: 'open' })
      .where(
        and(
          eq(transactions.type, 'invoice'),
          eq(transactions.status, 'completed'),
          sql`${transactions.balance} IS NOT NULL AND ${transactions.balance} <> 0`
        )
      )
      .returning({ id: transactions.id, reference: transactions.reference, balance: transactions.balance });
    
    console.log(`Updated ${reopenedResult.length} invoices from 'completed' to 'open' (they still have a balance)`);
    
    if (reopenedResult.length > 0) {
      console.log('Re-opened the following invoices:');
      reopenedResult.forEach(invoice => {
        console.log(`- Invoice #${invoice.reference} (ID: ${invoice.id}, Balance: ${invoice.balance})`);
      });
    }
    
    console.log('Batch update completed successfully.');
    
  } catch (error) {
    console.error('Error updating invoice statuses:', error);
  }
}

export default batchUpdateInvoiceStatuses;

// NOTE: Standalone execution block removed to prevent process.exit() in bundled production code
// To run this script standalone, use: npx tsx server/batch-update-invoice-statuses.ts