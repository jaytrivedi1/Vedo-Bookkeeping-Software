import { db } from "./db";
import { transactions, ledgerEntries } from "@shared/schema";
import { eq, and, like } from 'drizzle-orm';

/**
 * Fix bill balances by calculating: Original Amount - Payments Made = Remaining Balance
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
      
      // Find all payment ledger entries that reference this bill
      const paymentEntries = await db
        .select()
        .from(ledgerEntries)
        .where(
          like(ledgerEntries.description, `%bill ${bill.reference}%`)
        );
      
      // Calculate total payments made to this bill
      const totalPayments = paymentEntries.reduce((sum, entry) => {
        // Payment entries that reduce the bill should be credits in accounts payable
        return sum + (entry.credit || 0);
      }, 0);
      
      // Calculate correct remaining balance: Original Amount - Payments Made
      const correctBalance = Number(bill.amount) - totalPayments;
      
      // Determine correct status
      const correctStatus = Math.abs(correctBalance) < 0.01 ? 'completed' : 'open';
      
      console.log(`Bill ${bill.reference} analysis:`);
      console.log(`  - Original amount: ${bill.amount}`);
      console.log(`  - Total payments made: ${totalPayments}`);
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