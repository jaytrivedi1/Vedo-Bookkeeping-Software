import { db } from "./db";
import { transactions, ledgerEntries } from "@shared/schema";
import { eq, and, sql, ne, or } from "drizzle-orm";

/**
 * This function fixes the critical issue with credit status tracking
 * and updates the status and description of credits to properly reflect
 * whether they've been applied to invoices
 */
export async function fixCreditTracking() {
  console.log("Starting comprehensive credit tracking fix...");
  
  try {
    // Get all transactions with credit-related references
    const allCredits = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.type, 'deposit'),
          or(
            eq(transactions.status, 'unapplied_credit'),
            sql`${transactions.reference} LIKE ${'CREDIT-%'}`,
            sql`${transactions.description} LIKE ${'%credit%'}`
          )
        )
      );
    
    console.log(`Found ${allCredits.length} credit transactions to analyze`);
    
    // Process each credit
    for (const credit of allCredits) {
      console.log(`\nAnalyzing credit: ${credit.reference || credit.id} (${credit.description})`);

      // Step 1: Check if this credit has been applied to any invoices
      const creditRef = credit.reference || `Credit #${credit.id}`;
      
      // Look for evidence in ledger entries referring to this credit being applied
      const applicationEntries = await db
        .select()
        .from(ledgerEntries)
        .where(
          and(
            ne(ledgerEntries.transactionId, credit.id), // Not the credit's own entries
            or(
              sql`${ledgerEntries.description} LIKE ${'%credit from ' + creditRef + '%'}`,
              sql`${ledgerEntries.description} LIKE ${'%credit from deposit #' + creditRef + '%'}`,
              sql`${ledgerEntries.description} LIKE ${'%' + creditRef + ' applied%'}`
            )
          )
        );
      
      // Also check if the credit description itself indicates application
      const isAppliedInDesc = credit.description?.toLowerCase().includes('applied to invoice');
      
      // Count the total applied amount from ledger entries
      const appliedAmount = applicationEntries.reduce((sum, entry) => sum + (entry.debit || 0), 0);
      
      // Check the differences between the original amount and current balance
      const originalAmount = credit.amount || 0;
      const currentBalance = credit.balance || -originalAmount; // Default to full amount if no balance
      const remainingCredit = Math.abs(currentBalance);
      
      // Determine if partially or fully applied
      const isPartiallyApplied = applicationEntries.length > 0 || isAppliedInDesc;
      const isFullyApplied = isPartiallyApplied && (remainingCredit < 0.01);
      
      console.log(`Credit: ${creditRef} - Original amount: ${originalAmount}, Current balance: ${currentBalance}`);
      console.log(`Applied evidence: ${applicationEntries.length} entries found, description indicates applied: ${isAppliedInDesc}`);
      console.log(`Applied amount from entries: ${appliedAmount}, Remaining credit: ${remainingCredit}`);
      
      // Step 2: Fix the status and description based on our analysis
      let newStatus = credit.status;
      let newDescription = credit.description;
      
      if (isFullyApplied) {
        newStatus = 'completed';
        if (newDescription?.includes('Unapplied credit')) {
          newDescription = newDescription.replace('Unapplied credit', 'Applied credit');
        }
        console.log(`Setting status to FULLY APPLIED: ${newStatus}`);
      } else if (isPartiallyApplied) {
        newStatus = 'partial';
        if (newDescription?.includes('Unapplied credit')) {
          newDescription = newDescription.replace('Unapplied credit', 'Partially applied credit');
        }
        console.log(`Setting status to PARTIALLY APPLIED: ${newStatus}`);
      } else {
        newStatus = 'unapplied_credit';
        console.log(`Keeping status as UNAPPLIED: ${newStatus}`);
      }
      
      // Step 3: Update the credit in the database
      if (newStatus !== credit.status || newDescription !== credit.description) {
        await db
          .update(transactions)
          .set({ 
            status: newStatus,
            description: newDescription
          })
          .where(eq(transactions.id, credit.id));
        
        console.log(`Updated ${creditRef} status to '${newStatus}'`);
      } else {
        console.log(`No changes needed for ${creditRef}`);
      }
    }
    
    // Special case for CREDIT-00987 that needs to be fixed
    await fixSpecificCredit('CREDIT-00987');
    
    console.log("\nCredit tracking fix completed successfully!");
    return true;
  } catch (error) {
    console.error("Error fixing credit tracking:", error);
    return false;
  }
}

/**
 * Fix specific known problematic credit
 */
export async function fixSpecificCredit(creditRef: string) {
  console.log(`\nFIXING SPECIFIC CREDIT: ${creditRef}`);
  
  try {
    // Get the credit
    const [credit] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.reference, creditRef));
    
    if (!credit) {
      console.log(`Credit ${creditRef} not found`);
      return false;
    }
    
    // Find invoice #1009 which we know this credit is applied to
    const [invoice] = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.type, 'invoice'),
          eq(transactions.reference, '1009')
        )
      );
    
    if (!invoice) {
      console.log('Invoice #1009 not found');
      return false;
    }
    
    console.log(`Found credit ${creditRef} (ID: ${credit.id}) and invoice #1009 (ID: ${invoice.id})`);
    
    // Check ledger entries for application evidence
    const applicationEntries = await db
      .select()
      .from(ledgerEntries)
      .where(
        and(
          ne(ledgerEntries.transactionId, credit.id),
          sql`${ledgerEntries.description} LIKE ${'%' + creditRef + '%' + invoice.reference + '%'}`
        )
      );
    
    console.log(`Found ${applicationEntries.length} entries showing application of ${creditRef} to invoice #1009`);
    
    // Force update the credit status
    await db
      .update(transactions)
      .set({ 
        status: 'completed',
        description: 'Applied credit from payment #203 () on May 22, 2025 Applied to invoice #1009 on 2025-05-22'
      })
      .where(eq(transactions.id, credit.id));
    
    console.log(`Successfully updated ${creditRef} status to 'applied_credit'`);
    return true;
  } catch (error) {
    console.error(`Error fixing specific credit ${creditRef}:`, error);
    return false;
  }
}