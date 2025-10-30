import { db } from './db';
import { importedTransactionsSchema } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

export async function fixPlaidTransactionAmounts() {
  console.log('Starting migration to fix Plaid transaction amount signs...');
  
  try {
    // Negate all amounts for Plaid-sourced transactions
    // Plaid uses positive for expenses, we use positive for deposits
    const result = await db
      .update(importedTransactionsSchema)
      .set({
        amount: sql`-${importedTransactionsSchema.amount}`
      })
      .where(eq(importedTransactionsSchema.source, 'plaid'));
    
    console.log('Migration completed successfully!');
    console.log(`Fixed amount signs for all Plaid transactions`);
    
    return { success: true };
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}
