import { db } from './db';
import { transactions } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

async function migrateDueDates() {
  console.log('Starting migration to populate missing due dates for invoices...');
  
  try {
    // Get all invoices without due dates
    const results = await db
      .select()
      .from(transactions)
      .where(eq(transactions.type, 'invoice'))
      .execute();
    
    let updateCount = 0;
    
    for (const invoice of results) {
      // Skip if due date already exists
      if (invoice.dueDate) continue;
      
      // Calculate due date based on payment terms
      const invoiceDate = new Date(invoice.date);
      const paymentTermsDays = invoice.paymentTerms ? parseInt(invoice.paymentTerms) : 0;
      
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + paymentTermsDays);
      
      console.log(`Setting due date for invoice #${invoice.reference || invoice.id}: ${dueDate.toISOString().split('T')[0]} (${paymentTermsDays} days from invoice date)`);
      
      await db
        .update(transactions)
        .set({ dueDate: dueDate })
        .where(eq(transactions.id, invoice.id))
        .execute();
        
      updateCount++;
    }
    
    console.log(`Updated due dates for ${updateCount} invoices`);
    console.log('Due dates migration completed successfully!');
  } catch (error) {
    console.error('Error migrating due dates:', error);
    throw error;
  }
}

export default migrateDueDates;
