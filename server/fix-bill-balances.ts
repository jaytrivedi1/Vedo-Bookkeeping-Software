import { db } from './storage.ts';
import { transactions, ledgerEntries } from '../shared/schema.ts';
import { eq, and } from 'drizzle-orm';

/**
 * Fix bill balances by recalculating them using the correct formula.
 * For bills (Accounts Payable), balance = total credits - total debits
 */
export async function fixBillBalances() {
  console.log("Starting bill balance fix...");
  
  try {
    // Get all bills
    const allBills = await db
      .select()
      .from(transactions)
      .where(eq(transactions.type, 'bill'));
    
    console.log(`Found ${allBills.length} bills to process`);
    
    for (const bill of allBills) {
      console.log(`Checking bill ${bill.reference} (ID: ${bill.id})`);
      
      // Get all ledger entries for this bill
      const billLedgerEntries = await db
        .select()
        .from(ledgerEntries)
        .where(eq(ledgerEntries.transactionId, bill.id));
      
      // Calculate correct balance: sum of credits minus sum of debits (remaining liability)
      const totalDebits = billLedgerEntries.reduce((sum, entry) => sum + (entry.debit || 0), 0);
      const totalCredits = billLedgerEntries.reduce((sum, entry) => sum + (entry.credit || 0), 0);
      const correctBalance = totalCredits - totalDebits;
      
      // Determine correct status
      const correctStatus = Math.abs(correctBalance) < 0.01 ? 'completed' : 'open';
      
      console.log(`Bill ${bill.reference} analysis:`);
      console.log(`  - Total credits (bill amounts): ${totalCredits}`);
      console.log(`  - Total debits (payments): ${totalDebits}`);
      console.log(`  - Current balance: ${bill.balance}`);
      console.log(`  - Correct balance: ${correctBalance}`);
      console.log(`  - Current status: ${bill.status}`);
      console.log(`  - Correct status: ${correctStatus}`);
      
      // Update if needed
      if (Math.abs(Number(bill.balance) - correctBalance) > 0.01 || bill.status !== correctStatus) {
        await db
          .update(transactions)
          .set({
            balance: correctBalance,
            status: correctStatus
          })
          .where(eq(transactions.id, bill.id));
        
        console.log(`Updated bill ${bill.reference}: balance ${correctBalance}, status ${correctStatus}`);
      } else {
        console.log(`Bill ${bill.reference} already has correct values`);
      }
    }
    
    console.log("Bill balance fix completed successfully!");
    return { success: true, billsProcessed: allBills.length };
    
  } catch (error) {
    console.error("Error in bill balance fix:", error);
    throw error;
  }
}