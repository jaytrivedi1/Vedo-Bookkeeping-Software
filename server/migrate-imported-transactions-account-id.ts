import { db } from './db';
import { importedTransactionsSchema, bankAccountsSchema } from '@shared/schema';
import { eq, isNull, and } from 'drizzle-orm';

export async function migrateImportedTransactionsAccountId() {
  console.log('Starting migration to fix imported transactions account_id...');
  
  try {
    // Get all imported transactions missing account_id but with bank_account_id
    const transactionsToFix = await db
      .select({
        id: importedTransactionsSchema.id,
        bankAccountId: importedTransactionsSchema.bankAccountId,
      })
      .from(importedTransactionsSchema)
      .where(
        and(
          isNull(importedTransactionsSchema.accountId),
          // bank_account_id is not null
        )
      );
    
    console.log(`Found ${transactionsToFix.length} imported transactions to fix`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const tx of transactionsToFix) {
      try {
        if (!tx.bankAccountId) {
          console.log(`Skipping transaction ${tx.id}: No bank_account_id`);
          skippedCount++;
          continue;
        }
        
        // Get the bank account to find the linkedAccountId
        const bankAccount = await db
          .select()
          .from(bankAccountsSchema)
          .where(eq(bankAccountsSchema.id, tx.bankAccountId))
          .limit(1);
        
        if (!bankAccount || bankAccount.length === 0) {
          console.log(`Skipping transaction ${tx.id}: Bank account ${tx.bankAccountId} not found`);
          skippedCount++;
          continue;
        }
        
        if (!bankAccount[0].linkedAccountId) {
          console.log(`Skipping transaction ${tx.id}: Bank account ${tx.bankAccountId} has no linked GL account`);
          skippedCount++;
          continue;
        }
        
        // Update the imported transaction with the account_id
        await db
          .update(importedTransactionsSchema)
          .set({ accountId: bankAccount[0].linkedAccountId })
          .where(eq(importedTransactionsSchema.id, tx.id));
        
        updatedCount++;
        
      } catch (err) {
        console.error(`Error processing transaction ${tx.id}:`, err);
        skippedCount++;
      }
    }
    
    console.log(`Migration completed successfully!`);
    console.log(`Total transactions processed: ${transactionsToFix.length}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    
    return { success: true, updated: updatedCount, skipped: skippedCount };
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}
