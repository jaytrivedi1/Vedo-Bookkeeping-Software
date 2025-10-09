import { db } from "./db";
import { transactions, ledgerEntries, paymentApplications } from "@shared/schema";
import { eq, like } from "drizzle-orm";

export async function recalculateBillBalances() {
  console.log("Starting bill balance recalculation migration...");
  
  try {
    // Get all bills from the database
    const allTransactions = await db
      .select()
      .from(transactions)
      .where(eq(transactions.type, 'bill'));
    
    console.log(`Found ${allTransactions.length} bills to recalculate`);
    
    let updatedCount = 0;
    
    for (const bill of allTransactions) {
      // Find all payments made to this bill via ledger entries
      const paymentEntries = await db
        .select()
        .from(ledgerEntries)
        .where(like(ledgerEntries.description, `%bill ${bill.reference}%`));
      
      // Calculate total payments from ledger entries
      const totalLedgerPayments = paymentEntries.reduce((sum, entry) => {
        return sum + (entry.credit || 0);
      }, 0);
      
      // Find all cheque/deposit applications to this bill
      const applications = await db
        .select()
        .from(paymentApplications)
        .where(eq(paymentApplications.invoiceId, bill.id));
      
      // Calculate total from payment applications
      const totalApplications = applications.reduce((sum, app) => {
        return sum + (app.amountApplied || 0);
      }, 0);
      
      // Total payments = ledger entries + payment applications
      const totalPayments = totalLedgerPayments + totalApplications;
      
      // Calculate new balance
      const newBalance = Math.round((Number(bill.amount) - totalPayments) * 100) / 100;
      
      // Determine new status
      const newStatus = Math.abs(newBalance) < 0.01 ? 'completed' : 'open';
      
      // Only update if balance or status changed
      if (bill.balance !== newBalance || bill.status !== newStatus) {
        await db
          .update(transactions)
          .set({
            balance: newBalance,
            status: newStatus
          })
          .where(eq(transactions.id, bill.id));
        
        console.log(`Updated bill ${bill.reference}: balance ${bill.balance} → ${newBalance}, status ${bill.status} → ${newStatus} (ledger: $${totalLedgerPayments}, applications: $${totalApplications})`);
        updatedCount++;
      } else {
        console.log(`Bill ${bill.reference} already has correct balance: $${newBalance}`);
      }
    }
    
    console.log(`Bill balance recalculation completed successfully!`);
    console.log(`Updated ${updatedCount} bills out of ${allTransactions.length} total`);
    
  } catch (error) {
    console.error("Error during bill balance recalculation:", error);
    throw error;
  }
}
