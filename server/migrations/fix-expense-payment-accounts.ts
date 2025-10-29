import { db } from '../db';
import { transactions, ledgerEntries } from '../../shared/schema';
import { eq, and, isNull } from 'drizzle-orm';

/**
 * Migration to fix expense transactions that are missing paymentAccountId
 * by extracting the payment account from their credit ledger entries
 */
export async function fixExpensePaymentAccounts() {
  try {
    console.log('Starting migration to fix expense payment accounts...');
    
    // Get all expense transactions with missing paymentAccountId
    const expensesWithoutPaymentAccount = await db.select()
      .from(transactions)
      .where(and(
        eq(transactions.type, 'expense'),
        isNull(transactions.paymentAccountId)
      ));
    
    console.log(`Found ${expensesWithoutPaymentAccount.length} expenses without payment account`);
    
    let fixed = 0;
    
    for (const expense of expensesWithoutPaymentAccount) {
      // Get the ledger entries for this transaction
      const entries = await db.select()
        .from(ledgerEntries)
        .where(eq(ledgerEntries.transactionId, expense.id));
      
      // Find the credit entry (payment account)
      const creditEntry = entries.find(entry => entry.credit > 0);
      
      if (creditEntry) {
        // Update the transaction with the payment account
        await db.update(transactions)
          .set({
            paymentAccountId: creditEntry.accountId,
            paymentMethod: expense.paymentMethod || 'eft',  // Default to EFT if not set
            paymentDate: expense.paymentDate || expense.date  // Use transaction date if payment date not set
          })
          .where(eq(transactions.id, expense.id));
        
        fixed++;
        console.log(`Fixed expense ${expense.id} with payment account ${creditEntry.accountId}`);
      } else {
        console.warn(`No credit entry found for expense ${expense.id}`);
      }
    }
    
    console.log(`Migration complete. Fixed ${fixed} out of ${expensesWithoutPaymentAccount.length} expenses`);
    return { success: true, fixed };
  } catch (error) {
    console.error('Migration failed:', error);
    return { success: false, error };
  }
}

// Run the migration
fixExpensePaymentAccounts()
  .then(result => {
    console.log('Migration result:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Migration error:', error);
    process.exit(1);
  });