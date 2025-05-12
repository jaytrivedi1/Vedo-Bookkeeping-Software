import { db } from './db';
import { transactions } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

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
          and(
            eq(transactions.balance, null, false),  // balance is not null
            ne(transactions.balance, 0)            // balance is not 0
          )
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

// Run immediately if executed directly
if (require.main === module) {
  batchUpdateInvoiceStatuses().then(() => {
    console.log('Batch update completed, exiting.');
    process.exit(0);
  }).catch((error) => {
    console.error('Error in batch update:', error);
    process.exit(1);
  });
}