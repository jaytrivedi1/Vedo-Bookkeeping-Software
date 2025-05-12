import { db } from './db';
import { transactions } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Special script to fix the balance for invoice #1005
 * This ensures that only the $385 credit is applied and not the $800 from deposit #102
 */
export async function fixInvoice1005() {
  console.log('Starting correction for invoice #1005...');
  
  try {
    // Invoice #1005 has ID 152 and amount $1,155
    // We want to apply only the $385 credit, resulting in a $770 balance
    
    const [updatedInvoice] = await db
      .update(transactions)
      .set({
        balance: 770, // $1,155 - $385 = $770
        status: 'open'  // Since it's partially paid
      })
      .where(eq(transactions.id, 152))
      .returning();
    
    if (updatedInvoice) {
      console.log(`Successfully updated invoice #1005 (ID: 152):`);
      console.log(`- New balance: $${updatedInvoice.balance}`);
      console.log(`- New status: ${updatedInvoice.status}`);
    } else {
      console.log('Failed to update invoice #1005 (ID: 152)');
    }
  } catch (error) {
    console.error('Error fixing invoice #1005:', error);
  }
}

// Execute the fix
fixInvoice1005()
  .then(() => console.log('Fix completed'))
  .catch((error) => {
    console.error('Error running fix:', error);
  });