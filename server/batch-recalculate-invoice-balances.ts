import { db } from './db';
import { transactions } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { DatabaseStorage } from './database-storage';

/**
 * Utility script to recalculate all invoice balances to ensure accuracy
 * This fixes issues where payments may have been double-counted
 */
export async function batchRecalculateInvoiceBalances() {
  console.log('Starting batch recalculation of all invoice balances...');
  
  try {
    const storage = new DatabaseStorage();
    
    // Get all invoices
    const invoices = await db
      .select()
      .from(transactions)
      .where(eq(transactions.type, 'invoice'));
    
    console.log(`Found ${invoices.length} invoices to recalculate`);
    
    let updateCount = 0;
    let noChangeCount = 0;
    
    for (const invoice of invoices) {
      console.log(`Recalculating invoice #${invoice.reference} (ID: ${invoice.id}), current balance: ${invoice.balance}`);
      
      // Get the original balance before recalculation
      const originalBalance = invoice.balance;
      
      // Recalculate the balance
      const updatedInvoice = await storage.recalculateInvoiceBalance(invoice.id);
      
      if (updatedInvoice) {
        if (updatedInvoice.balance !== originalBalance) {
          console.log(`  Updated balance from ${originalBalance} to ${updatedInvoice.balance}`);
          updateCount++;
        } else {
          console.log(`  No change needed, balance remains ${originalBalance}`);
          noChangeCount++;
        }
      } else {
        console.log(`  Failed to recalculate invoice #${invoice.reference}`);
      }
    }
    
    console.log(`Recalculation complete: Updated ${updateCount} invoices, ${noChangeCount} invoices were already correct`);
    
  } catch (error) {
    console.error('Error recalculating invoice balances:', error);
  }
}

export default batchRecalculateInvoiceBalances;

// Run the script directly when called from command line
// Using top level await in ESM modules
if (process.argv[1].includes('batch-recalculate-invoice-balances')) {
  await batchRecalculateInvoiceBalances()
    .then(() => {
      console.log('Recalculation script completed');
    })
    .catch(err => {
      console.error('Error running recalculation script:', err);
      process.exit(1);
    });
}