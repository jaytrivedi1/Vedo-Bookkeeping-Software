import { db } from './db';
import { transactions, ledgerEntries } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { DatabaseStorage } from './database-storage';

/**
 * Special script to fix the balance for invoice #1007
 */
async function fixInvoice1007() {
  console.log('Starting special fix for invoice #1007');
  
  try {
    const storage = new DatabaseStorage();
    
    // Get invoice #1007
    const invoices = await db
      .select()
      .from(transactions)
      .where(eq(transactions.reference, '1007'));
    
    if (invoices.length === 0) {
      console.log('Invoice #1007 not found');
      return;
    }
    
    const invoice = invoices[0];
    console.log(`Found invoice #1007 (ID: ${invoice.id}), current balance: ${invoice.balance}`);
    
    // Get the deposit credit that should be applied to this invoice
    const deposits = await db
      .select()
      .from(transactions)
      .where(eq(transactions.reference, 'CREDIT-19192'));
    
    if (deposits.length === 0) {
      console.log('Deposit CREDIT-19192 not found');
      return;
    }
    
    const deposit = deposits[0];
    console.log(`Found deposit ${deposit.reference} (ID: ${deposit.id}), amount: ${deposit.amount}`);
    
    // Check if there's already a ledger entry for this application
    const existingEntries = await db
      .select()
      .from(ledgerEntries)
      .where(eq(ledgerEntries.transactionId, invoice.id));
    
    console.log(`Invoice has ${existingEntries.length} existing ledger entries`);
    
    // Check if there's a ledger entry showing this deposit being applied to the invoice
    const applicationEntries = await db
      .select()
      .from(ledgerEntries)
      .where(
        and(
          eq(ledgerEntries.accountId, 2), // Accounts Receivable
          eq(ledgerEntries.credit, deposit.amount)
        )
      );
    
    console.log(`Found ${applicationEntries.length} entries with credit=${deposit.amount}`);
    
    // Create a new ledger entry that links the deposit to the invoice if one doesn't exist
    const needsNewEntry = !applicationEntries.some(
      (entry: any) => entry.description?.includes(`invoice #${invoice.reference}`)
    );
    
    if (needsNewEntry) {
      console.log('Creating a new ledger entry to link the deposit to the invoice');
      
      // Create a ledger entry for the payment from this deposit to the invoice
      await db.insert(ledgerEntries).values({
        transactionId: deposit.id,
        accountId: 2, // Accounts Receivable
        description: `Payment applied to invoice #${invoice.reference}`,
        debit: 0,
        credit: deposit.amount,
        date: new Date()
      });
      
      console.log(`Created new ledger entry linking deposit ${deposit.id} to invoice ${invoice.id}`);
    } else {
      console.log('Found existing ledger entry linking the deposit to the invoice');
    }
    
    // Update the invoice balance to $615 (invoice amount $1050 - deposit $435)
    const correctBalance = 615;
    
    const [updatedInvoice] = await db
      .update(transactions)
      .set({
        balance: correctBalance,
        status: 'open' // Since it's partially paid, status should be 'open'
      })
      .where(eq(transactions.id, invoice.id))
      .returning();
    
    console.log(`Updated invoice #1007, new balance: ${updatedInvoice.balance}, status: ${updatedInvoice.status}`);
    
    console.log('Fix completed successfully');
    
  } catch (error) {
    console.error('Error fixing invoice #1007:', error);
  }
}

// Run the script
void (async () => {
  try {
    await fixInvoice1007();
    console.log('Script completed');
    process.exit(0);
  } catch (err) {
    console.error('Error running script:', err);
    process.exit(1);
  }
})();