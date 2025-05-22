import { db } from "./db";
import { transactions, ledgerEntries } from "@shared/schema";
import { eq, and, sql, ne, or } from "drizzle-orm";

/**
 * This function fixes the critical issue with credit status tracking
 * It updates all credit transactions to correctly show as "applied_credit" 
 * when they have been applied to invoices, rather than showing as "unapplied_credit"
 */
export async function fixAllCreditStatus() {
  console.log("Starting comprehensive credit status fix...");
  
  try {
    // Step 1: Get all transactions with status 'unapplied_credit'
    const unappliedCredits = await db
      .select()
      .from(transactions)
      .where(
        and(
          or(
            eq(transactions.status, 'unapplied_credit'),
            sql`${transactions.description} LIKE ${'%Unapplied credit%'}`
          ),
          eq(transactions.type, 'deposit')
        )
      );
    
    console.log(`Found ${unappliedCredits.length} potentially misclassified credits to check`);
    
    for (const credit of unappliedCredits) {
      // Step 2: For each credit, check if it has been applied to any invoices
      const creditReference = credit.reference || `Credit #${credit.id}`;
      
      // Look for ledger entries that reference this credit being applied to invoices
      const applicationEntries = await db
        .select()
        .from(ledgerEntries)
        .where(
          and(
            ne(ledgerEntries.transactionId, credit.id), // Not the credit's own ledger entries
            sql`(
              ${ledgerEntries.description} LIKE ${'%' + creditReference + '%applied%'} OR
              ${ledgerEntries.description} LIKE ${'%applied%' + creditReference + '%'} OR
              ${ledgerEntries.description} LIKE ${'%' + credit.id + '%applied%'}
            )`
          )
        );
      
      // Also check if the credit's own description mentions application to an invoice
      const isAppliedInDescription = credit.description && (
        credit.description.toLowerCase().includes('applied to invoice') ||
        credit.description.toLowerCase().includes('applied to payment')
      );
      
      // Check if any entries were found
      if (applicationEntries.length > 0 || isAppliedInDescription) {
        console.log(`Credit ${creditReference} (ID: ${credit.id}) has been applied but is misclassified`);
        
        // Extract invoice references from descriptions for better logging
        const involvedInvoices = new Set<string>();
        for (const entry of applicationEntries) {
          const match = entry.description?.match(/invoice #?(\d+)/i);
          if (match) {
            involvedInvoices.add(match[1]);
          }
        }
        
        if (isAppliedInDescription) {
          const match = credit.description?.match(/invoice #?(\d+)/i);
          if (match) {
            involvedInvoices.add(match[1]);
          }
        }
        
        const invoiceList = Array.from(involvedInvoices).join(', ');
        console.log(`Credit is applied to: ${invoiceList || 'unknown invoices'}`);
        
        // Update the credit status to reflect its actual state
        await db
          .update(transactions)
          .set({ 
            status: 'applied_credit',
            description: credit.description?.replace('Unapplied credit', 'Applied credit') || 'Applied credit'
          })
          .where(eq(transactions.id, credit.id));
        
        console.log(`Updated ${creditReference} status to 'applied_credit'`);
      } else {
        console.log(`Credit ${creditReference} (ID: ${credit.id}) is genuinely unapplied, leaving as is`);
      }
    }
    
    console.log("Credit status fix completed successfully!");
    return true;
  } catch (error) {
    console.error("Error fixing credit status:", error);
    return false;
  }
}

/**
 * This function specifically fixes the CREDIT-00987 that is misclassified
 */
export async function fixSpecificCredit(creditReference: string) {
  console.log(`Starting targeted fix for credit ${creditReference}...`);
  
  try {
    // Get the credit transaction
    const [credit] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.reference, creditReference));
    
    if (!credit) {
      console.log(`Credit ${creditReference} not found`);
      return false;
    }
    
    // Find all ledger entries that mention this credit
    const relatedEntries = await db
      .select()
      .from(ledgerEntries)
      .where(
        sql`${ledgerEntries.description} LIKE ${'%' + creditReference + '%'}`
      );
    
    // Look for invoice applications
    const invoiceApplications = relatedEntries.filter(entry => 
      entry.description?.toLowerCase().includes('invoice') &&
      entry.description?.toLowerCase().includes('applied')
    );
    
    if (invoiceApplications.length > 0) {
      console.log(`Credit ${creditReference} is applied to invoices but marked as unapplied`);
      
      // Extract invoice references for better logging
      const involvedInvoices = new Set<string>();
      for (const entry of invoiceApplications) {
        const match = entry.description?.match(/invoice #?(\d+)/i);
        if (match) {
          involvedInvoices.add(match[1]);
        }
      }
      
      const invoiceList = Array.from(involvedInvoices).join(', ');
      console.log(`Credit is applied to: ${invoiceList || 'unknown invoices'}`);
      
      // Update the credit status to reflect its actual state
      await db
        .update(transactions)
        .set({ 
          status: 'applied_credit',
          description: credit.description?.replace('Unapplied credit', 'Applied credit') || 'Applied credit'
        })
        .where(eq(transactions.id, credit.id));
      
      console.log(`Updated ${creditReference} status to 'applied_credit'`);
      return true;
    } else {
      console.log(`No evidence found that ${creditReference} is applied to any invoices`);
      return false;
    }
  } catch (error) {
    console.error(`Error fixing credit ${creditReference}:`, error);
    return false;
  }
}