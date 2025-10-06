import { db } from './db';
import { ledgerEntries, transactions, paymentApplications } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function migratePaymentApplications() {
  console.log('Starting migration to populate payment_applications table...');
  
  try {
    // Find all ledger entries that represent payment applications
    // Patterns: "Payment applied to invoice #XXXX" or "Payment for invoice #XXXX"
    const paymentLedgerEntries = await db
      .select()
      .from(ledgerEntries)
      .where(
        and(
          eq(ledgerEntries.accountId, 2), // Accounts Receivable
          sql`(${ledgerEntries.description} LIKE '%Payment applied to invoice #%' OR ${ledgerEntries.description} LIKE '%Payment for invoice #%')`,
          sql`${ledgerEntries.credit} > 0` // Credit entries (payments reduce AR)
        )
      );
    
    console.log(`Found ${paymentLedgerEntries.length} payment ledger entries to process`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const entry of paymentLedgerEntries) {
      try {
        // Extract invoice reference from description
        // Patterns: "Payment applied to invoice #INV-001" or "Payment for invoice #INV-001"
        const match = entry.description?.match(/(?:applied to|for) invoice #([^\s,]+)/i);
        if (!match) {
          console.log(`Skipping entry ${entry.id}: Could not parse invoice reference from "${entry.description}"`);
          skippedCount++;
          continue;
        }
        
        const invoiceRef = match[1];
        
        // Find the invoice by reference
        const invoice = await db
          .select()
          .from(transactions)
          .where(
            and(
              eq(transactions.reference, invoiceRef),
              eq(transactions.type, 'invoice')
            )
          )
          .limit(1);
        
        if (!invoice || invoice.length === 0) {
          console.log(`Skipping entry ${entry.id}: Invoice with reference ${invoiceRef} not found`);
          skippedCount++;
          continue;
        }
        
        // Get the payment transaction
        const paymentId = entry.transactionId;
        const invoiceId = invoice[0].id;
        const amountApplied = entry.credit;
        
        // Check if this payment application already exists
        const existing = await db
          .select()
          .from(paymentApplications)
          .where(
            and(
              eq(paymentApplications.paymentId, paymentId),
              eq(paymentApplications.invoiceId, invoiceId)
            )
          )
          .limit(1);
        
        if (existing && existing.length > 0) {
          console.log(`Skipping entry ${entry.id}: Payment application already exists for payment ${paymentId} -> invoice ${invoiceId}`);
          skippedCount++;
          continue;
        }
        
        // Insert the payment application record
        await db
          .insert(paymentApplications)
          .values({
            paymentId,
            invoiceId,
            amountApplied
          });
        
        console.log(`Migrated: Payment ${paymentId} -> Invoice ${invoiceRef} (ID: ${invoiceId}), amount: ${amountApplied}`);
        migratedCount++;
        
      } catch (err) {
        console.error(`Error processing entry ${entry.id}:`, err);
        skippedCount++;
      }
    }
    
    console.log(`Migration completed successfully!`);
    console.log(`Total entries processed: ${paymentLedgerEntries.length}`);
    console.log(`Migrated: ${migratedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    
    return { success: true, migrated: migratedCount, skipped: skippedCount };
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}
