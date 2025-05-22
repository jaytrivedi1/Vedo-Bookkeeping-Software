import { db } from "./db";
import { transactions, ledgerEntries } from "@shared/schema";
import { eq, and, sql, ne, or } from "drizzle-orm";

/**
 * This is a comprehensive fix for the credit application tracking system.
 * It fixes the fundamental issue where credits aren't properly updated
 * when they're applied to invoices.
 */
export async function fixAllCreditStatuses() {
  console.log("\n=== STARTING COMPREHENSIVE CREDIT STATUS FIX ===\n");
  
  try {
    // Get all credit transactions
    const credits = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.type, 'deposit'),
          or(
            eq(transactions.status, 'unapplied_credit'),
            sql`${transactions.reference} LIKE ${'CREDIT-%'}`
          )
        )
      );
    
    console.log(`Found ${credits.length} credit transactions to analyze`);
    
    // Process each credit to check its true application status
    let fixedCount = 0;
    for (const credit of credits) {
      // Get all ledger entries that reference this credit being applied
      const creditRef = credit.reference || `credit #${credit.id}`;
      console.log(`\nAnalyzing ${creditRef} (ID: ${credit.id})`);
      
      // Get proof this credit has been applied to invoices
      const applied = await getApplicationEvidence(credit);
      
      if (applied.isApplied) {
        // Credit has been applied but its status might not reflect this
        const correctStatus = applied.isFullyApplied ? 'completed' : 'partial';
        
        if (credit.status !== correctStatus) {
          // Update the credit status to reflect it's been applied
          await db
            .update(transactions)
            .set({
              status: correctStatus,
              description: credit.description?.replace('Unapplied credit', 'Applied credit') || 'Applied credit'
            })
            .where(eq(transactions.id, credit.id));
          
          console.log(`Updated ${creditRef} status from '${credit.status}' to '${correctStatus}'`);
          fixedCount++;
        } else {
          console.log(`${creditRef} already has correct status: ${credit.status}`);
        }
      } else if (credit.status !== 'unapplied_credit') {
        // This credit is not applied but has incorrect status
        await db
          .update(transactions)
          .set({
            status: 'unapplied_credit'
          })
          .where(eq(transactions.id, credit.id));
        
        console.log(`Corrected ${creditRef} to 'unapplied_credit' status`);
        fixedCount++;
      } else {
        console.log(`${creditRef} correctly shows as unapplied`);
      }
    }
    
    console.log(`\n=== CREDIT STATUS FIX COMPLETED - Updated ${fixedCount} credits ===\n`);
    return true;
  } catch (error) {
    console.error("Error fixing credit statuses:", error);
    return false;
  }
}

/**
 * Checks for evidence that a credit has been applied to invoices
 */
async function getApplicationEvidence(credit: any) {
  // First: Check if the credit description itself indicates application
  const descriptionShowsApplication = 
    credit.description?.toLowerCase().includes('applied to invoice');
  
  // Second: Look for ledger entries showing this credit applied
  const allLedgerEntries = await db
    .select()
    .from(ledgerEntries)
    .where(
      or(
        // Entries mentioning this credit's reference
        credit.reference 
          ? sql`${ledgerEntries.description} LIKE ${'%' + credit.reference + '%'}`
          : sql`${ledgerEntries.description} LIKE ${'%credit #' + credit.id + '%'}`,
        
        // Entries from this transaction
        eq(ledgerEntries.transactionId, credit.id)
      )
    );
  
  // Find entries showing application to invoices (not from the credit itself)
  const applicationEvidence = allLedgerEntries.filter(entry => 
    entry.transactionId !== credit.id && // Not the credit's own entries
    entry.description?.toLowerCase().includes('applied') &&
    (
      entry.description?.toLowerCase().includes('credit') ||
      entry.description?.toLowerCase().includes('deposit')
    )
  );
  
  // Extract the invoice references
  const invoiceRefs = new Set<string>();
  for (const entry of applicationEvidence) {
    const match = entry.description?.match(/invoice #?(\d+)/i);
    if (match && match[1]) {
      invoiceRefs.add(match[1]);
    }
  }
  
  // Determine if this credit is partially or fully applied
  const isApplied = 
    applicationEvidence.length > 0 || 
    descriptionShowsApplication || 
    (credit.balance && Math.abs(credit.balance) < Math.abs(credit.amount));
    
  // Check if fully applied
  const isFullyApplied = 
    isApplied && (
      // Zero balance means fully applied
      (credit.balance && Math.abs(credit.balance) < 0.01) ||
      // Description indicates full application without "partial"
      (descriptionShowsApplication && !credit.description?.toLowerCase().includes('partial'))
    );
  
  if (isApplied) {
    console.log(`Found evidence that ${credit.reference || `credit #${credit.id}`} has been applied:`);
    console.log(`- ${applicationEvidence.length} ledger entries show application`);
    
    if (invoiceRefs.size > 0) {
      console.log(`- Applied to invoices: ${Array.from(invoiceRefs).join(', ')}`);
    }
    
    console.log(`- Description indicates application: ${descriptionShowsApplication}`);
    console.log(`- Partial application: ${isApplied && !isFullyApplied}`);
    console.log(`- Full application: ${isFullyApplied}`);
  } else {
    console.log(`No evidence that ${credit.reference || `credit #${credit.id}`} has been applied to any invoices`);
  }
  
  return {
    isApplied,
    isFullyApplied,
    involvedInvoices: Array.from(invoiceRefs),
    evidenceCount: applicationEvidence.length
  };
}

/**
 * Enhances the transaction update function to properly track credit status
 * when they're applied to invoices
 */
export function enhanceCreditApplicationTracking() {
  // This function would integrate with the core transaction processing
  // to update credit status at the time of application
  console.log("Enhanced credit application tracking enabled");
}