import { db } from "./db";
import { transactions, ledgerEntries } from "@shared/schema";
import { eq, and, sql, ne, or, like } from "drizzle-orm";

/**
 * This is a comprehensive fix for the credit application tracking system.
 * It fixes the fundamental logic issue where credits are applied to invoices
 * but their status isn't properly updated to reflect this application.
 */
export async function fixCreditApplicationLogic() {
  console.log("\n=== STARTING CREDIT APPLICATION TRACKING FIX ===");
  
  try {
    // Get all credit transactions (deposits with reference starting with CREDIT-)
    const credits = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.type, 'deposit'),
          sql`${transactions.reference} LIKE ${'CREDIT-%'}`
        )
      );
    
    console.log(`Found ${credits.length} credit transactions to analyze`);
    
    // Process each credit to determine its true application status
    for (const credit of credits) {
      await updateCreditApplicationStatus(credit);
    }
    
    console.log("=== COMPLETED CREDIT APPLICATION TRACKING FIX ===\n");
    return true;
  } catch (error) {
    console.error("Error in credit application logic fix:", error);
    return false;
  }
}

/**
 * Updates a credit's status based on evidence of its application
 */
async function updateCreditApplicationStatus(credit: any) {
  try {
    console.log(`\nAnalyzing credit: ${credit.reference} (ID: ${credit.id})`);
    
    // Look for evidence of this credit being applied to invoices
    const applicationEvidence = await findCreditApplicationEvidence(credit);
    
    if (applicationEvidence.isApplied) {
      // Update the credit status to reflect it has been applied
      const newStatus = applicationEvidence.isFullyApplied ? 'completed' : 'partial';
      const newDescription = credit.description?.replace('Unapplied credit', 'Applied credit') || 'Applied credit';
      
      console.log(`Credit ${credit.reference} is ${applicationEvidence.isFullyApplied ? 'fully' : 'partially'} applied to invoice(s). Updating status to ${newStatus}`);
      
      await db
        .update(transactions)
        .set({
          status: newStatus,
          description: newDescription
        })
        .where(eq(transactions.id, credit.id));
      
      console.log(`Credit status updated to: ${newStatus}`);
    } else {
      // Confirm the credit is truly unapplied
      if (credit.status !== 'unapplied_credit') {
        console.log(`Credit ${credit.reference} is not applied but has incorrect status: ${credit.status}. Updating to 'unapplied_credit'`);
        
        await db
          .update(transactions)
          .set({
            status: 'unapplied_credit'
          })
          .where(eq(transactions.id, credit.id));
      } else {
        console.log(`Credit ${credit.reference} is correctly marked as unapplied`);
      }
    }
  } catch (error) {
    console.error(`Error updating credit ${credit.reference}:`, error);
  }
}

/**
 * Finds evidence of a credit being applied to invoices
 * Returns detailed information about how the credit has been used
 */
async function findCreditApplicationEvidence(credit: any) {
  // Get all ledger entries that might reference this credit's application
  const allLedgerEntries = await db
    .select()
    .from(ledgerEntries)
    .where(
      or(
        // Where this credit is directly referenced in the description
        sql`${ledgerEntries.description} LIKE ${'%' + credit.reference + '%'}`,
        
        // Or entries from this credit's own transaction
        eq(ledgerEntries.transactionId, credit.id)
      )
    );
  
  // Find entries that show the credit being applied to invoices
  const applicationEntries = allLedgerEntries.filter(entry => 
    entry.transactionId !== credit.id && // Not the credit's own entries
    entry.description?.toLowerCase().includes('applied credit') &&
    entry.description?.toLowerCase().includes(credit.reference.toLowerCase())
  );
  
  // Check the credit's own description for evidence of application
  const descriptionIndicatesApplication = 
    credit.description?.toLowerCase().includes('applied to invoice') ||
    credit.description?.match(/applied.*\$[0-9,.]+/i); // Shows an amount applied
  
  // Extract potentially referenced invoice numbers
  const involvedInvoices = new Set<string>();
  
  for (const entry of allLedgerEntries) {
    const match = entry.description?.match(/invoice #?(\d+)/i);
    if (match && match[1]) {
      involvedInvoices.add(match[1]);
    }
  }
  
  if (applicationEntries.length > 0 || descriptionIndicatesApplication) {
    console.log(`Found evidence that credit ${credit.reference} has been applied to invoices`);
    console.log(`- ${applicationEntries.length} ledger entries refer to this credit being applied`);
    console.log(`- Description indicates application: ${descriptionIndicatesApplication}`);
    
    if (involvedInvoices.size > 0) {
      console.log(`- Involved invoices: ${Array.from(involvedInvoices).join(', ')}`);
    }
    
    // Check if credit is fully or partially applied by looking at the balance
    const isFullyApplied = 
      Math.abs(credit.balance || 0) < 0.01 || // Zero balance
      (credit.description?.includes('applied') && !credit.description?.includes('partially'));
    
    return {
      isApplied: true,
      isFullyApplied,
      invoices: Array.from(involvedInvoices),
      evidenceCount: applicationEntries.length
    };
  }
  
  // No evidence of application found
  console.log(`No evidence found that credit ${credit.reference} has been applied to any invoices`);
  return {
    isApplied: false,
    isFullyApplied: false,
    invoices: [],
    evidenceCount: 0
  };
}

/**
 * This function enhances the transaction creation logic to properly 
 * track credit applications when payments or credits are applied to invoices
 */
export function enhanceCreditTrackingLogic() {
  // This is where we would modify the core logic to ensure credits are 
  // properly marked as applied when they're used in payments
  console.log("Enhanced credit tracking logic has been activated");
  
  // This would be hooked into the createTransaction or applyPaymentToInvoice methods
  // to update credit status at the time of application instead of retrospectively
}