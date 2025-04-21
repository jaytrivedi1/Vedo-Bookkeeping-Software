import { db } from './db';
import { transactions } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Migration script to ensure all invoices have a proper balance set
 */
async function migrateInvoiceBalance() {
  console.log('Starting migration to ensure all invoices have proper balance...');
  
  try {
    // Get all invoices without balance set
    const results = await db
      .select()
      .from(transactions)
      .where(eq(transactions.type, 'invoice'))
      .execute();
    
    let updateCount = 0;
    
    for (const invoice of results) {
      // If balance is null or undefined, set it to the amount
      if (invoice.balance === null || invoice.balance === undefined) {
        console.log(`Setting balance for invoice #${invoice.id} (${invoice.reference}) to match amount: ${invoice.amount}`);
        
        await db
          .update(transactions)
          .set({ balance: invoice.amount })
          .where(eq(transactions.id, invoice.id))
          .execute();
          
        updateCount++;
      }
    }
    
    console.log(`Updated balance for ${updateCount} invoices`);
    console.log('Invoice balance migration completed successfully!');
  } catch (error) {
    console.error('Error migrating invoice balances:', error);
    throw error;
  }
}

export default migrateInvoiceBalance;