import { db } from "./db";
import { 
  Account, Contact, Transaction, LineItem, LedgerEntry, SalesTax, Product,
  CompanySettings, Preferences, Company, User, UserCompany, Permission, RolePermission,
  InsertAccount, InsertContact, InsertTransaction, InsertLineItem, InsertLedgerEntry, InsertSalesTax, InsertProduct,
  InsertCompanySettings, InsertPreferences, InsertCompany, InsertUser, InsertUserCompany, InsertPermission, InsertRolePermission,
  accounts, contacts, transactions, lineItems, ledgerEntries, salesTaxSchema, productsSchema,
  companySchema, preferencesSchema, companiesSchema, usersSchema, userCompaniesSchema, 
  permissionsSchema, rolePermissionsSchema
} from "@shared/schema";
import { eq, and, desc, gte, lte, sql, ne, or, isNull, like } from "drizzle-orm";
import { IStorage } from "./storage";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

// Promisify the scrypt function
const scryptAsync = promisify(scrypt);

// Password hashing utility functions
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(password, salt, 64) as Buffer;
  return `${derivedKey.toString('hex')}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hash, salt] = stored.split('.');
  if (!hash || !salt) return false;
  
  const suppliedHash = await scryptAsync(supplied, salt, 64) as Buffer;
  const storedHash = Buffer.from(hash, 'hex');
  return timingSafeEqual(storedHash, suppliedHash);
}

export class DatabaseStorage implements IStorage {
  // Accounts
  async getAccounts(): Promise<Account[]> {
    return await db.select().from(accounts).orderBy(accounts.code);
  }

  async getAccount(id: number): Promise<Account | undefined> {
    const result = await db.select().from(accounts).where(eq(accounts.id, id));
    return result[0];
  }

  async getAccountByCode(code: string): Promise<Account | undefined> {
    const result = await db.select().from(accounts).where(eq(accounts.code, code));
    return result[0];
  }

  async createAccount(account: InsertAccount): Promise<Account> {
    const [newAccount] = await db.insert(accounts).values(account).returning();
    return newAccount;
  }

  async updateAccount(id: number, accountUpdate: Partial<Account>): Promise<Account | undefined> {
    const [updatedAccount] = await db.update(accounts)
      .set(accountUpdate)
      .where(eq(accounts.id, id))
      .returning();
    return updatedAccount;
  }

  // Contacts
  async getContacts(): Promise<Contact[]> {
    return await db.select().from(contacts).orderBy(contacts.name);
  }

  async getContact(id: number): Promise<Contact | undefined> {
    const result = await db.select().from(contacts).where(eq(contacts.id, id));
    return result[0];
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const [newContact] = await db.insert(contacts).values(contact).returning();
    return newContact;
  }

  async updateContact(id: number, contactUpdate: Partial<Contact>): Promise<Contact | undefined> {
    const [updatedContact] = await db.update(contacts)
      .set(contactUpdate)
      .where(eq(contacts.id, id))
      .returning();
    return updatedContact;
  }
  
  async deleteContact(id: number): Promise<boolean> {
    try {
      // Check if contact has any related transactions
      const relatedTransactions = await db
        .select()
        .from(transactions)
        .where(eq(transactions.contactId, id));
      
      if (relatedTransactions.length > 0) {
        // If contact has related transactions, don't delete
        console.error(`Cannot delete contact with ID ${id}: has ${relatedTransactions.length} related transactions`);
        return false;
      }
      
      // Delete the contact
      const result = await db
        .delete(contacts)
        .where(eq(contacts.id, id));
      
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error(`Error deleting contact with ID ${id}:`, error);
      return false;
    }
  }

  // Transactions
  async getTransactions(): Promise<Transaction[]> {
    try {
      const results = await db.select().from(transactions).orderBy(desc(transactions.date));
      return results;
    } catch (error) {
      console.error("Error fetching transactions:", error);
      throw error;
    }
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    const result = await db.select().from(transactions).where(eq(transactions.id, id));
    return result[0];
  }
  
  async getTransactionByReference(reference: string, type?: string): Promise<Transaction | undefined> {
    try {
      // Create base query with reference filter
      let query;
      if (type) {
        // If type is specified, filter by both reference and type
        query = db.select().from(transactions).where(
          and(
            eq(transactions.reference, reference),
            eq(transactions.type, type as any)
          )
        );
      } else {
        // Otherwise just filter by reference
        query = db.select().from(transactions).where(
          eq(transactions.reference, reference)
        );
      }
      
      const results = await query;
      return results[0];
    } catch (error) {
      console.error('Error getting transaction by reference:', error);
      return undefined;
    }
  }

  async createTransaction(
    transaction: InsertTransaction,
    lineItemsData: InsertLineItem[],
    ledgerEntriesData: InsertLedgerEntry[]
  ): Promise<Transaction> {
    // Use a transaction to ensure all operations succeed or fail together
    const [newTransaction] = await db.transaction(async (tx) => {
      // Insert transaction
      const [newTx] = await tx.insert(transactions).values(transaction).returning();
      
      // Insert line items with the transaction ID
      if (lineItemsData.length > 0) {
        await tx.insert(lineItems).values(
          lineItemsData.map(item => ({
            ...item,
            transactionId: newTx.id
          }))
        );
      }
      
      // Insert ledger entries with the transaction ID
      if (ledgerEntriesData.length > 0) {
        await tx.insert(ledgerEntries).values(
          ledgerEntriesData.map(entry => ({
            ...entry,
            transactionId: newTx.id
          }))
        );
      }
      
      // Update account balances based on ledger entries
      for (const entry of ledgerEntriesData) {
        const account = await tx.select().from(accounts).where(eq(accounts.id, entry.accountId));
        if (account.length > 0) {
          let newBalance = account[0].balance;
          
          // Apply debits and credits according to account type
          if (['asset', 'expense'].includes(account[0].type)) {
            newBalance += (entry.debit || 0) - (entry.credit || 0);
          } else {
            newBalance += (entry.credit || 0) - (entry.debit || 0);
          }
          
          await tx.update(accounts)
            .set({ balance: newBalance })
            .where(eq(accounts.id, entry.accountId));
        }
      }
      
      return [newTx];
    });
    
    return newTransaction;
  }

  async updateTransaction(id: number, transactionUpdate: Partial<Transaction>): Promise<Transaction | undefined> {
    try {
      // If this is an unapplied credit and amount is changing, make sure balance is updated correctly
      const existingTransaction = await this.getTransaction(id);
      
      if (existingTransaction && 
          existingTransaction.type === 'deposit' && 
          existingTransaction.status === 'unapplied_credit' && 
          transactionUpdate.amount !== undefined && 
          transactionUpdate.balance === undefined) {
        
        // For unapplied credits, balance should be negative of the amount
        transactionUpdate.balance = -transactionUpdate.amount;
        console.log(`Auto-setting balance to ${transactionUpdate.balance} for unapplied credit ${id}`);
      }
      
      const [updatedTransaction] = await db.update(transactions)
        .set(transactionUpdate)
        .where(eq(transactions.id, id))
        .returning();
      
      return updatedTransaction;
    } catch (error) {
      console.error('Error updating transaction:', error);
      return undefined;
    }
  }
  
  /**
   * Recalculates the balance for an invoice by summing all payments applied to it
   * @param invoiceId The ID of the invoice to recalculate
   */
  async recalculateInvoiceBalance(invoiceId: number, forceUpdate: boolean = false, useOnlyLedgerEntries: boolean = false): Promise<Transaction | undefined> {
    try {
      // Step 1: Get the invoice
      const invoice = await this.getTransaction(invoiceId);
      if (!invoice || invoice.type !== 'invoice') {
        console.error(`Transaction ${invoiceId} is not an invoice or doesn't exist`);
        return undefined;
      }
      
      console.log(`Starting recalculation for invoice #${invoice.reference} (ID: ${invoice.id})`);
      
      // Step 2: Get all ledger entries for this invoice itself
      const allLedgerEntries = await db.select()
        .from(ledgerEntries)
        .where(eq(ledgerEntries.transactionId, invoiceId));

      // Step 3: Find payments applied to this invoice
      const appliedPayments = await db.select()
        .from(ledgerEntries)
        .where(
          and(
            eq(ledgerEntries.accountId, 2), // Accounts Receivable
            sql`${ledgerEntries.credit} > 0`, // Credit entry (payment)
            sql`${ledgerEntries.description} LIKE ${'%' + invoice.reference + '%'}`, // Mentions this invoice 
            ne(ledgerEntries.transactionId, invoiceId) // Not part of the invoice itself
          )
        );
      
      const totalPaymentCredits = appliedPayments.reduce((sum, entry) => sum + Number(entry.credit), 0);
      console.log(`Found ${appliedPayments.length} payment entries totaling ${totalPaymentCredits}`);
      
      // Step 4: Find deposit credits explicitly applied to this invoice via ledger entries
      const depositApplications = await db.select()
        .from(ledgerEntries)
        .where(
          and(
            eq(ledgerEntries.accountId, 2), // Accounts Receivable
            sql`${ledgerEntries.debit} > 0`, // Debit entry (credit application)
            sql`${ledgerEntries.description} LIKE ${'%applied credit%' + invoice.reference + '%'}`, // Mentions applying credit to this invoice
            ne(ledgerEntries.transactionId, invoiceId) // Not part of the invoice itself
          )
        );
      
      const totalDepositCredits = depositApplications.reduce((sum, entry) => sum + Number(entry.debit), 0);
      console.log(`Found ${depositApplications.length} deposit credit entries totaling ${totalDepositCredits}`);
      
      // Step 5: Find deposits that mention this invoice in their description
      console.log(`Looking for deposits mentioning invoice ${invoice.reference} in description`);
      const depositsWithInvoiceReference = await db.select()
        .from(transactions)
        .where(
          and(
            eq(transactions.type, 'deposit'),
                  // Find deposits that mention this invoice specifically
            sql`(${transactions.description} LIKE ${'%Applied to invoice #' + invoice.reference + '%'} OR 
                 ${transactions.description} LIKE ${'%Applied to invoice ' + invoice.reference + '%'})`
          )
        );
      
      console.log(`Found ${depositsWithInvoiceReference.length} deposits mentioning invoice ${invoice.reference}`);
      for (const deposit of depositsWithInvoiceReference) {
        console.log(`Deposit #${deposit.id} (${deposit.reference}): ${deposit.description}, status=${deposit.status}, balance=${deposit.balance}`);
      }
      
      // Step 6: Extract amounts from deposit descriptions - only use the specific credit applied by user
      let totalCreditsFromDescriptions = 0;
      const depositIdsFromLedger = new Set(depositApplications.map(d => d.transactionId));
      
      // Enhanced credit determination logic
      console.log("Analyzing deposits for potential over-application of credits...");
      
      // Sort deposits by date (newest first) to prioritize most recent credits
      const sortedDeposits = [...depositsWithInvoiceReference].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      // Calculate how much credit we need to apply
      const requiredCredit = Number(invoice.amount);
      let appliedCredit = totalPaymentCredits + totalDepositCredits; // Credits already applied through ledger entries
      let remainingCreditNeeded = requiredCredit - appliedCredit;
      
      console.log(`Invoice amount: ${requiredCredit}, already applied through ledger: ${appliedCredit}, remaining needed: ${remainingCreditNeeded}`);
      
      // For all invoices, apply the same standard logic
      // No special cases for any specific invoice or reference number
      // Process all deposits consistently
      for (const deposit of sortedDeposits) {
        // Skip if already counted through ledger entries
        if (depositIdsFromLedger.has(deposit.id)) {
          console.log(`Deposit #${deposit.id} already counted from ledger entries, skipping`);
          continue;
        }
        
        // Check if there's a specific amount mentioned in the description (format: "Applied $3000 to invoice")
        let creditAmount = Number(deposit.amount);
        const appliedAmountMatch = deposit.description?.match(/Applied\s+\$?([0-9,]+(?:\.[0-9]+)?)\s+to\s+invoice/i);
        
        if (appliedAmountMatch && appliedAmountMatch[1]) {
          // Extract the amount from the description
          const extractedAmount = parseFloat(appliedAmountMatch[1].replace(/,/g, ''));
          if (!isNaN(extractedAmount)) {
            console.log(`Extracted specific amount $${extractedAmount} from description for deposit #${deposit.id}`);
            creditAmount = extractedAmount;
            
            // If this is a partial application of a credit, also update the balance
            if (extractedAmount < Math.abs(Number(deposit.amount)) && deposit.balance === deposit.amount) {
              const newBalance = -(Math.abs(Number(deposit.amount)) - extractedAmount);
              console.log(`Updating deposit #${deposit.id} balance from ${deposit.balance} to ${newBalance} due to partial application`);
              
              // Update the balance directly
              await db.update(transactions)
                .set({ balance: newBalance })
                .where(eq(transactions.id, deposit.id));
            }
          }
        }
        
        // Only apply as much credit as needed to avoid over-applying
        if (remainingCreditNeeded <= 0) {
          console.log(`No more credit needed for invoice #${invoice.reference}, skipping deposit #${deposit.id}`);
          continue;
        }
        
        // Apply only what we need from this deposit
        const amountToApply = Math.min(creditAmount, remainingCreditNeeded);
        console.log(`Applying ${amountToApply} from deposit #${deposit.id} (${deposit.reference})`);
        
        totalCreditsFromDescriptions += amountToApply;
        remainingCreditNeeded -= amountToApply;
      }
      
      // Step 7: Calculate total applied and remaining balance
      // When editing a payment, we need to use ONLY the ledger entries
      let totalApplied;
      
      // Determine how to calculate the total applied amount
      if (useOnlyLedgerEntries) {
        // In edit mode (when updating a payment) we ONLY use explicit ledger entries
        // to ensure user-specified values are maintained
        totalApplied = totalPaymentCredits + totalDepositCredits;
        console.log(`EDIT MODE: Using only ledger entries for balance calculation: ${totalApplied}`);
      } else {
        // Normal calculation for all invoices including credits from descriptions
        totalApplied = totalPaymentCredits + totalDepositCredits + totalCreditsFromDescriptions;
      }
      
      // CRITICAL FIX: Prevent over-application of credits
      // Cap the total applied at the invoice amount to avoid negative balances
      const invoiceAmount = Number(invoice.amount);
      if (totalApplied > invoiceAmount) {
        console.log(`CRITICAL ERROR: Total applied (${totalApplied}) exceeds invoice amount (${invoiceAmount}) for invoice #${invoice.reference}.`);
        console.log(`Details: Payment credits: ${totalPaymentCredits}, Deposit credits from ledger: ${totalDepositCredits}, Credits from descriptions: ${totalCreditsFromDescriptions}`);
        console.log(`Capping applied amount at invoice amount to prevent accounting errors.`);
        
        totalApplied = invoiceAmount;
      }
      
      const remainingBalance = Number(invoice.amount) - totalApplied;
      
      console.log(`Summary for invoice #${invoice.reference}:
      - Original amount: ${invoice.amount}
      - Payment credits: ${totalPaymentCredits}
      - Deposit credits from ledger: ${totalDepositCredits}
      - Deposit credits from descriptions: ${totalCreditsFromDescriptions}
      - Total applied: ${totalApplied}
      - Remaining balance: ${remainingBalance}
      - Current status: ${invoice.status}`);
      
      // Step 8: Determine correct status based on remaining balance
      let newStatus = invoice.status;
      
      if (remainingBalance <= 0) {
        newStatus = 'completed';
      } else {
        // Always use 'open' for unpaid and partially paid invoices
        newStatus = 'open';
      }
      
      // Step 9: Update the invoice if needed
      let needsUpdate = false;
      
      if (invoice.balance !== remainingBalance) {
        console.log(`Updating balance from ${invoice.balance} to ${remainingBalance}`);
        needsUpdate = true;
      }
      
      if (invoice.status !== newStatus) {
        console.log(`Updating status from ${invoice.status} to ${newStatus}`);
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        // Do one final check to ensure balance is never negative
        // This is a critical accounting principle that must be enforced
        const finalBalance = remainingBalance > 0 ? remainingBalance : 0;
        
        // Extra validation for data integrity
        if (remainingBalance < 0) {
          console.log(`CRITICAL INTEGRITY CHECK: Caught negative balance (${remainingBalance}) for invoice #${invoice.reference}. Setting to 0.`);
        }
        
        const [updatedInvoice] = await db.update(transactions)
          .set({ 
            balance: finalBalance,
            status: newStatus
          })
          .where(eq(transactions.id, invoiceId))
          .returning();
          
        return updatedInvoice;
      }
      
      return invoice;
    } catch (error) {
      console.error('Error recalculating invoice balance:', error);
      throw error;
    }
  }
  
  async deleteTransaction(id: number): Promise<boolean> {
    try {
      // Use a transaction to ensure all related data is properly deleted
      return await db.transaction(async (tx) => {
        // Get the transaction to verify it exists
        const transactionToDelete = await tx
          .select()
          .from(transactions)
          .where(eq(transactions.id, id));
        
        if (transactionToDelete.length === 0) {
          return false; // Transaction not found
        }
        
        const transaction = transactionToDelete[0];
        
        // Get the ledger entries to reverse account balances
        const ledgerEntriesToDelete = await tx
          .select()
          .from(ledgerEntries)
          .where(eq(ledgerEntries.transactionId, id));
        
        // Special handling based on transaction type
        switch (transaction.type) {
          case 'payment':
            console.log(`Deleting payment transaction: ${transaction.reference}`);
            
            // Handle payment-to-invoice relationships
            await this.handlePaymentDeletion(tx, transaction, ledgerEntriesToDelete);
            break;
            
          case 'invoice':
            console.log(`Deleting invoice transaction: ${transaction.reference}`);
            
            // Handle credits applied to invoice
            await this.handleInvoiceDeletion(tx, transaction);
            break;
            
          case 'deposit':
            console.log(`Deleting deposit transaction: ${transaction.reference || transaction.id}`);
            
            // Only delete if not actually connected to invoices
            const isApplied = await this.isDepositAppliedToInvoices(tx, transaction);
            if (isApplied) {
              console.log(`Cannot delete deposit #${transaction.id} (${transaction.reference}) as it has been applied to invoices`);
              return false;
            }
            
            // Handle any potential references to this deposit
            await this.handleDepositDeletion(tx, transaction);
            break;
        }
        
        // Reverse the effect on account balances - subtract debits and add credits
        for (const entry of ledgerEntriesToDelete) {
          const accountResult = await tx
            .select()
            .from(accounts)
            .where(eq(accounts.id, entry.accountId));
          
          if (accountResult.length > 0) {
            const account = accountResult[0];
            let balanceChange = 0;
            
            if (['asset', 'expense'].includes(account.type)) {
              // Debits increase assets and expenses, so subtract them for deletion
              balanceChange = -(entry.debit - entry.credit);
            } else {
              // Credits increase liabilities, equity, and income, so subtract them for deletion
              balanceChange = -(entry.credit - entry.debit);
            }
            
            // Update the account balance
            await tx
              .update(accounts)
              .set({ balance: account.balance + balanceChange })
              .where(eq(accounts.id, account.id));
          }
        }
        
        // Delete the related ledger entries
        await tx
          .delete(ledgerEntries)
          .where(eq(ledgerEntries.transactionId, id));
        
        // Delete the related line items
        await tx
          .delete(lineItems)
          .where(eq(lineItems.transactionId, id));
        
        // Delete the transaction
        const deleteResult = await tx
          .delete(transactions)
          .where(eq(transactions.id, id));
        
        // Run final balance recalculation for all invoices referenced in ledger entries that are being deleted
        await this.recalculateReferencedInvoiceBalances(tx, ledgerEntriesToDelete);
        
        return deleteResult.rowCount !== null && deleteResult.rowCount > 0;
      });
    } catch (error) {
      console.error('Error deleting transaction:', error);
      return false;
    }
  }
  
  private async handlePaymentDeletion(tx: any, payment: any, ledgerEntriesToDelete: any[]) {
    console.log(`Processing payment deletion for payment ID ${payment.id}`);
    
    // Find ledger entries related to Accounts Receivable (typically account ID 2)
    // These entries indicate which invoices the payment was applied to
    const invoicePaymentEntries = ledgerEntriesToDelete.filter(entry => 
      entry.accountId === 2 && 
      entry.credit > 0 && 
      entry.description && 
      entry.description.includes('invoice')
    );
    
    // Find entries that show which deposits/credits were applied in this payment
    const depositApplicationEntries = ledgerEntriesToDelete.filter(entry => 
      entry.accountId === 2 && 
      entry.debit > 0 && 
      entry.description && 
      entry.description.includes('Applied credit from deposit')
    );
    
    // Process invoice payment entries
    for (const entry of invoicePaymentEntries) {
      if (!entry.description) continue;
      
      // Extract invoice reference from description (e.g., "Payment applied to invoice #1002")
      const invoiceRefMatch = entry.description.match(/invoice\s+#?(\d+)/i);
      
      if (invoiceRefMatch && invoiceRefMatch[1]) {
        const invoiceRef = invoiceRefMatch[1];
        console.log(`Found payment applied to invoice: ${invoiceRef}`);
        
        // Find the invoice by reference number
        const [invoice] = await tx
          .select()
          .from(transactions)
          .where(
            and(
              eq(transactions.reference, invoiceRef),
              eq(transactions.type, 'invoice')
            )
          );
        
        if (invoice) {
          // Get all existing ledger entries for this invoice to recalculate its true balance
          const allInvoiceEntries = await tx
            .select()
            .from(ledgerEntries)
            .where(
              and(
                eq(ledgerEntries.accountId, 2), // Accounts Receivable
                sql`${ledgerEntries.description} LIKE ${'%invoice #' + invoiceRef + '%'}`
              )
            );
          
          // Filter out the entries we're about to delete
          const remainingEntries = allInvoiceEntries.filter(e => e.transactionId !== payment.id);
          
          // Calculate total payments applied from remaining entries
          const totalApplied = remainingEntries.reduce((sum, e) => sum + (e.credit || 0), 0);
          
          // Calculate new balance
          const newBalance = Math.max(0, Number(invoice.amount) - totalApplied);
          
          // Calculate appropriate status
          const newStatus = newBalance > 0 ? 'open' : 'completed';
          
          console.log(`Recalculating invoice #${invoiceRef}: amount=${invoice.amount}, applied=${totalApplied}, new balance=${newBalance}`);
          
          // Update the invoice
          await tx
            .update(transactions)
            .set({ 
              balance: newBalance, 
              status: newStatus 
            })
            .where(eq(transactions.id, invoice.id));
        }
      }
    }
    
    // Process deposit credit application entries
    for (const entry of depositApplicationEntries) {
      if (!entry.description) continue;
      
      // Extract deposit reference from description
      const depositMatch = entry.description.match(/deposit #?([^,\s]+)/i);
      if (depositMatch && depositMatch[1]) {
        const depositRef = depositMatch[1];
        console.log(`Found deposit credit application for deposit: ${depositRef}`);
        
        // Find the deposit by reference or ID
        // First try to see if it's a numeric ID
        const isNumeric = /^\d+$/.test(depositRef);
        const depositId = isNumeric ? parseInt(depositRef, 10) : 0;
        
        // Query with proper conditions based on whether depositRef is numeric
        const [deposit] = isNumeric 
          ? await tx
              .select()
              .from(transactions)
              .where(
                and(
                  eq(transactions.type, 'deposit'),
                  or(
                    eq(transactions.reference, depositRef),
                    depositId > 0 ? eq(transactions.id, depositId) : eq(transactions.reference, depositRef)
                  )
                )
              )
          : await tx
              .select()
              .from(transactions)
              .where(
                and(
                  eq(transactions.type, 'deposit'),
                  eq(transactions.reference, depositRef)
                )
              );
          
        if (deposit) {
          // Calculate new balance (restore the credit as negative)
          const appliedAmount = Number(entry.debit || 0);
          
          // Make sure we have valid numbers for calculations
          let currentBalance = 0;
          if (deposit.balance !== null && deposit.balance !== undefined) {
            currentBalance = Number(deposit.balance);
          } else if (deposit.amount !== null && deposit.amount !== undefined) {
            // If no balance is set, use negative of the amount 
            // (deposit credits are stored as negative balances)
            currentBalance = -Number(deposit.amount);
          }
          
          // Ensure we have valid numbers before calculation
          if (isNaN(currentBalance)) currentBalance = 0;
          
          // Create a validated applied amount (don't modify the original const)
          let validAppliedAmount = appliedAmount;
          if (isNaN(validAppliedAmount)) validAppliedAmount = 0;
          
          const newBalance = currentBalance - validAppliedAmount;
          
          console.log(`Restoring ${validAppliedAmount} to deposit #${depositRef}: current balance=${currentBalance}, new balance=${newBalance}`);
          
          // Update the deposit
          await tx
            .update(transactions)
            .set({
              balance: newBalance,
              status: 'unapplied_credit'
            })
            .where(eq(transactions.id, deposit.id));
          
          // Update description if needed
          if (deposit.description && deposit.description.includes('Applied')) {
            // Get the invoice reference
            const invoiceMatch = entry.description.match(/invoice #?(\d+)/i);
            if (invoiceMatch && invoiceMatch[1]) {
              const invoiceRef = invoiceMatch[1];
              
              // Remove the application reference from the description
              const newDescription = deposit.description.replace(
                new RegExp(`Applied \\$?([0-9,]+(?:\\.[0-9]+)?)\\s+to\\s+invoice #?${invoiceRef}[^,]*`, 'i'),
                ''
              ).trim();
              
              await tx
                .update(transactions)
                .set({
                  description: newDescription
                })
                .where(eq(transactions.id, deposit.id));
            }
          }
        }
      }
    }
  }
  
  private async handleInvoiceDeletion(tx: any, invoice: any) {
    console.log(`Processing invoice deletion for invoice #${invoice.reference}`);
    
    try {
      // APPROACH 1: Find all deposits directly in the transactions table
      // Look for deposits that explicitly mention applying credits to this invoice in their description
      const depositsWithCredits = await tx
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.type, 'deposit'),
            sql`${transactions.description} LIKE ${'%applied%to invoice #' + invoice.reference + '%'}`
          )
        );
        
      console.log(`Found ${depositsWithCredits.length} deposits with credits applied to invoice #${invoice.reference}`);
      
      // Process each deposit with applied credits
      for (const deposit of depositsWithCredits) {
        // Always restore the full credit amount (simpler approach that avoids calculation errors)
        // When a credit is unapplied, its balance should be the negative of its original amount
        const originalAmount = Number(deposit.amount);
        const fullCreditBalance = -Math.abs(originalAmount);
        
        if (!isNaN(originalAmount) && originalAmount > 0) {
          console.log(`Restoring full credit balance for deposit #${deposit.reference}: ${fullCreditBalance}`);
          
          // Update the deposit to have its full credit balance restored
          await tx
            .update(transactions)
            .set({
              balance: fullCreditBalance,
              status: 'unapplied_credit'
            })
            .where(eq(transactions.id, deposit.id));
        }
      }
      
      // APPROACH 2: Find all ledger entries that refer to this invoice
      const relatedEntries = await tx
        .select()
        .from(ledgerEntries)
        .where(
          sql`${ledgerEntries.description} LIKE ${'%invoice #' + invoice.reference + '%'}`
        );
        
      // Find all payments that applied credits to this invoice
      const paymentIds = new Set();
      const processedDepositIds = new Set(depositsWithCredits.map(d => d.id));
      
      for (const entry of relatedEntries) {
        if (entry.description && 
            entry.description.includes('Applied credit from deposit') && 
            entry.transactionId !== invoice.id) {
          paymentIds.add(entry.transactionId);
        }
      }
      
      console.log(`Found ${paymentIds.size} payments with credits applied to invoice #${invoice.reference}`);
      
      // Process each payment that applied credits to this invoice
      for (const paymentId of paymentIds) {
        const [payment] = await tx
          .select()
          .from(transactions)
          .where(eq(transactions.id, paymentId));
        
        if (!payment) continue;
        
        // Find deposit applications in this payment for this invoice
        const depositApplications = relatedEntries.filter(e => 
          e.transactionId === paymentId && 
          e.description && 
          e.description.includes('Applied credit from deposit') &&
          e.description.includes(`invoice #${invoice.reference}`)
        );
        
        // For each deposit application, restore the deposit balance
        for (const application of depositApplications) {
          if (!application.description) continue;
          
          // Extract deposit reference
          const depositMatch = application.description.match(/deposit #?([^,\s]+)/i);
          if (depositMatch && depositMatch[1]) {
            const depositRef = depositMatch[1];
            
            // Try to parse as ID first
            let depositId = 0;
            try {
              depositId = parseInt(depositRef, 10);
            } catch (e) {
              depositId = 0;
            }
            
            // Skip if we already processed this deposit
            if (depositId > 0 && processedDepositIds.has(depositId)) {
              console.log(`Skipping already processed deposit #${depositRef}`);
              continue;
            }
            
            // Find the deposit
            const depositQuery = depositId > 0
              ? sql`
                SELECT * FROM transactions 
                WHERE type = 'deposit' 
                AND (reference = ${depositRef} OR id = ${depositId})
                LIMIT 1
              `
              : sql`
                SELECT * FROM transactions 
                WHERE type = 'deposit' 
                AND reference = ${depositRef}
                LIMIT 1
              `;
              
            const depositResult = await tx.execute(depositQuery);
            
            if (depositResult.rows && depositResult.rows.length > 0) {
              const deposit = depositResult.rows[0];
              processedDepositIds.add(deposit.id);
              
              // Always restore the full credit amount
              const originalAmount = Number(deposit.amount);
              const fullCreditBalance = -Math.abs(originalAmount);
              
              if (!isNaN(originalAmount) && originalAmount > 0) {
                console.log(`Restoring full credit balance for deposit #${deposit.reference}: ${fullCreditBalance}`);
                
                // Update the deposit to have its full credit balance
                await tx.execute(
                  sql`
                    UPDATE transactions 
                    SET balance = ${fullCreditBalance}, 
                        status = 'unapplied_credit'
                    WHERE id = ${deposit.id}
                  `
                );
              }
              
              // Update description
              if (deposit.description && deposit.description.includes(`invoice #${invoice.reference}`)) {
                const newDescription = deposit.description.replace(
                  new RegExp(`Applied \\$?([0-9,]+(?:\\.[0-9]+)?)\\s+to\\s+invoice #?${invoice.reference}[^,]*`, 'i'),
                  ''
                ).trim();
                
                await tx
                  .update(transactions)
                  .set({
                    description: newDescription
                  })
                  .where(eq(transactions.id, deposit.id));
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error handling credits during invoice deletion:`, error);
      // Continue with deletion even if credit restoration fails
    }
  }
  
  private async handleDepositDeletion(tx: any, deposit: any) {
    console.log(`Processing deposit deletion for deposit ID ${deposit.id} (${deposit.reference || 'no reference'})`);
    
    // Find any payments that used this deposit's credit
    const applicationsToThis = await tx
      .select()
      .from(ledgerEntries)
      .where(
        sql`${ledgerEntries.description} LIKE ${'%Applied credit from deposit #' + (deposit.reference || deposit.id) + '%'}`
      );
    
    if (applicationsToThis.length > 0) {
      // This should never happen as isDepositAppliedToInvoices should have returned true
      console.error(`Found ${applicationsToThis.length} applications of this deposit that should have prevented deletion!`);
      return;
    }
  }
  
  private async isDepositAppliedToInvoices(tx: any, deposit: any): Promise<boolean> {
    console.log(`Checking if deposit #${deposit.id} (${deposit.reference || 'no reference'}) has been applied to invoices`);
    
    // Method 1: Check for ledger entries that show this deposit being applied
    const depositApplications = await tx
      .select()
      .from(ledgerEntries)
      .where(
        sql`${ledgerEntries.description} LIKE ${'%Applied credit from deposit #' + (deposit.reference || deposit.id) + '%'}`
      );
    
    if (depositApplications.length > 0) {
      console.log(`Found ${depositApplications.length} ledger entries showing this deposit was applied`);
      
      // Check if any of these are actual credit applications rather than just mentions
      for (const entry of depositApplications) {
        if (entry.debit > 0 && entry.description && entry.description.includes('Applied credit from deposit')) {
          // This is a proper credit application entry
          return true;
        }
      }
    }
    
    // Method 2: Check the deposit's description for evidence it was applied
    if (deposit.description && 
        deposit.description.includes('Applied') && 
        deposit.description.includes('to invoice #')) {
      
      // Check if there's a specific amount mentioned (format: "Applied $3000 to invoice")
      const appliedAmountMatch = deposit.description.match(/Applied\s+\$?([0-9,]+(?:\.[0-9]+)?)\s+to\s+invoice/i);
      
      if (appliedAmountMatch && appliedAmountMatch[1]) {
        // Extract and check the amount
        const extractedAmount = parseFloat(appliedAmountMatch[1].replace(/,/g, ''));
        
        if (!isNaN(extractedAmount) && extractedAmount > 0) {
          console.log(`Deposit description indicates it was applied: "${deposit.description}"`);
          // Get the invoice reference
          const invoiceMatch = deposit.description.match(/invoice #?(\d+)/i);
          
          if (invoiceMatch && invoiceMatch[1]) {
            // Find the invoice to verify it exists
            const [invoice] = await tx
              .select()
              .from(transactions)
              .where(
                and(
                  eq(transactions.type, 'invoice'),
                  eq(transactions.reference, invoiceMatch[1])
                )
              );
            
            if (invoice) {
              // If the referenced invoice exists, this is an actual application
              return true;
            }
          }
        }
      }
    }
    
    // This deposit can be safely deleted
    return false;
  }
  
  private async recalculateReferencedInvoiceBalances(tx: any, ledgerEntries: any[]) {
    // Get all invoice references from the ledger entries
    const invoiceReferences = new Set<string>();
    
    for (const entry of ledgerEntries) {
      if (!entry.description) continue;
      
      const match = entry.description.match(/invoice\s+#?(\d+)/i);
      if (match && match[1]) {
        invoiceReferences.add(match[1]);
      }
    }
    
    // Recalculate balance for each invoice
    for (const invoiceRef of invoiceReferences) {
      // Find the invoice
      const [invoice] = await tx
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.type, 'invoice'),
            eq(transactions.reference, invoiceRef)
          )
        );
      
      if (!invoice) continue;
      
      // Get all ledger entries related to this invoice
      const allEntries = await tx
        .select()
        .from(ledgerEntries)
        .where(
          and(
            eq(ledgerEntries.accountId, 2), // Accounts Receivable
            // Fix SQL syntax with proper parameter binding
            sql`${ledgerEntries.description} LIKE ${'%invoice #' + invoiceRef + '%'}`
          )
        );
      
      // Calculate total applied credits
      const totalApplied = allEntries.reduce((sum, entry) => {
        // Credit to A/R is a payment
        if (entry.credit > 0) {
          return sum + entry.credit;
        }
        return sum;
      }, 0);
      
      // Calculate new balance
      const newBalance = Math.max(0, Number(invoice.amount) - totalApplied);
      
      // Set appropriate status
      const newStatus = newBalance > 0 ? 'open' : 'completed';
      
      console.log(`Final recalculation for invoice #${invoiceRef}: amount=${invoice.amount}, applied=${totalApplied}, new balance=${newBalance}`);
      
      // Update the invoice
      await tx
        .update(transactions)
        .set({ 
          balance: newBalance, 
          status: newStatus 
        })
        .where(eq(transactions.id, invoice.id));
    }
  }

  /**
   * Gets transactions for a specific contact
   */
  async getTransactionsByContact(contactId: number): Promise<Transaction[]> {
    try {
      const transactionsList = await db
        .select()
        .from(transactions)
        .where(eq(transactions.contactId, contactId))
        .orderBy(desc(transactions.date));
      
      return transactionsList;
    } catch (error) {
      console.error(`Error getting transactions for contact ${contactId}:`, error);
      return [];
    }
  }
  
  /**
   * Searches for transactions that contain a specific text in their description
   * @param searchText Text to search for in transaction descriptions
   * @param type Optional transaction type filter
   * @returns Array of matching transactions
   */
  async getTransactionsByDescription(searchText: string, type?: string): Promise<Transaction[]> {
    try {
      // Build the query
      let query = db
        .select()
        .from(transactions)
        .where(sql`LOWER(${transactions.description}) LIKE LOWER(${'%' + searchText + '%'})`)
        .orderBy(desc(transactions.date));
      
      // Add type filter if provided
      if (type) {
        query = query.where(eq(transactions.type, type as any));
      }
      
      // Execute the query
      const result = await query;
      
      console.log(`Found ${result.length} transactions containing "${searchText}" with type ${type || 'any'}`);
      return result;
    } catch (error) {
      console.error('Error searching transactions by description:', error);
      return [];
    }
  }
  
  /**
   * Gets transactions for a specific contact filtered by type
   * @param contactId The contact ID to filter by
   * @param type The transaction type to filter by
   * @returns Array of matching transactions
   */
  async getTransactionsByContactAndType(contactId: number, type: string): Promise<Transaction[]> {
    try {
      const result = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.contactId, contactId),
            eq(transactions.type, type as any)
          )
        )
        .orderBy(desc(transactions.date));
      
      return result;
    } catch (error) {
      console.error(`Error getting ${type} transactions for contact ${contactId}:`, error);
      return [];
    }
  }

  // Line Items
  async getLineItemsByTransaction(transactionId: number): Promise<LineItem[]> {
    return await db.select()
      .from(lineItems)
      .where(eq(lineItems.transactionId, transactionId));
  }

  async createLineItem(lineItem: InsertLineItem): Promise<LineItem> {
    const [newLineItem] = await db.insert(lineItems).values(lineItem).returning();
    return newLineItem;
  }

  // Ledger Entries
  async getLedgerEntriesByTransaction(transactionId: number): Promise<LedgerEntry[]> {
    return await db.select()
      .from(ledgerEntries)
      .where(eq(ledgerEntries.transactionId, transactionId));
  }

  async getAllLedgerEntries(): Promise<LedgerEntry[]> {
    const result = await db.select().from(ledgerEntries).orderBy(desc(ledgerEntries.date));
    return result as LedgerEntry[];
  }

  async getLedgerEntriesByDateRange(startDate?: Date, endDate?: Date): Promise<LedgerEntry[]> {
    let conditions = [];
    
    if (startDate) {
      conditions.push(gte(ledgerEntries.date, startDate));
    }
    
    if (endDate) {
      conditions.push(lte(ledgerEntries.date, endDate));
    }
    
    const query = conditions.length > 0
      ? db.select().from(ledgerEntries).where(and(...conditions))
      : db.select().from(ledgerEntries);
      
    const result = await query.orderBy(ledgerEntries.date);
    return result as LedgerEntry[];
  }

  async createLedgerEntry(ledgerEntry: InsertLedgerEntry): Promise<LedgerEntry> {
    const [newLedgerEntry] = await db.insert(ledgerEntries).values(ledgerEntry).returning();
    return newLedgerEntry;
  }

  async updateLedgerEntry(id: number, ledgerEntryUpdate: Partial<LedgerEntry>): Promise<LedgerEntry | undefined> {
    const [updatedLedgerEntry] = await db.update(ledgerEntries)
      .set(ledgerEntryUpdate)
      .where(eq(ledgerEntries.id, id))
      .returning();
    return updatedLedgerEntry;
  }

  // Reports
  async getAccountBalances(): Promise<{ account: Account; balance: number }[]> {
    const allAccounts = await this.getAccounts();
    const allLedgerEntries = await this.getAllLedgerEntries();
    
    // Create a map to store balances for each account
    const balanceMap = new Map<number, number>();
    
    // Initialize all account balances to 0
    allAccounts.forEach(account => {
      balanceMap.set(account.id, 0);
    });
    
    // Calculate balances from ledger entries
    allLedgerEntries.forEach(entry => {
      const account = allAccounts.find(a => a.id === entry.accountId);
      if (!account) return;
      
      const currentBalance = balanceMap.get(entry.accountId) || 0;
      let newBalance = currentBalance;
      
      // Apply debits and credits according to account type's normal balance
      if (['asset', 'expense', 'cost_of_goods_sold'].includes(account.type)) {
        // Debit increases (positive), credit decreases (negative)
        newBalance += entry.debit - entry.credit;
      } else {
        // For liability, equity, income accounts - credit increases (positive), debit decreases (negative)
        newBalance += entry.credit - entry.debit;
      }
      
      balanceMap.set(entry.accountId, newBalance);
    });
    
    // Create result array with account and balance
    return allAccounts.map(account => ({
      account,
      balance: balanceMap.get(account.id) || 0
    }));
  }

  async getIncomeStatement(startDate?: Date, endDate?: Date): Promise<{ revenues: number; expenses: number; netIncome: number }> {
    const accountBalances = await this.getAccountBalances();
    
    // For income accounts, credit increases the balance (revenue)
    const revenueAccounts = accountBalances.filter(item => 
      item.account.type === 'income' || item.account.type === 'other_income'
    );
    // With our fixed account balances, revenue accounts already have positive balances
    const revenues = revenueAccounts.reduce((sum, item) => sum + item.balance, 0);
    
    // For expense accounts, debit increases the balance (expense)
    const expenseAccounts = accountBalances.filter(item => 
      item.account.type === 'expenses' || item.account.type === 'cost_of_goods_sold'
    );
    // With our fixed account balances, expense accounts already have positive balances
    const expenses = expenseAccounts.reduce((sum, item) => sum + item.balance, 0);
    
    return {
      revenues,
      expenses,
      netIncome: revenues - expenses
    };
  }

  async getBalanceSheet(): Promise<{ assets: number; liabilities: number; equity: number }> {
    const accountBalances = await this.getAccountBalances();
    
    // Asset accounts have debit balances
    const assetAccounts = accountBalances.filter(item => 
      item.account.type === 'current_assets' || 
      item.account.type === 'bank' || 
      item.account.type === 'accounts_receivable' ||
      item.account.type === 'property_plant_equipment' || 
      item.account.type === 'long_term_assets'
    );
    // With our fixed account balances, asset accounts already have positive balances
    const assets = assetAccounts.reduce((sum, item) => sum + item.balance, 0);
    
    // Liability accounts have credit balances
    const liabilityAccounts = accountBalances.filter(item => 
      item.account.type === 'accounts_payable' || 
      item.account.type === 'credit_card' || 
      item.account.type === 'other_current_liabilities' ||
      item.account.type === 'long_term_liabilities'
    );
    // With our fixed account balances, liability accounts already have positive balances
    const liabilities = liabilityAccounts.reduce((sum, item) => sum + item.balance, 0);
    
    // Equity accounts have credit balances
    const equityAccounts = accountBalances.filter(item => 
      item.account.type === 'equity'
    );
    // With our fixed account balances, equity accounts already have positive balances
    const equity = equityAccounts.reduce((sum, item) => sum + item.balance, 0);
    
    // Include income and expense accounts in equity (net income)
    const incomeAccounts = accountBalances.filter(item => 
      item.account.type === 'income' || 
      item.account.type === 'other_income'
    );
    // With our fixed account balances, income accounts already have positive balances
    const revenueTotal = incomeAccounts.reduce((sum, item) => sum + item.balance, 0);
    
    const expenseAccounts = accountBalances.filter(item => 
      item.account.type === 'expenses' || 
      item.account.type === 'cost_of_goods_sold' ||
      item.account.type === 'other_expense'
    );
    // With our fixed account balances, expense accounts already have positive balances
    const expenseTotal = expenseAccounts.reduce((sum, item) => sum + item.balance, 0);
    
    // Net income is part of equity
    const netIncome = revenueTotal - expenseTotal;
    
    return { 
      assets, 
      liabilities, 
      equity: equity + netIncome 
    };
  }

  // Sales Taxes
  async getSalesTaxes(): Promise<SalesTax[]> {
    return await db.select().from(salesTaxSchema).orderBy(salesTaxSchema.name);
  }

  async getSalesTax(id: number): Promise<SalesTax | undefined> {
    const result = await db.select().from(salesTaxSchema).where(eq(salesTaxSchema.id, id));
    return result[0];
  }

  async createSalesTax(salesTax: InsertSalesTax): Promise<SalesTax> {
    const result = await db.insert(salesTaxSchema).values(salesTax).returning();
    if (Array.isArray(result) && result.length > 0) {
      return result[0] as SalesTax;
    }
    throw new Error("Failed to create sales tax");
  }

  async updateSalesTax(id: number, salesTaxUpdate: Partial<SalesTax>): Promise<SalesTax | undefined> {
    const [updatedSalesTax] = await db.update(salesTaxSchema)
      .set(salesTaxUpdate)
      .where(eq(salesTaxSchema.id, id))
      .returning();
    return updatedSalesTax;
  }

  async deleteSalesTax(id: number): Promise<boolean> {
    const result = await db.delete(salesTaxSchema).where(eq(salesTaxSchema.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Product Methods
  async getProducts(): Promise<Product[]> {
    return await db.select().from(productsSchema).orderBy(productsSchema.name);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const result = await db.select().from(productsSchema).where(eq(productsSchema.id, id));
    return result[0];
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(productsSchema).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: number, productUpdate: Partial<Product>): Promise<Product | undefined> {
    const [updatedProduct] = await db.update(productsSchema)
      .set(productUpdate)
      .where(eq(productsSchema.id, id))
      .returning();
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<boolean> {
    const result = await db.delete(productsSchema).where(eq(productsSchema.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Companies
  async getCompanies(): Promise<Company[]> {
    return await db.select().from(companiesSchema).orderBy(companiesSchema.name);
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const result = await db.select().from(companiesSchema).where(eq(companiesSchema.id, id));
    return result[0];
  }

  async getDefaultCompany(): Promise<Company | undefined> {
    const result = await db.select().from(companiesSchema).where(eq(companiesSchema.isDefault, true));
    return result[0];
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [newCompany] = await db.insert(companiesSchema).values(company).returning();
    return newCompany;
  }

  async updateCompany(id: number, companyUpdate: Partial<Company>): Promise<Company | undefined> {
    const [updatedCompany] = await db.update(companiesSchema)
      .set(companyUpdate)
      .where(eq(companiesSchema.id, id))
      .returning();
    return updatedCompany;
  }

  async setDefaultCompany(id: number): Promise<Company | undefined> {
    // Use a transaction to ensure all operations succeed or fail together
    return await db.transaction(async (tx) => {
      // First, reset isDefault to false for all companies
      await tx.update(companiesSchema).set({ isDefault: false });
      
      // Then, set isDefault to true for the specified company
      const [updatedCompany] = await tx.update(companiesSchema)
        .set({ isDefault: true })
        .where(eq(companiesSchema.id, id))
        .returning();
      
      return updatedCompany;
    });
  }

  // Company Settings
  async getCompanySettings(): Promise<CompanySettings | undefined> {
    const result = await db.select().from(companySchema);
    return result[0];
  }

  async saveCompanySettings(settings: InsertCompanySettings): Promise<CompanySettings> {
    // Check if company settings already exist
    const existing = await this.getCompanySettings();
    
    if (existing) {
      // Update existing settings
      const [updated] = await db.update(companySchema)
        .set({
          ...settings,
          updatedAt: new Date()
        })
        .where(eq(companySchema.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new settings
      const [newSettings] = await db.insert(companySchema)
        .values({
          ...settings,
          updatedAt: new Date()
        })
        .returning();
      return newSettings;
    }
  }

  // User Preferences
  async getPreferences(): Promise<Preferences | undefined> {
    const result = await db.select().from(preferencesSchema);
    return result[0];
  }

  async savePreferences(preferences: InsertPreferences): Promise<Preferences> {
    // Check if preferences already exist
    const existing = await this.getPreferences();
    
    if (existing) {
      // Update existing preferences
      const [updated] = await db.update(preferencesSchema)
        .set({
          ...preferences,
          updatedAt: new Date()
        })
        .where(eq(preferencesSchema.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new preferences
      const [newPreferences] = await db.insert(preferencesSchema)
        .values({
          ...preferences,
          updatedAt: new Date()
        })
        .returning();
      return newPreferences;
    }
  }

  // User Management Methods
  async getUsers(): Promise<User[]> {
    return await db.select({
      id: usersSchema.id,
      username: usersSchema.username,
      email: usersSchema.email,
      fullName: usersSchema.fullName,
      role: usersSchema.role,
      isActive: usersSchema.isActive,
      lastLogin: usersSchema.lastLogin,
      createdAt: usersSchema.createdAt,
      updatedAt: usersSchema.updatedAt
    }).from(usersSchema);
  }

  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(usersSchema).where(eq(usersSchema.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(usersSchema).where(eq(usersSchema.username, username));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(usersSchema).where(eq(usersSchema.email, email));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    // Hash the password before storing it
    const hashedPassword = await hashPassword(user.password);
    const [newUser] = await db.insert(usersSchema).values({
      ...user,
      password: hashedPassword
    }).returning();
    
    return newUser;
  }

  async updateUser(id: number, userUpdate: Partial<User>): Promise<User | undefined> {
    // If password is being updated, hash it
    if (userUpdate.password) {
      userUpdate.password = await hashPassword(userUpdate.password);
    }
    
    const [updatedUser] = await db.update(usersSchema)
      .set(userUpdate)
      .where(eq(usersSchema.id, id))
      .returning();
      
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      // Before deleting a user, we should check if they have any associated data
      // or if they are the last admin (don't delete the last admin)
      const user = await this.getUser(id);
      if (!user) return false;
      
      // Check if this is the last admin
      if (user.role === 'admin') {
        const admins = await db.select()
          .from(usersSchema)
          .where(eq(usersSchema.role, 'admin'));
          
        if (admins.length <= 1) {
          console.error('Cannot delete the last admin user');
          return false;
        }
      }
      
      // Delete user-company relationships first
      await db.delete(userCompaniesSchema)
        .where(eq(userCompaniesSchema.userId, id));
      
      // Delete the user
      const result = await db.delete(usersSchema)
        .where(eq(usersSchema.id, id));
        
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error(`Error deleting user with ID ${id}:`, error);
      return false;
    }
  }

  async updateUserLastLogin(id: number): Promise<User | undefined> {
    const [updatedUser] = await db.update(usersSchema)
      .set({ lastLogin: new Date() })
      .where(eq(usersSchema.id, id))
      .returning();
      
    return updatedUser;
  }
  
  // User-Company Assignments
  async getUserCompanies(userId: number): Promise<UserCompany[]> {
    return await db.select()
      .from(userCompaniesSchema)
      .where(eq(userCompaniesSchema.userId, userId));
  }

  async getCompanyUsers(companyId: number): Promise<UserCompany[]> {
    return await db.select()
      .from(userCompaniesSchema)
      .where(eq(userCompaniesSchema.companyId, companyId));
  }

  async assignUserToCompany(userCompany: InsertUserCompany): Promise<UserCompany> {
    const [newUserCompany] = await db.insert(userCompaniesSchema)
      .values(userCompany)
      .returning();
      
    return newUserCompany;
  }

  async updateUserCompanyRole(userId: number, companyId: number, role: string): Promise<UserCompany | undefined> {
    const [updatedUserCompany] = await db.update(userCompaniesSchema)
      .set({ role })
      .where(
        and(
          eq(userCompaniesSchema.userId, userId),
          eq(userCompaniesSchema.companyId, companyId)
        )
      )
      .returning();
      
    return updatedUserCompany;
  }

  async removeUserFromCompany(userId: number, companyId: number): Promise<boolean> {
    try {
      const result = await db.delete(userCompaniesSchema)
        .where(
          and(
            eq(userCompaniesSchema.userId, userId),
            eq(userCompaniesSchema.companyId, companyId)
          )
        );
        
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error(`Error removing user ${userId} from company ${companyId}:`, error);
      return false;
    }
  }
  
  // Permissions
  async getPermissions(): Promise<Permission[]> {
    return await db.select().from(permissionsSchema);
  }

  async getPermission(id: number): Promise<Permission | undefined> {
    const result = await db.select().from(permissionsSchema).where(eq(permissionsSchema.id, id));
    return result[0];
  }

  async getPermissionByName(name: string): Promise<Permission | undefined> {
    const result = await db.select().from(permissionsSchema).where(eq(permissionsSchema.name, name));
    return result[0];
  }

  async createPermission(permission: InsertPermission): Promise<Permission> {
    const [newPermission] = await db.insert(permissionsSchema)
      .values(permission)
      .returning();
      
    return newPermission;
  }

  async deletePermission(id: number): Promise<boolean> {
    try {
      // First remove any role-permission associations
      await db.delete(rolePermissionsSchema)
        .where(eq(rolePermissionsSchema.permissionId, id));
      
      // Then delete the permission
      const result = await db.delete(permissionsSchema)
        .where(eq(permissionsSchema.id, id));
        
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error(`Error deleting permission with ID ${id}:`, error);
      return false;
    }
  }
  
  // Role Permissions
  async getRolePermissions(role: string): Promise<RolePermission[]> {
    return await db.select()
      .from(rolePermissionsSchema)
      .where(eq(rolePermissionsSchema.role, role));
  }

  async addPermissionToRole(rolePermission: InsertRolePermission): Promise<RolePermission> {
    const [newRolePermission] = await db.insert(rolePermissionsSchema)
      .values(rolePermission)
      .returning();
      
    return newRolePermission;
  }

  async removePermissionFromRole(role: string, permissionId: number): Promise<boolean> {
    try {
      const result = await db.delete(rolePermissionsSchema)
        .where(
          and(
            eq(rolePermissionsSchema.role, role),
            eq(rolePermissionsSchema.permissionId, permissionId)
          )
        );
        
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error(`Error removing permission ${permissionId} from role ${role}:`, error);
      return false;
    }
  }
  
  // Authentication helper methods
  async validatePassword(storedPassword: string, suppliedPassword: string): Promise<boolean> {
    return await comparePasswords(suppliedPassword, storedPassword);
  }

  async hashPassword(password: string): Promise<string> {
    return await hashPassword(password);
  }
}