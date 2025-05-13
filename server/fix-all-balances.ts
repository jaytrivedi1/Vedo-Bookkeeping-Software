/**
 * Comprehensive balance and relationship fixer for all transaction types
 * This script ensures all invoices, credits, and deposits have correct balances
 * and proper relationships tracked between them
 */
import { db } from "./db";
import { transactions, ledgerEntries } from "@shared/schema";
import { eq, and, sql, isNull, ne } from "drizzle-orm";

export async function fixAllBalances() {
  console.log("Starting comprehensive balance fix...");
  
  try {
    // Step 1: Fix all invoice balances first
    const allInvoices = await db
      .select()
      .from(transactions)
      .where(eq(transactions.type, 'invoice'));
    
    console.log(`Found ${allInvoices.length} invoices to process`);
    
    for (const invoice of allInvoices) {
      console.log(`Checking invoice #${invoice.reference} (ID: ${invoice.id})`);
      
      // Get all ledger entries that apply payments to this invoice
      const paymentEntries = await db
        .select()
        .from(ledgerEntries)
        .where(
          and(
            eq(ledgerEntries.accountId, 2), // Accounts Receivable
            sql`(${ledgerEntries.description} LIKE ${'%Payment applied to invoice #' + invoice.reference + '%'} OR
                 ${ledgerEntries.description} LIKE ${'%Payment applied to invoice ' + invoice.reference + '%'})`
          )
        );
      
      // Get all deposit credits applied to this invoice
      const depositEntries = await db
        .select()
        .from(ledgerEntries)
        .where(
          and(
            eq(ledgerEntries.accountId, 2), // Accounts Receivable
            sql`(${ledgerEntries.description} LIKE ${'%Applied credit from deposit%'} AND
                 ${ledgerEntries.description} LIKE ${'%to invoice #' + invoice.reference + '%'})`
          )
        );
      
      // Calculate total payments and credits applied
      const totalPayments = paymentEntries.reduce((sum, entry) => sum + entry.credit, 0);
      const totalCredits = depositEntries.reduce((sum, entry) => sum + entry.credit, 0);
      const totalApplied = totalPayments + totalCredits;
      
      // Calculate correct balance
      const correctBalance = Math.max(0, Number(invoice.amount) - totalApplied);
      
      // Determine correct status
      const correctStatus = correctBalance === 0 ? 'completed' : 'open';
      
      console.log(`Invoice #${invoice.reference} analysis:
      - Original amount: ${invoice.amount}
      - Total payments applied: ${totalPayments}
      - Total credits applied: ${totalCredits}
      - Total applied: ${totalApplied}
      - Current balance: ${invoice.balance}
      - Correct balance: ${correctBalance}
      - Current status: ${invoice.status}
      - Correct status: ${correctStatus}`);
      
      // Update invoice if needed
      if (invoice.balance !== correctBalance || invoice.status !== correctStatus) {
        await db
          .update(transactions)
          .set({
            balance: correctBalance,
            status: correctStatus
          })
          .where(eq(transactions.id, invoice.id));
        
        console.log(`Updated invoice #${invoice.reference} to balance=${correctBalance}, status=${correctStatus}`);
      } else {
        console.log(`Invoice #${invoice.reference} already has correct values`);
      }
    }
    
    // Step 2: Fix all deposit credits
    const allDeposits = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.type, 'deposit'),
          eq(transactions.status, 'unapplied_credit')
        )
      );
    
    console.log(`Found ${allDeposits.length} unapplied credit deposits to process`);
    
    for (const deposit of allDeposits) {
      console.log(`Checking deposit #${deposit.reference || deposit.id} (ID: ${deposit.id})`);
      
      // Get all ledger entries that apply this deposit to invoices
      const applicationEntries = await db
        .select()
        .from(ledgerEntries)
        .where(
          and(
            ne(ledgerEntries.transactionId, deposit.id), // Not the deposit's own ledger entries
            eq(ledgerEntries.accountId, 2), // Accounts Receivable
            sql`${ledgerEntries.description} LIKE ${'%Applied credit from deposit #' + (deposit.reference || deposit.id) + '%'}`
          )
        );
      
      // Check if this deposit has a specific amount mentioned in its description
      let appliedAmount = 0;
      const appliedAmountMatch = deposit.description?.match(/Applied\s+\$?([0-9,]+(?:\.[0-9]+)?)\s+to\s+invoice/i);
      
      if (appliedAmountMatch && appliedAmountMatch[1]) {
        const extractedAmount = parseFloat(appliedAmountMatch[1].replace(/,/g, ''));
        if (!isNaN(extractedAmount)) {
          console.log(`Found specific applied amount $${extractedAmount} in description`);
          appliedAmount = extractedAmount;
        }
      } else {
        // Use the ledger entries to calculate applied amount
        appliedAmount = applicationEntries.reduce((sum, entry) => sum + entry.debit, 0);
      }
      
      // Calculate remaining balance (keep negative for credits)
      const originalAmount = deposit.amount;
      const remainingBalance = -(Math.abs(originalAmount) - appliedAmount);
      
      console.log(`Deposit #${deposit.reference || deposit.id} analysis:
      - Original amount: ${originalAmount}
      - Applied amount: ${appliedAmount}
      - Current balance: ${deposit.balance}
      - Correct balance: ${remainingBalance}`);
      
      // Update deposit if needed
      if (deposit.balance !== remainingBalance) {
        await db
          .update(transactions)
          .set({
            balance: remainingBalance
          })
          .where(eq(transactions.id, deposit.id));
        
        console.log(`Updated deposit #${deposit.reference || deposit.id} to balance=${remainingBalance}`);
      } else {
        console.log(`Deposit #${deposit.reference || deposit.id} already has correct balance`);
      }
    }
    
    console.log("Comprehensive balance fix completed successfully!");
    return true;
  } catch (error) {
    console.error("Error fixing balances:", error);
    return false;
  }
}