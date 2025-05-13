/**
 * Utility script to fix invoice balances that aren't properly reflecting payments
 */
import { db } from "./db";
import { transactions, ledgerEntries } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { DatabaseStorage } from "./database-storage";

export async function fixInvoiceBalances() {
  console.log("Starting invoice balance fix...");
  
  try {
    const storage = new DatabaseStorage();
    
    // Get all invoices that aren't 'completed' but should be
    const openInvoices = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.type, 'invoice'),
          eq(transactions.status, 'open')
        )
      );
    
    console.log(`Found ${openInvoices.length} open invoices to check`);
    
    // Process each open invoice to ensure its balance is correct
    for (const invoice of openInvoices) {
      console.log(`Checking invoice #${invoice.reference} (ID: ${invoice.id}), current balance: ${invoice.balance}`);
      
      // Get all payment ledger entries for this invoice
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
      
      console.log(`Found ${paymentEntries.length} payment entries for invoice #${invoice.reference}`);
      
      // Get all deposit credit ledger entries for this invoice
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
      
      console.log(`Found ${depositEntries.length} deposit credit entries for invoice #${invoice.reference}`);
      
      // Calculate total payments received
      const totalPayments = paymentEntries.reduce((sum, entry) => sum + entry.credit, 0);
      
      // Calculate total credits applied
      const totalCredits = depositEntries.reduce((sum, entry) => sum + entry.credit, 0);
      
      // Calculate the total amount applied to this invoice
      const totalApplied = totalPayments + totalCredits;
      
      // Calculate the correct balance
      const correctBalance = Math.max(0, Number(invoice.amount) - totalApplied);
      
      // Determine the correct status
      const correctStatus = correctBalance === 0 ? 'completed' : 'open';
      
      console.log(`Invoice #${invoice.reference} calculation:
      - Original amount: ${invoice.amount}
      - Total payments: ${totalPayments}
      - Total credits: ${totalCredits}
      - Total applied: ${totalApplied}
      - Current balance: ${invoice.balance}
      - Correct balance: ${correctBalance}
      - Current status: ${invoice.status}
      - Correct status: ${correctStatus}`);
      
      // Update the invoice if needed
      if (invoice.balance !== correctBalance || invoice.status !== correctStatus) {
        console.log(`Updating invoice #${invoice.reference} with balance ${correctBalance} and status ${correctStatus}`);
        
        await db
          .update(transactions)
          .set({
            balance: correctBalance,
            status: correctStatus
          })
          .where(eq(transactions.id, invoice.id));
        
        console.log(`Updated invoice #${invoice.reference}`);
      } else {
        console.log(`Invoice #${invoice.reference} already has correct balance and status`);
      }
    }
    
    console.log("Invoice balance fix completed successfully!");
  } catch (error) {
    console.error("Error fixing invoice balances:", error);
  }
}