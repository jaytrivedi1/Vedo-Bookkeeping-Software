/**
 * Migration script to fix specific deposit balances that need correction
 */
import { db } from './db';
import { transactions } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function migrateDepositCredits() {
  console.log('Starting migration to fix deposit credit balances...');

  // Special handling for specific deposits:
  // - ID 114 (DEP-2025-04-21) should have balance = -2000
  try {
    // Fix deposit #114 (April 21)
    const deposit114 = await db.query.transactions.findFirst({
      where: eq(transactions.id, 114)
    });

    if (deposit114) {
      console.log(`Found deposit #114: balance=${deposit114.balance}, amount=${deposit114.amount}`);
      if (deposit114.balance !== -2000) {
        await db.update(transactions)
          .set({ balance: -2000 })
          .where(eq(transactions.id, 114));
        console.log('Updated deposit #114 balance to -2000');
      }
    }

    // Find all other deposits that might have incorrect balances
    const allDeposits = await db.query.transactions.findMany({
      where: eq(transactions.type, 'deposit')
    });

    console.log(`Found ${allDeposits.length} total deposits to check`);

    // Process each deposit to ensure it has the correct balance
    let updatedCount = 0;
    for (const deposit of allDeposits) {
      // Skip the special case we already handled
      if (deposit.id === 114) continue;

      // For deposits with status "unapplied_credit", ensure balance is negative
      if (deposit.status === 'unapplied_credit' && (deposit.balance === null || deposit.balance >= 0)) {
        console.log(`Fixing deposit #${deposit.id}: incorrect balance ${deposit.balance}`);
        await db.update(transactions)
          .set({ balance: -deposit.amount })
          .where(eq(transactions.id, deposit.id));
        updatedCount++;
      }

      // For deposits with status "completed", ensure balance is 0
      if (deposit.status === 'completed' && deposit.balance !== 0) {
        console.log(`Fixing deposit #${deposit.id}: completed but balance is ${deposit.balance ?? 'NULL'}`);
        await db.update(transactions)
          .set({ balance: 0 })
          .where(eq(transactions.id, deposit.id));
        updatedCount++;
      }
    }

    console.log(`Updated ${updatedCount} additional deposit balances`);
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error in deposit credit migration:', error);
    throw error;
  }
}

export default migrateDepositCredits;

// Remove the direct script execution check since we're using ES modules
// The migration will be called from index.ts