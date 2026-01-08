import { db } from "./db";
import {
  Account, Contact, ContactNote, Transaction, LineItem, LedgerEntry, SalesTax, Product,
  CompanySettings, Preferences, Company, User, UserCompany, Permission, RolePermission,
  BankConnection, BankAccount, ImportedTransaction, CsvMappingPreference,
  Reconciliation, ReconciliationItem,
  Currency, ExchangeRate, FxRealization, FxRevaluation, CurrencyLock, CategorizationRule, ActivityLog,
  AccountingFirm, FirmClientAccess, UserInvitation, InvoiceActivity,
  RecurringTemplate, RecurringLine, RecurringHistory,
  MerchantPattern, CategorizationFeedback,
  AiConversation, AiMessage,
  InsertAccount, InsertContact, InsertContactNote, InsertTransaction, InsertLineItem, InsertLedgerEntry, InsertSalesTax, InsertProduct,
  InsertCompanySettings, InsertPreferences, InsertCompany, InsertUser, InsertUserCompany, InsertPermission, InsertRolePermission,
  InsertBankConnection, InsertBankAccount, InsertImportedTransaction, InsertCsvMappingPreference,
  InsertReconciliation, InsertReconciliationItem,
  InsertCurrency, InsertExchangeRate, InsertFxRealization, InsertFxRevaluation, InsertCurrencyLock, InsertCategorizationRule, InsertActivityLog,
  InsertAccountingFirm, InsertFirmClientAccess, InsertUserInvitation, InsertInvoiceActivity,
  InsertRecurringTemplate, InsertRecurringLine, InsertRecurringHistory,
  InsertMerchantPattern, InsertCategorizationFeedback,
  InsertAiConversation, InsertAiMessage,
  accounts, contacts, contactNotesSchema, transactions, lineItems, ledgerEntries, salesTaxSchema, productsSchema,
  companySchema, preferencesSchema, companiesSchema, usersSchema, userCompaniesSchema,
  permissionsSchema, rolePermissionsSchema, bankConnectionsSchema, bankAccountsSchema, importedTransactionsSchema, csvMappingPreferencesSchema,
  reconciliations, reconciliationItems,
  currenciesSchema, exchangeRatesSchema, fxRealizationsSchema, fxRevaluationsSchema, currencyLocksSchema, categorizationRulesSchema, activityLogsSchema,
  accountingFirmsSchema, firmClientAccessSchema, userInvitationsSchema, invoiceActivitiesSchema,
  recurringTemplatesSchema, recurringLinesSchema, recurringHistorySchema,
  merchantPatternsSchema, categorizationFeedbackSchema,
  aiConversationsSchema, aiMessagesSchema
} from "@shared/schema";
import { eq, and, desc, gte, lte, sql, ne, or, isNull, like, ilike, lt, gt, inArray } from "drizzle-orm";
import { IStorage } from "./storage";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { getFiscalYearBounds } from "@shared/fiscalYear";
import { startOfMonth, endOfMonth, subMonths, format, differenceInDays } from "date-fns";

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
  // Accounts (with company isolation)
  async getAccounts(companyId?: number): Promise<Account[]> {
    if (companyId) {
      return await db.select().from(accounts)
        .where(eq(accounts.companyId, companyId))
        .orderBy(accounts.code);
    }
    return await db.select().from(accounts).orderBy(accounts.code);
  }

  async getAccount(id: number): Promise<Account | undefined> {
    const result = await db.select().from(accounts).where(eq(accounts.id, id));
    return result[0];
  }

  async getAccountByCode(code: string, companyId?: number): Promise<Account | undefined> {
    if (companyId) {
      const result = await db.select().from(accounts)
        .where(and(eq(accounts.code, code), eq(accounts.companyId, companyId)));
      return result[0];
    }
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

  async deleteAccount(id: number): Promise<boolean> {
    // Check if account has any ledger entries (transactions)
    const hasTransactions = await this.hasAccountTransactions(id);
    if (hasTransactions) {
      throw new Error('Cannot delete account with existing transactions');
    }

    const result = await db.delete(accounts).where(eq(accounts.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async hasAccountTransactions(accountId: number): Promise<boolean> {
    const entries = await db.select()
      .from(ledgerEntries)
      .where(eq(ledgerEntries.accountId, accountId))
      .limit(1);
    return entries.length > 0;
  }

  // Helper methods for currency-specific AR/AP accounts
  private async findARAccountForCurrency(currency: string): Promise<Account | undefined> {
    const accountName = `Accounts Receivable - ${currency}`;
    
    // First check by exact name match
    const byName = await db.select().from(accounts).where(eq(accounts.name, accountName));
    if (byName.length > 0) {
      return byName[0];
    }
    
    // If not found by name, check by type and currency
    const byTypeAndCurrency = await db.select().from(accounts).where(
      and(
        eq(accounts.type, 'accounts_receivable'),
        eq(accounts.currency, currency)
      )
    );
    return byTypeAndCurrency[0];
  }

  private async findAPAccountForCurrency(currency: string): Promise<Account | undefined> {
    const accountName = `Accounts Payable - ${currency}`;
    
    // First check by exact name match
    const byName = await db.select().from(accounts).where(eq(accounts.name, accountName));
    if (byName.length > 0) {
      return byName[0];
    }
    
    // If not found by name, check by type and currency
    const byTypeAndCurrency = await db.select().from(accounts).where(
      and(
        eq(accounts.type, 'accounts_payable'),
        eq(accounts.currency, currency)
      )
    );
    return byTypeAndCurrency[0];
  }

  private async ensureCurrencyARAccount(currency: string): Promise<void> {
    const existingAccount = await this.findARAccountForCurrency(currency);
    if (!existingAccount) {
      await this.createAccount({
        name: `Accounts Receivable - ${currency}`,
        type: 'accounts_receivable',
        currency: currency,
        isActive: true
      });
    }
  }

  private async ensureCurrencyAPAccount(currency: string): Promise<void> {
    const existingAccount = await this.findAPAccountForCurrency(currency);
    if (!existingAccount) {
      await this.createAccount({
        name: `Accounts Payable - ${currency}`,
        type: 'accounts_payable',
        currency: currency,
        isActive: true
      });
    }
  }

  // Contacts
  async getContacts(companyId?: number, includeInactive = false): Promise<Contact[]> {
    const conditions = [];
    if (companyId) {
      conditions.push(eq(contacts.companyId, companyId));
    }
    if (!includeInactive) {
      conditions.push(eq(contacts.isActive, true));
    }

    if (conditions.length > 0) {
      return await db.select().from(contacts)
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .orderBy(contacts.name);
    }
    return await db.select().from(contacts).orderBy(contacts.name);
  }

  async getContact(id: number): Promise<Contact | undefined> {
    const result = await db.select().from(contacts).where(eq(contacts.id, id));
    return result[0];
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const [newContact] = await db.insert(contacts).values(contact).returning();
    
    // Auto-create currency-specific AR/AP accounts for foreign currency contacts
    const preferences = await this.getPreferences();
    const homeCurrency = preferences?.homeCurrency || 'USD';
    
    if (contact.currency && contact.currency !== homeCurrency) {
      if (contact.type === 'customer' || contact.type === 'both') {
        await this.ensureCurrencyARAccount(contact.currency);
      }
      if (contact.type === 'vendor' || contact.type === 'both') {
        await this.ensureCurrencyAPAccount(contact.currency);
      }
    }
    
    return newContact;
  }

  async updateContact(id: number, contactUpdate: Partial<Contact>): Promise<Contact | undefined> {
    const [updatedContact] = await db.update(contacts)
      .set(contactUpdate)
      .where(eq(contacts.id, id))
      .returning();
    
    // Auto-create currency-specific AR/AP accounts if currency changed to foreign currency
    if (contactUpdate.currency && updatedContact) {
      const preferences = await this.getPreferences();
      const homeCurrency = preferences?.homeCurrency || 'USD';
      
      if (contactUpdate.currency !== homeCurrency) {
        if (updatedContact.type === 'customer' || updatedContact.type === 'both') {
          await this.ensureCurrencyARAccount(contactUpdate.currency);
        }
        if (updatedContact.type === 'vendor' || updatedContact.type === 'both') {
          await this.ensureCurrencyAPAccount(contactUpdate.currency);
        }
      }
    }
    
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

  async hasContactTransactions(contactId: number): Promise<boolean> {
    const result = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.contactId, contactId))
      .limit(1);
    return result.length > 0;
  }

  // Contact Notes
  async getContactNotes(contactId: number): Promise<ContactNote[]> {
    try {
      const results = await db
        .select()
        .from(contactNotesSchema)
        .where(eq(contactNotesSchema.contactId, contactId))
        .orderBy(desc(contactNotesSchema.createdAt));
      return results;
    } catch (error) {
      console.error("Error fetching contact notes:", error);
      throw error;
    }
  }

  async getContactNote(id: number): Promise<ContactNote | undefined> {
    try {
      const result = await db
        .select()
        .from(contactNotesSchema)
        .where(eq(contactNotesSchema.id, id));
      return result[0];
    } catch (error) {
      console.error("Error fetching contact note:", error);
      throw error;
    }
  }

  async createContactNote(note: InsertContactNote): Promise<ContactNote> {
    try {
      const result = await db.insert(contactNotesSchema).values(note).returning();
      return result[0];
    } catch (error) {
      console.error("Error creating contact note:", error);
      throw error;
    }
  }

  async updateContactNote(id: number, note: Partial<ContactNote>): Promise<ContactNote | undefined> {
    try {
      const result = await db
        .update(contactNotesSchema)
        .set(note)
        .where(eq(contactNotesSchema.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error("Error updating contact note:", error);
      throw error;
    }
  }

  async deleteContactNote(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(contactNotesSchema)
        .where(eq(contactNotesSchema.id, id))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting contact note:", error);
      throw error;
    }
  }

  async unpinAllContactNotes(contactId: number): Promise<void> {
    try {
      await db
        .update(contactNotesSchema)
        .set({ isPinned: false })
        .where(eq(contactNotesSchema.contactId, contactId));
    } catch (error) {
      console.error("Error unpinning contact notes:", error);
      throw error;
    }
  }

  // Transactions
  async getTransactions(companyId?: number): Promise<Transaction[]> {
    try {
      if (companyId) {
        const results = await db.select().from(transactions)
          .where(eq(transactions.companyId, companyId))
          .orderBy(desc(transactions.date));
        return results;
      }
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
    // Helper function to round to 2 decimals
    const roundTo2Decimals = (num: number): number => Math.round(num * 100) / 100;

    // Extract companyId from transaction for company-scoped lookups
    const companyId = (transaction as any).companyId;

    // Get home currency from preferences (company-scoped)
    const preferencesData = await this.getPreferences(companyId);
    const homeCurrency = preferencesData?.homeCurrency || 'CAD';

    // Check if this is a foreign currency transaction
    const transactionCurrency = (transaction as any).currency;
    const isForeignCurrency = transactionCurrency && transactionCurrency !== homeCurrency;
    const exchangeRate = (transaction as any).exchangeRate ?
      parseFloat((transaction as any).exchangeRate.toString()) : 1;

    console.log(`[createTransaction] Transaction type: ${transaction.type}, Currency: ${transactionCurrency || homeCurrency}, isForeignCurrency: ${isForeignCurrency}, exchangeRate: ${exchangeRate}`);

    // CRITICAL: For foreign currency transactions, swap generic AR/AP accounts to currency-specific ones
    let processedLedgerEntries = ledgerEntriesData;
    if (isForeignCurrency) {
      // Get all accounts to find the generic AR/AP accounts and currency-specific ones (company-scoped)
      const allAccounts = await this.getAccounts(companyId);
      
      // Find generic AR and AP accounts (no currency in name, base types)
      const genericAR = allAccounts.find(a => 
        a.type === 'accounts_receivable' && 
        a.name === 'Accounts Receivable'
      );
      const genericAP = allAccounts.find(a => 
        a.type === 'accounts_payable' && 
        a.name === 'Accounts Payable'
      );
      
      // Find currency-specific AR and AP accounts for this transaction's currency
      const currencyAR = allAccounts.find(a => 
        a.type === 'accounts_receivable' && 
        a.name === `Accounts Receivable - ${transactionCurrency}`
      );
      const currencyAP = allAccounts.find(a => 
        a.type === 'accounts_payable' && 
        a.name === `Accounts Payable - ${transactionCurrency}`
      );
      
      // Remap ledger entries from generic to currency-specific accounts
      processedLedgerEntries = ledgerEntriesData.map(entry => {
        let newAccountId = entry.accountId;
        
        // Swap generic AR to currency-specific AR
        if (genericAR && entry.accountId === genericAR.id && currencyAR) {
          console.log(`[createTransaction] Swapping account: ${genericAR.name} -> ${currencyAR.name}`);
          newAccountId = currencyAR.id;
        }
        
        // Swap generic AP to currency-specific AP
        if (genericAP && entry.accountId === genericAP.id && currencyAP) {
          console.log(`[createTransaction] Swapping account: ${genericAP.name} -> ${currencyAP.name}`);
          newAccountId = currencyAP.id;
        }
        
        return {
          ...entry,
          accountId: newAccountId
        };
      });
    }
    
    // Convert foreign currency amounts to CAD
    if (isForeignCurrency && exchangeRate > 0) {
      console.log(`[createTransaction] Converting foreign currency ledger entries to ${homeCurrency}`);
      
      processedLedgerEntries = processedLedgerEntries.map(entry => {
        const foreignDebit = entry.debit || 0;
        const foreignCredit = entry.credit || 0;
        
        // Convert to CAD
        const cadDebit = roundTo2Decimals(foreignDebit * exchangeRate);
        const cadCredit = roundTo2Decimals(foreignCredit * exchangeRate);
        
        console.log(`[createTransaction] Ledger entry: ${foreignDebit} debit, ${foreignCredit} credit in ${transactionCurrency} -> ${cadDebit} debit, ${cadCredit} credit in ${homeCurrency}`);
        
        // Create updated entry with CAD amounts and foreign currency metadata
        return {
          ...entry,
          debit: cadDebit,
          credit: cadCredit,
          currency: transactionCurrency,
          exchangeRate: exchangeRate.toString(),
          foreignAmount: foreignDebit > 0 ? foreignDebit : (foreignCredit > 0 ? foreignCredit : null)
        };
      });
    }
    
    // Use a transaction to ensure all operations succeed or fail together
    const [newTransaction] = await db.transaction(async (tx) => {
      // Prepare transaction object with currency fields
      const transactionData: any = {
        ...transaction
      };
      
      // CRITICAL: Explicitly add currency metadata for foreign currency transactions
      // This ensures the currency fields are not filtered out during database insert
      if (isForeignCurrency) {
        transactionData.currency = transactionCurrency;
        transactionData.exchangeRate = exchangeRate.toString(); // Convert to string for decimal column
        transactionData.foreignAmount = (transaction as any).foreignAmount ? 
          (transaction as any).foreignAmount.toString() : null;
      }
      
      // Insert transaction
      const [newTx] = await tx.insert(transactions).values(transactionData).returning();
      
      console.log(`[createTransaction] Created transaction #${newTx.id} (${newTx.reference})`);
      
      // Insert line items with the transaction ID
      if (lineItemsData.length > 0) {
        await tx.insert(lineItems).values(
          lineItemsData.map(item => ({
            ...item,
            transactionId: newTx.id
          }))
        );
        console.log(`[createTransaction] Inserted ${lineItemsData.length} line items`);
      }
      
      // Skip ledger entries and account balance updates for quotations (they don't affect accounting)
      const isQuotation = newTx.status === 'quotation' || newTx.status === 'draft';
      
      if (!isQuotation) {
        // Insert ledger entries with the transaction ID (using processed entries with CAD amounts)
        if (processedLedgerEntries.length > 0) {
          await tx.insert(ledgerEntries).values(
            processedLedgerEntries.map(entry => ({
              ...entry,
              transactionId: newTx.id
            }))
          );
          console.log(`[createTransaction] Inserted ${processedLedgerEntries.length} ledger entries`);
        }
        
        // Update account balances based on ledger entries (using CAD amounts)
        for (const entry of processedLedgerEntries) {
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
      } else {
        console.log(`[createTransaction] Skipping ledger entries for quotation/draft status`);
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
            
            // Perform comprehensive check for deposit usage - no special cases
            const applicationCheck = await this.isDepositAppliedToInvoices(tx, transaction);
            
            if (applicationCheck.isApplied) {
              console.log(`Cannot delete deposit #${transaction.id} (${transaction.reference}): ${applicationCheck.details}`);
              
              // Return more detailed information about why deletion is blocked
              throw new Error(JSON.stringify({
                message: `Cannot delete this deposit: ${applicationCheck.details}`,
                type: 'credit_in_use',
                transactionId: transaction.id,
                details: applicationCheck.details
              }));
            }
            
            // Handle any potential references to this deposit
            await this.handleDepositDeletion(tx, transaction);
            
            console.log(`Deposit #${transaction.id} (${transaction.reference}) can be safely deleted - no applications found`);
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
    console.log(`Processing invoice deletion for invoice #${invoice.reference} (ID: ${invoice.id})`);
    
    try {
      // NEW APPROACH: Use payment_applications table to find all payments linked to this invoice
      const { paymentApplications } = await import('@shared/schema');
      
      const applications = await tx
        .select()
        .from(paymentApplications)
        .where(eq(paymentApplications.invoiceId, invoice.id));
      
      console.log(`Found ${applications.length} payment applications for invoice #${invoice.reference}`);
      
      // Process each payment that had money applied to this invoice
      for (const app of applications) {
        const [payment] = await tx
          .select()
          .from(transactions)
          .where(eq(transactions.id, app.paymentId));
        
        if (!payment) {
          console.log(`Payment ${app.paymentId} not found, skipping`);
          continue;
        }
        
        console.log(`Processing payment #${payment.id} (${payment.reference}): current balance=${payment.balance}, applied amount=${app.amountApplied}`);
        
        // Calculate new balance for this payment (restore the amount that was applied to this invoice)
        const currentBalance = Number(payment.balance) || 0;
        const restoredAmount = Number(app.amountApplied);
        const newBalance = currentBalance + restoredAmount;
        
        // Update payment with new balance and set status to unapplied_credit
        await tx
          .update(transactions)
          .set({
            balance: newBalance,
            status: 'unapplied_credit'
          })
          .where(eq(transactions.id, payment.id));
        
        console.log(`Updated payment #${payment.id}: new balance=${newBalance}, status=unapplied_credit`);
        
        // Delete the payment application record
        await tx
          .delete(paymentApplications)
          .where(eq(paymentApplications.id, app.id));
        
        console.log(`Deleted payment application record for payment ${app.paymentId} -> invoice ${app.invoiceId}`);
      }
      
      // LEGACY APPROACH: Also handle old-style deposits that might have been applied
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
  
  private async isDepositAppliedToInvoices(tx: any, deposit: any): Promise<{isApplied: boolean, details: string}> {
    console.log(`Checking if deposit #${deposit.id} (${deposit.reference || 'no reference'}) has been applied to invoices`);
    
    // Method 1: Check for ANY ledger entries that reference this deposit, not just our own
    // This catches cases where other transactions (like payments) have applied this credit
    const allReferencingLedgerEntries = await tx
      .select()
      .from(ledgerEntries)
      .where(
        and(
          ne(ledgerEntries.transactionId, deposit.id), // Not our own ledger entries
          or(
            sql`${ledgerEntries.description} LIKE ${'%deposit #' + (deposit.reference || deposit.id) + '%'}`,
            sql`${ledgerEntries.description} LIKE ${'%' + (deposit.reference || deposit.id) + '%credit%'}`
          )
        )
      );
    
    if (allReferencingLedgerEntries.length > 0) {
      // Analyze each reference to determine if it's an actual credit application
      let actualApplications = [];
      
      for (const entry of allReferencingLedgerEntries) {
        if (entry.description) {
          // Most explicit check: "Applied credit from deposit"
          if (entry.description.includes('Applied credit from deposit') && entry.debit > 0) {
            // Get the transaction that applied this credit
            const [applicationType] = await tx
              .select()
              .from(transactions)
              .where(eq(transactions.id, entry.transactionId));
              
            const applicatorInfo = applicationType ? 
              `${applicationType.type} #${applicationType.reference || applicationType.id}` :
              `transaction #${entry.transactionId}`;
              
            // Extract any invoice references
            const invoiceMatch = entry.description.match(/invoice #?(\d+)/i);
            const invoiceReference = invoiceMatch && invoiceMatch[1] ? invoiceMatch[1] : 'unknown invoice';
            
            actualApplications.push(`Applied to ${invoiceReference} via ${applicatorInfo}`);
            continue;
          }
          
          // Check for any credit application pattern
          if ((entry.description.toLowerCase().includes('credit') || 
               entry.description.toLowerCase().includes('deposit')) && 
              entry.debit > 0) {
            actualApplications.push(`Referenced in transaction #${entry.transactionId} with amount ${entry.debit}`);
          }
        }
      }
      
      if (actualApplications.length > 0) {
        console.log(`Found ${actualApplications.length} actual credit applications for deposit #${deposit.reference || deposit.id}`);
        return {
          isApplied: true, 
          details: `Credit has been applied to transactions: ${actualApplications.join('; ')}`
        };
      }
    }
    
    // Method 2: Carefully compare original amount vs current balance
    // We need to VERIFY that the difference is actually due to applied credits
    if (deposit.amount !== undefined && deposit.balance !== undefined) {
      // For deposits in our system, expected pattern is:
      // - Original amount: positive value (e.g., 5000)
      // - Balance: negative value representing available credit (e.g., -2090 if partially applied)
      const originalAmount = Math.abs(Number(deposit.amount));
      const availableCredit = Math.abs(Number(deposit.balance));
      
      // Only if balance is different AND we can confirm it's due to applications
      if (availableCredit !== originalAmount) {
        // IMPORTANT: Verify this is an actual credit application via ledger entries
        // Don't just rely on balance != amount, which can give false positives
        const creditApplicationLedgers = await tx
          .select()
          .from(ledgerEntries)
          .where(
            and(
              ne(ledgerEntries.transactionId, deposit.id),
              sql`${ledgerEntries.description} LIKE ${'%Applied credit from deposit #' + deposit.reference + '%'}`
            )
          );
          
        if (creditApplicationLedgers.length > 0) {
          // We found ACTUAL ledger entries showing this credit was applied
          const appliedAmount = originalAmount - availableCredit;
          console.log(`Deposit has been partially applied: original=${originalAmount}, available=${availableCredit}, applied=${appliedAmount}`);
          return {
            isApplied: true,
            details: `This deposit (${deposit.reference}) has been partially applied to invoices. The original amount was $${originalAmount.toFixed(2)} and the remaining balance is $${availableCredit.toFixed(2)}.`
          };
        } else {
          // Balance mismatch without ledger entries is likely a data issue
          console.log(`Balance mismatch for deposit #${deposit.reference} (${deposit.id}) but no ledger entries found confirming applications`);
          console.log(`This appears to be a data issue, not an actual credit application`);
        }
      }
    }
    
    // Method 3: Check the deposit's description for evidence it was applied
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
          const invoiceReference = invoiceMatch && invoiceMatch[1] ? invoiceMatch[1] : 'unknown invoice';
          
          return {
            isApplied: true,
            details: `Credit description indicates application to invoice #${invoiceReference} of ${extractedAmount}`
          };
        }
      }
    }
    
    // This deposit can be safely deleted
    return { isApplied: false, details: "No applications found" };
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
  async getTransactionsByContact(contactId: number, companyId?: number): Promise<Transaction[]> {
    try {
      const conditions = [eq(transactions.contactId, contactId)];
      if (companyId) {
        conditions.push(eq(transactions.companyId, companyId));
      }

      const transactionsList = await db
        .select()
        .from(transactions)
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
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
   * @param companyId Optional company ID for data isolation
   * @returns Array of matching transactions
   */
  async getTransactionsByDescription(searchText: string, type?: string, companyId?: number): Promise<Transaction[]> {
    try {
      // Build conditions
      const conditions = [sql`LOWER(${transactions.description}) LIKE LOWER(${'%' + searchText + '%'})`];

      if (type) {
        conditions.push(eq(transactions.type, type as any));
      }

      if (companyId) {
        conditions.push(eq(transactions.companyId, companyId));
      }

      // Execute the query with combined conditions
      const result = await db
        .select()
        .from(transactions)
        .where(conditions.length === 1 ? conditions[0] : and(...conditions))
        .orderBy(desc(transactions.date));

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
   * @param companyId Optional company ID for data isolation
   * @returns Array of matching transactions
   */
  async getTransactionsByContactAndType(contactId: number, type: string, companyId?: number): Promise<Transaction[]> {
    try {
      const conditions = [
        eq(transactions.contactId, contactId),
        eq(transactions.type, type as any)
      ];

      if (companyId) {
        conditions.push(eq(transactions.companyId, companyId));
      }

      const result = await db
        .select()
        .from(transactions)
        .where(and(...conditions))
        .orderBy(desc(transactions.date));

      return result;
    } catch (error) {
      console.error(`Error getting ${type} transactions for contact ${contactId}:`, error);
      return [];
    }
  }

  async getRecentTransactions(limit: number, companyId?: number): Promise<Transaction[]> {
    try {
      const conditions = [
        ne(transactions.type, 'customer_credit' as any),
        ne(transactions.type, 'vendor_credit' as any)
      ];

      if (companyId) {
        conditions.push(eq(transactions.companyId, companyId));
      }

      const result = await db
        .select()
        .from(transactions)
        .where(and(...conditions))
        .orderBy(desc(transactions.date))
        .limit(limit);

      return result;
    } catch (error) {
      console.error(`Error getting recent transactions:`, error);
      return [];
    }
  }

  async searchAll(query: string, companyId?: number): Promise<{
    transactions: any[];
    contacts: Contact[];
    accounts: Account[];
    products: any[];
  }> {
    try {
      const searchTerm = `%${query}%`;
      const numericQuery = parseFloat(query);
      const isNumeric = !isNaN(numericQuery);

      // Build transaction conditions
      const transactionConditions = [
        or(
          ilike(transactions.reference, searchTerm),
          ilike(transactions.description, searchTerm),
          ilike(transactions.memo, searchTerm),
          ilike(contacts.name, searchTerm),
          isNumeric ? sql`CAST(${transactions.amount} AS TEXT) LIKE ${searchTerm}` : sql`1=0`
        ),
        ne(transactions.type, 'customer_credit' as any),
        ne(transactions.type, 'vendor_credit' as any)
      ];
      if (companyId) {
        transactionConditions.push(eq(transactions.companyId, companyId));
      }

      // Build contact conditions
      const contactConditions = [
        or(
          ilike(contacts.name, searchTerm),
          ilike(contacts.email, searchTerm),
          ilike(contacts.phone, searchTerm),
          ilike(contacts.address, searchTerm),
          ilike(contacts.contactName, searchTerm)
        )
      ];
      if (companyId) {
        contactConditions.push(eq(contacts.companyId, companyId));
      }

      // Build account conditions
      const accountConditions = [
        or(
          ilike(accounts.name, searchTerm),
          ilike(accounts.code, searchTerm)
        )
      ];
      if (companyId) {
        accountConditions.push(eq(accounts.companyId, companyId));
      }

      // Build product conditions
      const productConditions = [
        or(
          ilike(productsSchema.name, searchTerm),
          ilike(productsSchema.sku, searchTerm),
          ilike(productsSchema.description, searchTerm),
          isNumeric ? sql`CAST(${productsSchema.price} AS TEXT) LIKE ${searchTerm}` : sql`1=0`
        )
      ];
      if (companyId) {
        productConditions.push(eq(productsSchema.companyId, companyId));
      }

      // Search transactions with contact names joined
      const transactionsWithContactsQuery = db
        .select({
          id: transactions.id,
          reference: transactions.reference,
          type: transactions.type,
          date: transactions.date,
          description: transactions.description,
          amount: transactions.amount,
          balance: transactions.balance,
          contactId: transactions.contactId,
          status: transactions.status,
          memo: transactions.memo,
          contactName: contacts.name,
        })
        .from(transactions)
        .leftJoin(contacts, eq(transactions.contactId, contacts.id))
        .where(and(...transactionConditions))
        .orderBy(desc(transactions.date))
        .limit(25);

      const [transactionsResult, contactsResult, accountsResult, productsResult] = await Promise.all([
        transactionsWithContactsQuery,

        db
          .select()
          .from(contacts)
          .where(contactConditions.length === 1 ? contactConditions[0] : and(...contactConditions))
          .orderBy(contacts.name)
          .limit(15),

        db
          .select()
          .from(accounts)
          .where(accountConditions.length === 1 ? accountConditions[0] : and(...accountConditions))
          .orderBy(accounts.code)
          .limit(10),

        // Search products
        db
          .select()
          .from(productsSchema)
          .where(productConditions.length === 1 ? productConditions[0] : and(...productConditions))
          .orderBy(productsSchema.name)
          .limit(10)
      ]);

      return {
        transactions: transactionsResult,
        contacts: contactsResult,
        accounts: accountsResult,
        products: productsResult
      };
    } catch (error) {
      console.error(`Error performing global search:`, error);
      return {
        transactions: [],
        contacts: [],
        accounts: [],
        products: []
      };
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

  async getAllLedgerEntries(): Promise<any[]> {
    const result = await db
      .select({
        id: ledgerEntries.id,
        transactionId: ledgerEntries.transactionId,
        accountId: ledgerEntries.accountId,
        description: ledgerEntries.description,
        debit: ledgerEntries.debit,
        credit: ledgerEntries.credit,
        date: ledgerEntries.date,
        contactName: contacts.name,
        transactionType: transactions.type,
        referenceNumber: transactions.reference,
      })
      .from(ledgerEntries)
      .leftJoin(transactions, eq(ledgerEntries.transactionId, transactions.id))
      .leftJoin(contacts, eq(transactions.contactId, contacts.id))
      .orderBy(desc(ledgerEntries.date));
    return result;
  }

  // Company-scoped version of getAllLedgerEntries
  async getAllLedgerEntriesByCompany(companyId: number): Promise<any[]> {
    const result = await db
      .select({
        id: ledgerEntries.id,
        transactionId: ledgerEntries.transactionId,
        accountId: ledgerEntries.accountId,
        description: ledgerEntries.description,
        debit: ledgerEntries.debit,
        credit: ledgerEntries.credit,
        date: ledgerEntries.date,
        contactName: contacts.name,
        transactionType: transactions.type,
        referenceNumber: transactions.reference,
      })
      .from(ledgerEntries)
      .innerJoin(transactions, eq(ledgerEntries.transactionId, transactions.id))
      .leftJoin(contacts, eq(transactions.contactId, contacts.id))
      .where(eq(transactions.companyId, companyId))
      .orderBy(desc(ledgerEntries.date));
    return result;
  }

  async getLedgerEntriesUpToDate(asOfDate: Date): Promise<LedgerEntry[]> {
    const result = await db
      .select()
      .from(ledgerEntries)
      .where(lte(ledgerEntries.date, asOfDate))
      .orderBy(ledgerEntries.date);
    return result as LedgerEntry[];
  }

  // Company-scoped version of getLedgerEntriesUpToDate
  async getLedgerEntriesUpToDateByCompany(asOfDate: Date, companyId: number): Promise<LedgerEntry[]> {
    const result = await db
      .select({
        id: ledgerEntries.id,
        transactionId: ledgerEntries.transactionId,
        accountId: ledgerEntries.accountId,
        description: ledgerEntries.description,
        debit: ledgerEntries.debit,
        credit: ledgerEntries.credit,
        date: ledgerEntries.date,
        currency: ledgerEntries.currency,
        exchangeRate: ledgerEntries.exchangeRate,
        foreignAmount: ledgerEntries.foreignAmount,
      })
      .from(ledgerEntries)
      .innerJoin(transactions, eq(ledgerEntries.transactionId, transactions.id))
      .where(and(
        lte(ledgerEntries.date, asOfDate),
        eq(transactions.companyId, companyId)
      ))
      .orderBy(ledgerEntries.date);
    return result as LedgerEntry[];
  }

  async getLedgerEntriesByDateRange(startDate?: Date, endDate?: Date): Promise<any[]> {
    let conditions = [];

    if (startDate) {
      conditions.push(gte(ledgerEntries.date, startDate));
    }

    if (endDate) {
      conditions.push(lte(ledgerEntries.date, endDate));
    }

    const query = db
      .select({
        id: ledgerEntries.id,
        transactionId: ledgerEntries.transactionId,
        accountId: ledgerEntries.accountId,
        description: ledgerEntries.description,
        debit: ledgerEntries.debit,
        credit: ledgerEntries.credit,
        date: ledgerEntries.date,
        contactName: contacts.name,
        transactionType: transactions.type,
        referenceNumber: transactions.reference,
      })
      .from(ledgerEntries)
      .leftJoin(transactions, eq(ledgerEntries.transactionId, transactions.id))
      .leftJoin(contacts, eq(transactions.contactId, contacts.id));

    const finalQuery = conditions.length > 0
      ? query.where(and(...conditions))
      : query;

    const result = await finalQuery.orderBy(ledgerEntries.date);
    return result;
  }

  // Company-scoped version of getLedgerEntriesByDateRange
  async getLedgerEntriesByDateRangeAndCompany(startDate: Date | undefined, endDate: Date | undefined, companyId: number): Promise<any[]> {
    let conditions = [eq(transactions.companyId, companyId)];

    if (startDate) {
      conditions.push(gte(ledgerEntries.date, startDate));
    }

    if (endDate) {
      conditions.push(lte(ledgerEntries.date, endDate));
    }

    const result = await db
      .select({
        id: ledgerEntries.id,
        transactionId: ledgerEntries.transactionId,
        accountId: ledgerEntries.accountId,
        description: ledgerEntries.description,
        debit: ledgerEntries.debit,
        credit: ledgerEntries.credit,
        date: ledgerEntries.date,
        contactName: contacts.name,
        transactionType: transactions.type,
        referenceNumber: transactions.reference,
      })
      .from(ledgerEntries)
      .innerJoin(transactions, eq(ledgerEntries.transactionId, transactions.id))
      .leftJoin(contacts, eq(transactions.contactId, contacts.id))
      .where(and(...conditions))
      .orderBy(ledgerEntries.date);

    return result;
  }

  async getLedgerEntry(id: number): Promise<LedgerEntry | undefined> {
    const [entry] = await db.select().from(ledgerEntries).where(eq(ledgerEntries.id, id));
    return entry;
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

  async createPaymentApplication(application: { paymentId: number; invoiceId: number; amountApplied: number }): Promise<any> {
    const [newApplication] = await db.insert(paymentApplications).values(application).returning();
    return newApplication;
  }

  // Reports
  async getAccountBalances(companyId?: number): Promise<{ account: Account; balance: number }[]> {
    const allAccounts = await this.getAccounts(companyId);
    // Use company-scoped ledger entries if companyId is provided
    const allLedgerEntries = companyId
      ? await this.getAllLedgerEntriesByCompany(companyId)
      : await this.getAllLedgerEntries();

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
      const assetAndExpenseTypes = [
        'accounts_receivable',
        'current_assets',
        'bank',
        'property_plant_equipment',
        'long_term_assets',
        'cost_of_goods_sold',
        'expenses',
        'other_expense'
      ];

      if (assetAndExpenseTypes.includes(account.type)) {
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

  /**
   * Get Trial Balance - Shows actual ledger balances with proper Retained Earnings calculation.
   * 
   * ACCOUNTING RULES:
   * - Balance sheet accounts: sum all entries up to asOfDate
   * - Income statement accounts: sum entries from fiscalYearStartDate to asOfDate (current period only)
   * - Retained Earnings: actual ledger balance + all prior periods' net income
   *   (Prior periods = all P&L entries BEFORE fiscalYearStartDate)
   * 
   * This ensures Total Debits = Total Credits because:
   * - Prior period P&L is excluded from income/expense accounts
   * - But that same amount is added to Retained Earnings
   */
  async getTrialBalance(asOfDate: Date, fiscalYearStartDate: Date, companyId?: number): Promise<{
    account: Account;
    totalDebits: number;
    totalCredits: number;
    debitBalance: number;
    creditBalance: number;
  }[]> {
    const allAccounts = await this.getAccounts(companyId);
    const allLedgerEntries = companyId
      ? await this.getLedgerEntriesUpToDateByCompany(asOfDate, companyId)
      : await this.getLedgerEntriesUpToDate(asOfDate);
    
    // Helper to check if account is income statement type
    const isIncomeStatementAccount = (accountType: string): boolean => {
      return ['income', 'other_income', 'expenses', 'cost_of_goods_sold', 'other_expense'].includes(accountType);
    };
    
    // Find Retained Earnings account
    const retainedEarningsAccount = allAccounts.find(acc => 
      acc.code === '3100' || acc.code === '3900' || acc.name === 'Retained Earnings'
    );
    
    // Calculate all prior periods' net income (P&L entries BEFORE fiscalYearStartDate)
    // This is the amount that should be added to Retained Earnings for the Trial Balance
    let priorPeriodsNetIncomeCents = 0;
    
    allLedgerEntries.forEach(entry => {
      const account = allAccounts.find(a => a.id === entry.accountId);
      if (!account) return;
      
      const entryDate = new Date(entry.date);
      
      // Only count P&L entries from BEFORE the fiscal year start
      if (isIncomeStatementAccount(account.type) && entryDate < fiscalYearStartDate) {
        const debitCents = Math.round(Number(entry.debit) * 100);
        const creditCents = Math.round(Number(entry.credit) * 100);
        
        // Income accounts: net income = credits - debits
        if (account.type === 'income' || account.type === 'other_income') {
          priorPeriodsNetIncomeCents += creditCents - debitCents;
        }
        // Expense accounts: net expense = debits - credits (reduces net income)
        else {
          priorPeriodsNetIncomeCents -= (debitCents - creditCents);
        }
      }
    });
    
    // Sum debits and credits by account using integer arithmetic (cents) to avoid floating point errors
    const accountTotals = new Map<number, { debitsCents: number; creditsCents: number }>();
    
    allLedgerEntries.forEach(entry => {
      const account = allAccounts.find(a => a.id === entry.accountId);
      if (!account) return;
      
      const entryDate = new Date(entry.date);
      
      // For income statement accounts, only include entries from fiscal year start (current period)
      if (isIncomeStatementAccount(account.type)) {
        if (entryDate < fiscalYearStartDate) {
          return; // Skip entries before fiscal year start for income/expense accounts
        }
      }
      
      if (!accountTotals.has(entry.accountId)) {
        accountTotals.set(entry.accountId, { debitsCents: 0, creditsCents: 0 });
      }
      
      const totals = accountTotals.get(entry.accountId)!;
      totals.debitsCents += Math.round(Number(entry.debit) * 100);
      totals.creditsCents += Math.round(Number(entry.credit) * 100);
    });
    
    // Add prior periods' net income to Retained Earnings
    // This balances out the P&L entries we excluded from current period
    if (retainedEarningsAccount && priorPeriodsNetIncomeCents !== 0) {
      if (!accountTotals.has(retainedEarningsAccount.id)) {
        accountTotals.set(retainedEarningsAccount.id, { debitsCents: 0, creditsCents: 0 });
      }
      const reTotals = accountTotals.get(retainedEarningsAccount.id)!;
      
      // Prior net income is a credit to Retained Earnings (increases equity)
      // Prior net loss is a debit to Retained Earnings (decreases equity)
      if (priorPeriodsNetIncomeCents > 0) {
        reTotals.creditsCents += priorPeriodsNetIncomeCents;
      } else {
        reTotals.debitsCents += Math.abs(priorPeriodsNetIncomeCents);
      }
    }
    
    // Build result - show each account with its actual balance
    const result = allAccounts
      .map(account => {
        const totals = accountTotals.get(account.id) || { debitsCents: 0, creditsCents: 0 };
        const totalDebits = totals.debitsCents / 100;
        const totalCredits = totals.creditsCents / 100;
        const netCents = totals.debitsCents - totals.creditsCents;
        
        // Show net balance in appropriate column
        // Positive net (debits > credits) = debit balance
        // Negative net (credits > debits) = credit balance
        const debitBalance = netCents > 0 ? netCents / 100 : 0;
        const creditBalance = netCents < 0 ? Math.abs(netCents) / 100 : 0;
        
        return {
          account,
          totalDebits,
          totalCredits,
          debitBalance,
          creditBalance,
        };
      })
      .filter(item => item.debitBalance !== 0 || item.creditBalance !== 0);
    
    return result;
  }

  async getIncomeStatement(startDate?: Date, endDate?: Date, companyId?: number): Promise<{ revenues: number; expenses: number; netIncome: number }> {
    const accountBalances = await this.getAccountBalances(companyId);

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

  async getDashboardMetrics(companyId?: number) {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const previousMonthStart = startOfMonth(subMonths(now, 1));
    const previousMonthEnd = endOfMonth(subMonths(now, 1));

    // Get company-scoped accounts, ledger entries, and transactions
    const allAccounts = await this.getAccounts(companyId);
    const allLedgerEntries = companyId
      ? await this.getAllLedgerEntriesByCompany(companyId)
      : await this.getAllLedgerEntries();
    const allTransactions = await this.getTransactions(companyId);

    // Helper: Calculate income/expenses for a date range
    const calculateIncomeExpenses = (startDate: Date, endDate: Date) => {
      const relevantEntries = allLedgerEntries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= startDate && entryDate <= endDate;
      });

      let income = 0;
      let expenses = 0;

      relevantEntries.forEach(entry => {
        const account = allAccounts.find(a => a.id === entry.accountId);
        if (!account) return;

        if (account.type === 'income' || account.type === 'other_income') {
          income += entry.credit - entry.debit;
        } else if (account.type === 'expenses' || account.type === 'cost_of_goods_sold' || account.type === 'other_expense') {
          expenses += entry.debit - entry.credit;
        }
      });

      return { income, expenses, netProfit: income - expenses };
    };

    // Calculate current and previous month profit/loss
    const currentMonth = calculateIncomeExpenses(currentMonthStart, currentMonthEnd);
    const previousMonth = calculateIncomeExpenses(previousMonthStart, previousMonthEnd);

    // Calculate percentage change
    const percentageChange = previousMonth.netProfit === 0 
      ? 0 
      : ((currentMonth.netProfit - previousMonth.netProfit) / Math.abs(previousMonth.netProfit)) * 100;

    // Group expenses by category (account name)
    const expensesByCategory: Array<{ category: string; amount: number }> = [];
    const expenseMap = new Map<number, number>();

    allLedgerEntries
      .filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= currentMonthStart && entryDate <= currentMonthEnd;
      })
      .forEach(entry => {
        const account = allAccounts.find(a => a.id === entry.accountId);
        if (!account) return;
        if (account.type === 'expenses' || account.type === 'cost_of_goods_sold' || account.type === 'other_expense') {
          const amount = entry.debit - entry.credit;
          expenseMap.set(account.id, (expenseMap.get(account.id) || 0) + amount);
        }
      });

    expenseMap.forEach((amount, accountId) => {
      const account = allAccounts.find(a => a.id === accountId);
      if (account && amount > 0) {
        expensesByCategory.push({ category: account.name, amount });
      }
    });

    // Calculate invoice statistics
    const invoiceTransactions = allTransactions.filter(t => t.type === 'invoice');
    const today = now;

    const invoiceStats = {
      unpaid: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
      overdue: { count: 0, amount: 0 },
      deposited: { count: 0, amount: 0 }
    };

    invoiceTransactions.forEach(invoice => {
      const balance = invoice.balance !== null && invoice.balance !== undefined ? invoice.balance : invoice.amount;
      
      if (invoice.status === 'paid') {
        invoiceStats.paid.count++;
        invoiceStats.paid.amount += invoice.amount;
      } else if (invoice.status === 'unapplied_credit') {
        invoiceStats.deposited.count++;
        invoiceStats.deposited.amount += Math.abs(balance);
      } else {
        const isOverdue = invoice.dueDate && new Date(invoice.dueDate) < today;

        // Fixed operator precedence: invoice is overdue if due date is past AND status is open/partial/overdue
        if (isOverdue && (invoice.status === 'open' || invoice.status === 'partial' || invoice.status === 'overdue')) {
          invoiceStats.overdue.count++;
          invoiceStats.overdue.amount += balance;
        }
        
        if (invoice.status === 'open' || invoice.status === 'partial' || invoice.status === 'overdue') {
          invoiceStats.unpaid.count++;
          invoiceStats.unpaid.amount += balance;
        }
      }
    });

    // Get bank account balances
    const bankAccounts = allAccounts.filter(a => a.type === 'bank');
    const bankAccountBalances = await Promise.all(
      bankAccounts.map(async (account) => {
        const entries = allLedgerEntries.filter(e => e.accountId === account.id);
        const balance = entries.reduce((sum, entry) => sum + entry.debit - entry.credit, 0);
        const lastEntry = entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        
        return {
          name: account.name,
          balance,
          updated: lastEntry ? format(new Date(lastEntry.date), 'MMM d, yyyy') : 'Never'
        };
      })
    );

    const totalBankBalance = bankAccountBalances.reduce((sum, acc) => sum + acc.balance, 0);

    // Calculate monthly sales for last 12 months
    const sales: Array<{ month: string; amount: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const monthInvoices = invoiceTransactions.filter(inv => {
        const invDate = new Date(inv.date);
        return invDate >= monthStart && invDate <= monthEnd;
      });
      
      const monthAmount = monthInvoices.reduce((sum, inv) => sum + inv.amount, 0);
      
      sales.push({
        month: format(monthDate, 'MMM yyyy'),
        amount: monthAmount
      });
    }

    // Calculate Accounts Receivable aging
    const arAgingBuckets = {
      total: 0,
      current: 0,
      days30: 0,
      days60: 0,
      days90Plus: 0
    };

    invoiceTransactions.forEach(invoice => {
      if (invoice.status === 'paid' || invoice.status === 'cancelled') return;
      
      const balance = invoice.balance !== null && invoice.balance !== undefined ? invoice.balance : invoice.amount;
      arAgingBuckets.total += balance;
      
      if (!invoice.dueDate) {
        arAgingBuckets.current += balance;
        return;
      }
      
      const daysOverdue = differenceInDays(today, new Date(invoice.dueDate));
      
      if (daysOverdue <= 0) {
        arAgingBuckets.current += balance;
      } else if (daysOverdue <= 30) {
        arAgingBuckets.current += balance;
      } else if (daysOverdue <= 60) {
        arAgingBuckets.days30 += balance;
      } else if (daysOverdue <= 90) {
        arAgingBuckets.days60 += balance;
      } else {
        arAgingBuckets.days90Plus += balance;
      }
    });

    return {
      profitLoss: {
        netProfit: currentMonth.netProfit,
        percentageChange: Math.round(percentageChange * 10) / 10,
        income: currentMonth.income,
        expenses: currentMonth.expenses
      },
      expensesByCategory,
      invoices: invoiceStats,
      bankAccounts: {
        total: totalBankBalance,
        accounts: bankAccountBalances
      },
      sales,
      accountsReceivable: arAgingBuckets
    };
  }

  async getBalanceSheet(companyId?: number): Promise<{ assets: number; liabilities: number; equity: number }> {
    const accountBalances = await this.getAccountBalances(companyId);
    
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

  async getCashFlowStatement(startDate?: Date, endDate?: Date, companyId?: number): Promise<{
    period: { startDate: Date | null; endDate: Date | null };
    categories: {
      operating: { total: number; accounts: Array<{ account: Account; amount: number }> };
      investing: { total: number; accounts: Array<{ account: Account; amount: number }> };
      financing: { total: number; accounts: Array<{ account: Account; amount: number }> };
    };
    netChange: number;
    openingCash: number;
    closingCash: number;
  }> {
    // Get all accounts (company-scoped)
    const allAccounts = await this.getAccounts(companyId);
    const accountMap = new Map(allAccounts.map(acc => [acc.id, acc]));

    // Identify cash accounts (bank type)
    const cashAccounts = allAccounts.filter(acc => acc.type === 'bank');
    const cashAccountIds = new Set(cashAccounts.map(acc => acc.id));

    // Get ledger entries for the date range (company-scoped)
    const entries = companyId
      ? await this.getLedgerEntriesByDateRangeAndCompany(startDate, endDate, companyId)
      : await this.getLedgerEntriesByDateRange(startDate, endDate);
    
    // Group entries by transaction ID for efficient lookup
    const entriesByTransaction = new Map<number, LedgerEntry[]>();
    for (const entry of entries) {
      if (!entriesByTransaction.has(entry.transactionId)) {
        entriesByTransaction.set(entry.transactionId, []);
      }
      entriesByTransaction.get(entry.transactionId)!.push(entry);
    }
    
    // Group cash flows by category and account
    const cashFlowsByCategory = {
      operating: new Map<number, number>(),
      investing: new Map<number, number>(),
      financing: new Map<number, number>()
    };
    
    // Process each transaction once
    for (const [transactionId, transactionEntries] of entriesByTransaction) {
      // Identify cash and non-cash entries in this transaction
      const cashEntries = transactionEntries.filter(e => cashAccountIds.has(e.accountId));
      const nonCashEntries = transactionEntries.filter(e => !cashAccountIds.has(e.accountId));
      
      // Skip if no cash movement
      if (cashEntries.length === 0) continue;
      
      // Calculate net cash effect (debits increase cash, credits decrease cash)
      const netCashDelta = cashEntries.reduce((sum, e) => sum + e.debit - e.credit, 0);
      
      // Skip if net cash delta is very close to zero
      if (Math.abs(netCashDelta) < 0.001) continue;
      
      // If all non-cash accounts lack categories, this is likely a bank-to-bank transfer
      // or uncategorized transaction - we need to decide how to handle it
      const categorizedNonCashEntries = nonCashEntries.filter(e => {
        const account = accountMap.get(e.accountId);
        return account && account.cashFlowCategory && account.cashFlowCategory !== 'none';
      });
      
      if (categorizedNonCashEntries.length === 0 && nonCashEntries.length > 0) {
        // All non-cash entries are uncategorized - skip this transaction
        // In a real system, you might want to flag these for review
        continue;
      }
      
      // Calculate total absolute value of categorized non-cash entries to use for proportional allocation
      const totalCategorizedAmount = categorizedNonCashEntries.reduce((sum, e) => 
        sum + Math.abs(e.debit - e.credit), 0
      );
      
      if (totalCategorizedAmount === 0) continue;
      
      // Distribute net cash delta proportionally across categorized non-cash accounts
      for (const nonCashEntry of categorizedNonCashEntries) {
        const account = accountMap.get(nonCashEntry.accountId);
        if (!account || !account.cashFlowCategory || account.cashFlowCategory === 'none') continue;
        
        const category = account.cashFlowCategory as 'operating' | 'investing' | 'financing';
        
        // Calculate this entry's proportion of the total categorized amount
        const entryAmount = Math.abs(nonCashEntry.debit - nonCashEntry.credit);
        const proportion = entryAmount / totalCategorizedAmount;
        
        // Allocate proportional share of net cash delta
        // The cash delta already has the correct sign (positive = cash inflow, negative = cash outflow)
        // We just need to distribute it proportionally
        const allocatedCashDelta = netCashDelta * proportion;
        
        // Accumulate in the category map
        const currentAmount = cashFlowsByCategory[category].get(nonCashEntry.accountId) || 0;
        cashFlowsByCategory[category].set(nonCashEntry.accountId, currentAmount + allocatedCashDelta);
      }
    }
    
    // Build the result structure
    const buildCategoryResult = (categoryMap: Map<number, number>) => {
      const accounts: Array<{ account: Account; amount: number }> = [];
      let total = 0;
      
      for (const [accountId, amount] of categoryMap.entries()) {
        const account = accountMap.get(accountId);
        if (account) {
          accounts.push({ account, amount });
          total += amount;
        }
      }
      
      // Sort by account code (handle null codes)
      accounts.sort((a, b) => (a.account.code || '').localeCompare(b.account.code || ''));
      
      return { total, accounts };
    };
    
    const categories = {
      operating: buildCategoryResult(cashFlowsByCategory.operating),
      investing: buildCategoryResult(cashFlowsByCategory.investing),
      financing: buildCategoryResult(cashFlowsByCategory.financing)
    };
    
    // Calculate net change from actual cash movements in the date range
    const netChange = entries
      .filter(e => cashAccountIds.has(e.accountId))
      .reduce((sum, e) => sum + e.debit - e.credit, 0);
    
    // Calculate opening cash balance (all cash account balances before startDate)
    let openingCash = 0;
    if (startDate) {
      const openingEntries = await this.getLedgerEntriesUpToDate(new Date(startDate.getTime() - 1));
      openingCash = openingEntries
        .filter(e => cashAccountIds.has(e.accountId))
        .reduce((sum, e) => sum + e.debit - e.credit, 0);
    }
    
    const closingCash = openingCash + netChange;
    
    return {
      period: { startDate: startDate || null, endDate: endDate || null },
      categories,
      netChange,
      openingCash,
      closingCash
    };
  }

  async calculatePriorYearsRetainedEarnings(asOfDate: Date, fiscalYearStartMonth: number, companyId?: number): Promise<number> {
    const { fiscalYearStart } = getFiscalYearBounds(asOfDate, fiscalYearStartMonth);

    // Build conditions array
    const conditions = [
      lt(ledgerEntries.date, fiscalYearStart),
      or(
        eq(accounts.type, 'income'),
        eq(accounts.type, 'other_income'),
        eq(accounts.type, 'expenses'),
        eq(accounts.type, 'cost_of_goods_sold'),
        eq(accounts.type, 'other_expense')
      )
    ];

    // Add company filter if companyId provided (join through transactions)
    if (companyId) {
      conditions.push(eq(transactions.companyId, companyId));
    }

    const query = companyId
      ? db
          .select({
            accountType: accounts.type,
            totalDebit: sql<number>`COALESCE(SUM(${ledgerEntries.debit}), 0)`,
            totalCredit: sql<number>`COALESCE(SUM(${ledgerEntries.credit}), 0)`,
          })
          .from(ledgerEntries)
          .innerJoin(accounts, eq(ledgerEntries.accountId, accounts.id))
          .innerJoin(transactions, eq(ledgerEntries.transactionId, transactions.id))
          .where(and(...conditions))
          .groupBy(accounts.type)
      : db
          .select({
            accountType: accounts.type,
            totalDebit: sql<number>`COALESCE(SUM(${ledgerEntries.debit}), 0)`,
            totalCredit: sql<number>`COALESCE(SUM(${ledgerEntries.credit}), 0)`,
          })
          .from(ledgerEntries)
          .innerJoin(accounts, eq(ledgerEntries.accountId, accounts.id))
          .where(
            and(
              lt(ledgerEntries.date, fiscalYearStart),
              or(
                eq(accounts.type, 'income'),
                eq(accounts.type, 'other_income'),
                eq(accounts.type, 'expenses'),
                eq(accounts.type, 'cost_of_goods_sold'),
                eq(accounts.type, 'other_expense')
              )
            )
          )
          .groupBy(accounts.type);

    const result = await query;

    let revenues = 0;
    let expenses = 0;

    for (const row of result) {
      const debit = Number(row.totalDebit) || 0;
      const credit = Number(row.totalCredit) || 0;

      if (row.accountType === 'income' || row.accountType === 'other_income') {
        revenues += credit - debit;
      } else if (
        row.accountType === 'expenses' || 
        row.accountType === 'cost_of_goods_sold' || 
        row.accountType === 'other_expense'
      ) {
        expenses += debit - credit;
      }
    }

    return revenues - expenses;
  }

  async calculateCurrentYearNetIncome(asOfDate: Date, fiscalYearStartMonth: number, companyId?: number): Promise<number> {
    const { fiscalYearStart } = getFiscalYearBounds(asOfDate, fiscalYearStartMonth);

    // Build conditions array
    const baseConditions = [
      gte(ledgerEntries.date, fiscalYearStart),
      lte(ledgerEntries.date, asOfDate),
      or(
        eq(accounts.type, 'income'),
        eq(accounts.type, 'other_income'),
        eq(accounts.type, 'expenses'),
        eq(accounts.type, 'cost_of_goods_sold'),
        eq(accounts.type, 'other_expense')
      )
    ];

    const query = companyId
      ? db
          .select({
            accountType: accounts.type,
            totalDebit: sql<number>`COALESCE(SUM(${ledgerEntries.debit}), 0)`,
            totalCredit: sql<number>`COALESCE(SUM(${ledgerEntries.credit}), 0)`,
          })
          .from(ledgerEntries)
          .innerJoin(accounts, eq(ledgerEntries.accountId, accounts.id))
          .innerJoin(transactions, eq(ledgerEntries.transactionId, transactions.id))
          .where(and(...baseConditions, eq(transactions.companyId, companyId)))
          .groupBy(accounts.type)
      : db
          .select({
            accountType: accounts.type,
            totalDebit: sql<number>`COALESCE(SUM(${ledgerEntries.debit}), 0)`,
            totalCredit: sql<number>`COALESCE(SUM(${ledgerEntries.credit}), 0)`,
          })
          .from(ledgerEntries)
          .innerJoin(accounts, eq(ledgerEntries.accountId, accounts.id))
          .where(and(...baseConditions))
          .groupBy(accounts.type);

    const result = await query;

    let revenues = 0;
    let expenses = 0;

    for (const row of result) {
      const debit = Number(row.totalDebit) || 0;
      const credit = Number(row.totalCredit) || 0;

      if (row.accountType === 'income' || row.accountType === 'other_income') {
        revenues += credit - debit;
      } else if (
        row.accountType === 'expenses' || 
        row.accountType === 'cost_of_goods_sold' || 
        row.accountType === 'other_expense'
      ) {
        expenses += debit - credit;
      }
    }

    return revenues - expenses;
  }

  // Sales Taxes
  async getSalesTaxes(companyId?: number): Promise<SalesTax[]> {
    if (companyId) {
      return await db.select().from(salesTaxSchema)
        .where(eq(salesTaxSchema.companyId, companyId))
        .orderBy(salesTaxSchema.name);
    }
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
  async getProducts(companyId?: number): Promise<Product[]> {
    if (companyId) {
      return await db.select().from(productsSchema)
        .where(eq(productsSchema.companyId, companyId))
        .orderBy(productsSchema.name);
    }
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

  async getCompanyByCode(code: string): Promise<Company | undefined> {
    const result = await db.select().from(companiesSchema).where(eq(companiesSchema.companyCode, code));
    return result[0];
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const { generateUniqueCompanyCode } = await import('./utils/company-code');
    
    const companyCode = await generateUniqueCompanyCode(async (code) => {
      const existing = await this.getCompanyByCode(code);
      return !!existing;
    });
    
    const [newCompany] = await db.insert(companiesSchema).values({
      ...company,
      companyCode,
    }).returning();
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

  // User Preferences (company-scoped for multi-tenant isolation)
  async getPreferences(companyId?: number): Promise<Preferences | undefined> {
    if (companyId) {
      // Get company-specific preferences
      const result = await db.select().from(preferencesSchema)
        .where(eq(preferencesSchema.companyId, companyId));
      if (result[0]) {
        return result[0];
      }
      // Fall back to global preferences if no company-specific ones exist
    }
    // Get global preferences (legacy behavior or fallback)
    const result = await db.select().from(preferencesSchema)
      .where(sql`${preferencesSchema.companyId} IS NULL`);
    return result[0];
  }

  async savePreferences(preferences: InsertPreferences, companyId?: number): Promise<Preferences> {
    // Check if preferences already exist for this company
    const existing = await this.getPreferences(companyId);

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
      // Create new preferences with company scope
      const [newPreferences] = await db.insert(preferencesSchema)
        .values({
          ...preferences,
          companyId: companyId || null,
          updatedAt: new Date()
        })
        .returning();
      return newPreferences;
    }
  }

  async updatePreferences(updates: Partial<InsertPreferences>, companyId?: number): Promise<Preferences> {
    // Ensure AI settings columns exist (inline migration for immediate availability)
    const hasAiFields = 'aiCategorizationEnabled' in updates ||
                        'aiAutoPostEnabled' in updates ||
                        'aiAutoPostMinConfidence' in updates ||
                        'aiRuleGenerationEnabled' in updates;

    if (hasAiFields) {
      try {
        // Add AI columns if they don't exist
        await db.execute(sql`
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'preferences' AND column_name = 'ai_categorization_enabled') THEN
              ALTER TABLE preferences ADD COLUMN ai_categorization_enabled BOOLEAN NOT NULL DEFAULT true;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'preferences' AND column_name = 'ai_auto_post_enabled') THEN
              ALTER TABLE preferences ADD COLUMN ai_auto_post_enabled BOOLEAN NOT NULL DEFAULT false;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'preferences' AND column_name = 'ai_auto_post_min_confidence') THEN
              ALTER TABLE preferences ADD COLUMN ai_auto_post_min_confidence DECIMAL(3, 2) NOT NULL DEFAULT 0.95;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'preferences' AND column_name = 'ai_rule_generation_enabled') THEN
              ALTER TABLE preferences ADD COLUMN ai_rule_generation_enabled BOOLEAN NOT NULL DEFAULT true;
            END IF;
          END $$;
        `);
      } catch (migrationError) {
        console.error('Warning: Could not ensure AI columns exist:', migrationError);
      }
    }

    // Check if preferences already exist for this company
    const existing = await this.getPreferences(companyId);

    if (existing) {
      // Update existing preferences with only the provided fields
      const [updated] = await db.update(preferencesSchema)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(preferencesSchema.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new preferences with defaults + updates and company scope
      const [newPreferences] = await db.insert(preferencesSchema)
        .values({
          ...updates,
          companyId: companyId || null,
          updatedAt: new Date()
        })
        .returning();
      return newPreferences;
    }
  }

  // User Management Methods
  async getUsers(filters?: { companyId?: number; firmId?: number; includeInactive?: boolean }): Promise<User[]> {
    let query = db.select().from(usersSchema);

    const conditions = [];
    if (filters?.companyId) {
      conditions.push(eq(usersSchema.companyId, filters.companyId));
    }
    if (filters?.firmId) {
      conditions.push(eq(usersSchema.firmId, filters.firmId));
    }
    if (!filters?.includeInactive) {
      conditions.push(eq(usersSchema.isActive, true));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query;
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

  async updateUserCompanyPrimary(userId: number, companyId: number, isPrimary: boolean): Promise<UserCompany | undefined> {
    const [updatedUserCompany] = await db.update(userCompaniesSchema)
      .set({ isPrimary })
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
      .where(eq(rolePermissionsSchema.role, role as "admin" | "staff" | "read_only" | "accountant"));
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
            eq(rolePermissionsSchema.role, role as "admin" | "staff" | "read_only" | "accountant"),
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

  // Bank Connections
  async getBankConnections(companyId?: number): Promise<BankConnection[]> {
    if (companyId) {
      return await db.select()
        .from(bankConnectionsSchema)
        .where(eq(bankConnectionsSchema.companyId, companyId))
        .orderBy(desc(bankConnectionsSchema.createdAt));
    }
    return await db.select().from(bankConnectionsSchema).orderBy(desc(bankConnectionsSchema.createdAt));
  }

  async getBankConnection(id: number): Promise<BankConnection | undefined> {
    const result = await db.select().from(bankConnectionsSchema).where(eq(bankConnectionsSchema.id, id));
    return result[0];
  }

  async getBankConnectionByItemId(itemId: string): Promise<BankConnection | undefined> {
    const result = await db.select().from(bankConnectionsSchema).where(eq(bankConnectionsSchema.itemId, itemId));
    return result[0];
  }

  async createBankConnection(connection: InsertBankConnection): Promise<BankConnection> {
    const [newConnection] = await db.insert(bankConnectionsSchema)
      .values(connection)
      .returning();
    return newConnection;
  }

  async updateBankConnection(id: number, connection: Partial<BankConnection>): Promise<BankConnection | undefined> {
    const [updatedConnection] = await db.update(bankConnectionsSchema)
      .set(connection)
      .where(eq(bankConnectionsSchema.id, id))
      .returning();
    return updatedConnection;
  }

  async deleteBankConnection(id: number): Promise<boolean> {
    try {
      // First delete all related bank accounts and their transactions
      const relatedAccounts = await db.select()
        .from(bankAccountsSchema)
        .where(eq(bankAccountsSchema.connectionId, id));
      
      for (const account of relatedAccounts) {
        await db.delete(importedTransactionsSchema)
          .where(eq(importedTransactionsSchema.bankAccountId, account.id));
      }
      
      await db.delete(bankAccountsSchema)
        .where(eq(bankAccountsSchema.connectionId, id));
      
      const result = await db.delete(bankConnectionsSchema)
        .where(eq(bankConnectionsSchema.id, id));
      
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error(`Error deleting bank connection with ID ${id}:`, error);
      return false;
    }
  }

  // Bank Accounts
  async getBankAccounts(): Promise<BankAccount[]> {
    return await db.select().from(bankAccountsSchema).orderBy(bankAccountsSchema.name);
  }

  async getBankAccount(id: number): Promise<BankAccount | undefined> {
    const result = await db.select().from(bankAccountsSchema).where(eq(bankAccountsSchema.id, id));
    return result[0];
  }

  async getBankAccountsByConnectionId(connectionId: number): Promise<BankAccount[]> {
    return await db.select()
      .from(bankAccountsSchema)
      .where(eq(bankAccountsSchema.connectionId, connectionId))
      .orderBy(bankAccountsSchema.name);
  }

  async getBankAccountByPlaidId(plaidAccountId: string): Promise<BankAccount | undefined> {
    const result = await db.select()
      .from(bankAccountsSchema)
      .where(eq(bankAccountsSchema.plaidAccountId, plaidAccountId));
    return result[0];
  }

  async createBankAccount(account: InsertBankAccount): Promise<BankAccount> {
    const [newAccount] = await db.insert(bankAccountsSchema)
      .values(account)
      .returning();
    return newAccount;
  }

  async updateBankAccount(id: number, account: Partial<BankAccount>): Promise<BankAccount | undefined> {
    const [updatedAccount] = await db.update(bankAccountsSchema)
      .set(account)
      .where(eq(bankAccountsSchema.id, id))
      .returning();
    return updatedAccount;
  }

  async deleteBankAccount(id: number): Promise<boolean> {
    try {
      // First delete all related imported transactions
      await db.delete(importedTransactionsSchema)
        .where(eq(importedTransactionsSchema.bankAccountId, id));
      
      const result = await db.delete(bankAccountsSchema)
        .where(eq(bankAccountsSchema.id, id));
      
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error(`Error deleting bank account with ID ${id}:`, error);
      return false;
    }
  }

  // Imported Transactions
  async getImportedTransactions(companyId?: number): Promise<ImportedTransaction[]> {
    if (companyId) {
      return await db.select()
        .from(importedTransactionsSchema)
        .where(eq(importedTransactionsSchema.companyId, companyId))
        .orderBy(desc(importedTransactionsSchema.date));
    }
    return await db.select().from(importedTransactionsSchema).orderBy(desc(importedTransactionsSchema.date));
  }

  async getImportedTransaction(id: number): Promise<ImportedTransaction | undefined> {
    const result = await db.select().from(importedTransactionsSchema).where(eq(importedTransactionsSchema.id, id));
    return result[0];
  }

  async getImportedTransactionsByBankAccount(bankAccountId: number): Promise<ImportedTransaction[]> {
    return await db.select()
      .from(importedTransactionsSchema)
      .where(eq(importedTransactionsSchema.bankAccountId, bankAccountId))
      .orderBy(desc(importedTransactionsSchema.date));
  }

  async getImportedTransactionByPlaidId(plaidTransactionId: string): Promise<ImportedTransaction | undefined> {
    const result = await db.select()
      .from(importedTransactionsSchema)
      .where(eq(importedTransactionsSchema.plaidTransactionId, plaidTransactionId));
    return result[0];
  }

  async getUnmatchedImportedTransactions(companyId?: number): Promise<ImportedTransaction[]> {
    const conditions = [eq(importedTransactionsSchema.status, 'unmatched')];
    if (companyId) {
      conditions.push(eq(importedTransactionsSchema.companyId, companyId));
    }
    return await db.select()
      .from(importedTransactionsSchema)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(desc(importedTransactionsSchema.date));
  }

  async createImportedTransaction(transaction: InsertImportedTransaction): Promise<ImportedTransaction> {
    const [newTransaction] = await db.insert(importedTransactionsSchema)
      .values(transaction)
      .returning();
    return newTransaction;
  }

  async updateImportedTransaction(id: number, transaction: Partial<ImportedTransaction>): Promise<ImportedTransaction | undefined> {
    const [updatedTransaction] = await db.update(importedTransactionsSchema)
      .set(transaction)
      .where(eq(importedTransactionsSchema.id, id))
      .returning();
    return updatedTransaction;
  }

  async deleteImportedTransaction(id: number): Promise<boolean> {
    try {
      const result = await db.delete(importedTransactionsSchema)
        .where(eq(importedTransactionsSchema.id, id));
      
      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      console.error(`Error deleting imported transaction with ID ${id}:`, error);
      return false;
    }
  }

  // CSV Mapping Preferences
  async getCsvMappingPreference(userId: number, accountId: number): Promise<CsvMappingPreference | undefined> {
    const result = await db.select()
      .from(csvMappingPreferencesSchema)
      .where(
        and(
          eq(csvMappingPreferencesSchema.userId, userId),
          eq(csvMappingPreferencesSchema.accountId, accountId)
        )
      )
      .orderBy(desc(csvMappingPreferencesSchema.updatedAt))
      .limit(1);
    
    return result[0];
  }

  async createCsvMappingPreference(preference: InsertCsvMappingPreference): Promise<CsvMappingPreference> {
    const [newPreference] = await db.insert(csvMappingPreferencesSchema)
      .values(preference)
      .returning();
    return newPreference;
  }

  async updateCsvMappingPreference(id: number, preference: Partial<InsertCsvMappingPreference>): Promise<CsvMappingPreference> {
    const [updatedPreference] = await db.update(csvMappingPreferencesSchema)
      .set({ ...preference, updatedAt: new Date() })
      .where(eq(csvMappingPreferencesSchema.id, id))
      .returning();
    return updatedPreference;
  }

  async bulkCreateImportedTransactions(transactions: InsertImportedTransaction[]): Promise<ImportedTransaction[]> {
    if (transactions.length === 0) {
      return [];
    }
    
    const newTransactions = await db.insert(importedTransactionsSchema)
      .values(transactions)
      .returning();
    
    return newTransactions;
  }

  // Reconciliations
  async getReconciliations(): Promise<Reconciliation[]> {
    return await db.select()
      .from(reconciliations)
      .orderBy(desc(reconciliations.createdAt));
  }

  async getReconciliation(id: number): Promise<Reconciliation | undefined> {
    const result = await db.select()
      .from(reconciliations)
      .where(eq(reconciliations.id, id));
    return result[0];
  }

  async getReconciliationsByAccount(accountId: number): Promise<Reconciliation[]> {
    return await db.select()
      .from(reconciliations)
      .where(eq(reconciliations.accountId, accountId))
      .orderBy(desc(reconciliations.createdAt));
  }

  async createReconciliation(reconciliation: InsertReconciliation): Promise<Reconciliation> {
    const [newReconciliation] = await db.insert(reconciliations)
      .values(reconciliation)
      .returning();
    return newReconciliation;
  }

  async updateReconciliation(id: number, reconciliationUpdate: Partial<Reconciliation>): Promise<Reconciliation | undefined> {
    const [updatedReconciliation] = await db.update(reconciliations)
      .set(reconciliationUpdate)
      .where(eq(reconciliations.id, id))
      .returning();
    return updatedReconciliation;
  }

  async deleteReconciliation(id: number): Promise<boolean> {
    try {
      return await db.transaction(async (tx) => {
        // First, delete all related reconciliation items
        await tx.delete(reconciliationItems)
          .where(eq(reconciliationItems.reconciliationId, id));
        
        // Then delete the reconciliation itself
        const result = await tx.delete(reconciliations)
          .where(eq(reconciliations.id, id));
        
        return result.rowCount !== null && result.rowCount > 0;
      });
    } catch (error) {
      console.error(`Error deleting reconciliation with ID ${id}:`, error);
      return false;
    }
  }

  async getLedgerEntriesForReconciliation(accountId: number, statementDate: Date): Promise<LedgerEntry[]> {
    return await db.select()
      .from(ledgerEntries)
      .where(
        and(
          eq(ledgerEntries.accountId, accountId),
          lte(ledgerEntries.date, statementDate)
        )
      )
      .orderBy(ledgerEntries.date);
  }

  // Reconciliation Items
  async getReconciliationItems(reconciliationId: number): Promise<ReconciliationItem[]> {
    return await db.select()
      .from(reconciliationItems)
      .where(eq(reconciliationItems.reconciliationId, reconciliationId));
  }

  async createReconciliationItem(item: InsertReconciliationItem): Promise<ReconciliationItem> {
    const [newItem] = await db.insert(reconciliationItems)
      .values(item)
      .returning();
    return newItem;
  }

  async updateReconciliationItem(id: number, itemUpdate: Partial<ReconciliationItem>): Promise<ReconciliationItem | undefined> {
    const [updatedItem] = await db.update(reconciliationItems)
      .set(itemUpdate)
      .where(eq(reconciliationItems.id, id))
      .returning();
    return updatedItem;
  }

  async bulkUpsertReconciliationItems(reconciliationId: number, ledgerEntryIds: number[], isCleared: boolean): Promise<void> {
    await db.transaction(async (tx) => {
      // Delete existing reconciliation items for these ledger entries
      if (ledgerEntryIds.length > 0) {
        await tx.delete(reconciliationItems)
          .where(
            and(
              eq(reconciliationItems.reconciliationId, reconciliationId),
              inArray(reconciliationItems.ledgerEntryId, ledgerEntryIds)
            )
          );

        // Insert new reconciliation items
        const items = ledgerEntryIds.map(ledgerEntryId => ({
          reconciliationId,
          ledgerEntryId,
          isCleared
        }));

        await tx.insert(reconciliationItems).values(items);
      }
    });
  }

  // Get in-progress reconciliation for an account (for resume feature)
  async getInProgressReconciliation(accountId: number): Promise<Reconciliation | undefined> {
    const result = await db.select()
      .from(reconciliations)
      .where(
        and(
          eq(reconciliations.accountId, accountId),
          eq(reconciliations.status, 'in_progress')
        )
      )
      .orderBy(desc(reconciliations.createdAt))
      .limit(1);
    return result[0];
  }

  // Get last completed reconciliation for an account
  async getLastCompletedReconciliation(accountId: number): Promise<Reconciliation | undefined> {
    const result = await db.select()
      .from(reconciliations)
      .where(
        and(
          eq(reconciliations.accountId, accountId),
          eq(reconciliations.status, 'completed')
        )
      )
      .orderBy(desc(reconciliations.completedAt))
      .limit(1);
    return result[0];
  }

  // Get reconciliation history for an account (completed ones)
  async getReconciliationHistory(accountId: number, limit: number = 50): Promise<Reconciliation[]> {
    return await db.select()
      .from(reconciliations)
      .where(
        and(
          eq(reconciliations.accountId, accountId),
          eq(reconciliations.status, 'completed')
        )
      )
      .orderBy(desc(reconciliations.completedAt))
      .limit(limit);
  }

  // Undo a completed reconciliation (revert to in_progress)
  async undoReconciliation(id: number): Promise<Reconciliation | undefined> {
    // First check if this is the most recent completed reconciliation for the account
    const reconciliation = await this.getReconciliation(id);
    if (!reconciliation || reconciliation.status !== 'completed') {
      return undefined;
    }

    // Check if there's a newer completed reconciliation
    const newerReconciliations = await db.select()
      .from(reconciliations)
      .where(
        and(
          eq(reconciliations.accountId, reconciliation.accountId),
          eq(reconciliations.status, 'completed'),
          gt(reconciliations.completedAt, reconciliation.completedAt!)
        )
      )
      .limit(1);

    if (newerReconciliations.length > 0) {
      throw new Error('Cannot undo: there are newer completed reconciliations');
    }

    // Revert the reconciliation status
    const [updatedReconciliation] = await db.update(reconciliations)
      .set({
        status: 'in_progress',
        completedAt: null,
      })
      .where(eq(reconciliations.id, id))
      .returning();

    // Update the account's last reconciled info to the previous reconciliation
    const previousCompleted = await this.getLastCompletedReconciliation(reconciliation.accountId);
    if (previousCompleted) {
      await db.update(accounts)
        .set({
          lastReconciledDate: previousCompleted.statementDate,
          lastReconciledBalance: previousCompleted.statementEndingBalance,
        })
        .where(eq(accounts.id, reconciliation.accountId));
    } else {
      // No previous reconciliation, clear the last reconciled info
      await db.update(accounts)
        .set({
          lastReconciledDate: null,
          lastReconciledBalance: 0,
        })
        .where(eq(accounts.id, reconciliation.accountId));
    }

    return updatedReconciliation;
  }

  // Update account's last reconciled info
  async updateAccountLastReconciled(accountId: number, date: Date, balance: number): Promise<void> {
    await db.update(accounts)
      .set({
        lastReconciledDate: date,
        lastReconciledBalance: balance,
      })
      .where(eq(accounts.id, accountId));
  }

  // Find ledger entries matching specific amounts (for auto-matching feature)
  async findLedgerEntriesByAmounts(accountId: number, amounts: number[], tolerance: number = 0.01): Promise<LedgerEntry[]> {
    // Get all ledger entries for the account
    const entries = await db.select()
      .from(ledgerEntries)
      .where(eq(ledgerEntries.accountId, accountId))
      .orderBy(ledgerEntries.date);

    // Filter entries that match any of the amounts within tolerance
    return entries.filter(entry => {
      const entryAmount = entry.debit - entry.credit;
      return amounts.some(amount => Math.abs(entryAmount - amount) <= tolerance);
    });
  }

  // Categorization Rules
  async getCategorizationRules(companyId?: number): Promise<CategorizationRule[]> {
    if (companyId) {
      return await db.select()
        .from(categorizationRulesSchema)
        .where(eq(categorizationRulesSchema.companyId, companyId))
        .orderBy(categorizationRulesSchema.priority, categorizationRulesSchema.id);
    }
    return await db.select()
      .from(categorizationRulesSchema)
      .orderBy(categorizationRulesSchema.priority, categorizationRulesSchema.id);
  }

  async getCategorizationRule(id: number): Promise<CategorizationRule | undefined> {
    const [rule] = await db.select()
      .from(categorizationRulesSchema)
      .where(eq(categorizationRulesSchema.id, id))
      .limit(1);
    return rule;
  }

  async createCategorizationRule(rule: InsertCategorizationRule): Promise<CategorizationRule> {
    // Use raw SQL to force isEnabled to true to bypass any ORM serialization issues
    const isEnabled = rule.isEnabled !== false; // Default to true

    console.log('[DatabaseStorage] Creating rule:', {
      name: rule.name,
      ruleType: rule.ruleType,
      isEnabled: isEnabled
    });

    // Insert with explicit is_enabled = true and auto_apply = true using raw SQL to bypass Drizzle issues
    const result = await db.execute(sql`
      INSERT INTO categorization_rules (
        company_id, name, is_enabled, auto_apply, priority, conditions, actions, sales_tax_id,
        attachment_path, rule_type, source_merchant_pattern, auto_generated_at,
        occurrence_count, confidence_score, created_at, updated_at
      ) VALUES (
        ${rule.companyId ?? null},
        ${rule.name},
        true,
        true,
        ${rule.priority ?? 0},
        ${JSON.stringify(rule.conditions)}::json,
        ${JSON.stringify(rule.actions)}::json,
        ${rule.salesTaxId ?? null},
        ${rule.attachmentPath ?? null},
        ${rule.ruleType ?? 'manual'},
        ${rule.sourceMerchantPattern ?? null},
        ${rule.autoGeneratedAt ?? null},
        ${rule.occurrenceCount ?? 0},
        ${rule.confidenceScore ?? null},
        NOW(),
        NOW()
      ) RETURNING *
    `);

    const newRule = result.rows[0] as any;

    // Convert snake_case to camelCase for the return value
    const formattedRule: CategorizationRule = {
      id: newRule.id,
      companyId: newRule.company_id,
      name: newRule.name,
      isEnabled: newRule.is_enabled,
      autoApply: newRule.auto_apply,
      priority: newRule.priority,
      conditions: newRule.conditions,
      actions: newRule.actions,
      salesTaxId: newRule.sales_tax_id,
      attachmentPath: newRule.attachment_path,
      ruleType: newRule.rule_type,
      sourceMerchantPattern: newRule.source_merchant_pattern,
      autoGeneratedAt: newRule.auto_generated_at,
      promotedToManualAt: newRule.promoted_to_manual_at,
      occurrenceCount: newRule.occurrence_count,
      confidenceScore: newRule.confidence_score,
      createdAt: newRule.created_at,
      updatedAt: newRule.updated_at
    };

    console.log('[DatabaseStorage] Created rule:', {
      id: formattedRule.id,
      name: formattedRule.name,
      isEnabled: formattedRule.isEnabled,
      ruleType: formattedRule.ruleType
    });

    return formattedRule;
  }

  async updateCategorizationRule(id: number, ruleUpdate: Partial<CategorizationRule>): Promise<CategorizationRule | undefined> {
    const [updatedRule] = await db.update(categorizationRulesSchema)
      .set({
        ...ruleUpdate,
        updatedAt: new Date()
      })
      .where(eq(categorizationRulesSchema.id, id))
      .returning();
    return updatedRule;
  }

  async deleteCategorizationRule(id: number): Promise<boolean> {
    const result = await db.delete(categorizationRulesSchema)
      .where(eq(categorizationRulesSchema.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Currencies
  async getCurrencies(): Promise<Currency[]> {
    return await db.select()
      .from(currenciesSchema)
      .orderBy(currenciesSchema.code);
  }

  async getCurrency(code: string): Promise<Currency | undefined> {
    const [currency] = await db.select()
      .from(currenciesSchema)
      .where(eq(currenciesSchema.code, code))
      .limit(1);
    return currency;
  }

  // Exchange Rates
  async getExchangeRates(fromCurrency?: string, effectiveDate?: string): Promise<ExchangeRate[]> {
    const conditions = [];
    
    if (fromCurrency) {
      conditions.push(eq(exchangeRatesSchema.fromCurrency, fromCurrency));
    }
    
    if (effectiveDate) {
      conditions.push(lte(exchangeRatesSchema.effectiveDate, effectiveDate));
    }
    
    let query = db.select().from(exchangeRatesSchema);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    // If filtering by date, get the most recent rate for each currency pair on or before that date
    if (effectiveDate && fromCurrency) {
      // Use subquery to get the latest rate for each toCurrency
      const rates = await query.orderBy(
        exchangeRatesSchema.toCurrency,
        desc(exchangeRatesSchema.effectiveDate)
      );
      
      // Group by toCurrency and keep only the most recent rate
      const latestRates: ExchangeRate[] = [];
      const seenCurrencies = new Set<string>();
      
      for (const rate of rates) {
        if (!seenCurrencies.has(rate.toCurrency)) {
          latestRates.push(rate);
          seenCurrencies.add(rate.toCurrency);
        }
      }
      
      return latestRates;
    }
    
    return await query.orderBy(desc(exchangeRatesSchema.effectiveDate), exchangeRatesSchema.fromCurrency);
  }

  async getExchangeRate(id: number): Promise<ExchangeRate | undefined> {
    const [exchangeRate] = await db.select()
      .from(exchangeRatesSchema)
      .where(eq(exchangeRatesSchema.id, id))
      .limit(1);
    return exchangeRate;
  }

  async getExchangeRateForDate(fromCurrency: string, toCurrency: string, date: Date): Promise<ExchangeRate | undefined> {
    const dateStr = date.toISOString().split('T')[0];
    const [exchangeRate] = await db.select()
      .from(exchangeRatesSchema)
      .where(
        and(
          eq(exchangeRatesSchema.fromCurrency, fromCurrency),
          eq(exchangeRatesSchema.toCurrency, toCurrency),
          lte(exchangeRatesSchema.effectiveDate, dateStr)
        )
      )
      .orderBy(desc(exchangeRatesSchema.effectiveDate))
      .limit(1);
    return exchangeRate;
  }

  async createExchangeRate(exchangeRate: InsertExchangeRate): Promise<ExchangeRate> {
    const [newRate] = await db.insert(exchangeRatesSchema)
      .values(exchangeRate)
      .returning();
    return newRate;
  }

  async updateExchangeRate(id: number, exchangeRateUpdate: Partial<ExchangeRate>): Promise<ExchangeRate | undefined> {
    const [updatedRate] = await db.update(exchangeRatesSchema)
      .set(exchangeRateUpdate)
      .where(eq(exchangeRatesSchema.id, id))
      .returning();
    return updatedRate;
  }

  async deleteExchangeRate(id: number): Promise<boolean> {
    const result = await db.delete(exchangeRatesSchema)
      .where(eq(exchangeRatesSchema.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // FX Realizations
  async getFxRealizations(): Promise<FxRealization[]> {
    return await db.select()
      .from(fxRealizationsSchema)
      .orderBy(desc(fxRealizationsSchema.realizedDate));
  }

  async getFxRealizationsByTransaction(transactionId: number): Promise<FxRealization[]> {
    return await db.select()
      .from(fxRealizationsSchema)
      .where(eq(fxRealizationsSchema.paymentId, transactionId));
  }

  async createFxRealization(fxRealization: InsertFxRealization): Promise<FxRealization> {
    const [newRealization] = await db.insert(fxRealizationsSchema)
      .values(fxRealization)
      .returning();
    return newRealization;
  }

  // FX Revaluations
  async getFxRevaluations(): Promise<FxRevaluation[]> {
    return await db.select()
      .from(fxRevaluationsSchema)
      .orderBy(desc(fxRevaluationsSchema.revaluationDate));
  }

  async getFxRevaluation(id: number): Promise<FxRevaluation | undefined> {
    const [revaluation] = await db.select()
      .from(fxRevaluationsSchema)
      .where(eq(fxRevaluationsSchema.id, id))
      .limit(1);
    return revaluation;
  }

  async createFxRevaluation(fxRevaluation: InsertFxRevaluation): Promise<FxRevaluation> {
    const [newRevaluation] = await db.insert(fxRevaluationsSchema)
      .values(fxRevaluation)
      .returning();
    return newRevaluation;
  }

  async getForeignCurrencyBalances(asOfDate: Date): Promise<Array<{
    currency: string;
    accountType: string;
    foreignBalance: string;
    originalRate: string;
  }>> {
    const preferences = await this.getPreferences();
    const homeCurrency = preferences?.homeCurrency || 'USD';

    const result = await db.execute(sql`
      WITH foreign_ledger AS (
        SELECT 
          a.type as account_type,
          t.currency,
          t.exchange_rate,
          t.foreign_amount,
          le.debit,
          le.credit
        FROM ${ledgerEntries} le
        INNER JOIN ${accounts} a ON le.account_id = a.id
        INNER JOIN ${transactions} t ON le.transaction_id = t.id
        WHERE 
          t.currency IS NOT NULL 
          AND t.currency != ${homeCurrency}
          AND le.date <= ${asOfDate}
          AND a.type IN ('accounts_receivable', 'accounts_payable', 'bank')
      ),
      balances AS (
        SELECT
          account_type,
          currency,
          SUM(debit - credit) as home_balance,
          SUM(
            CASE 
              WHEN foreign_amount IS NOT NULL AND exchange_rate IS NOT NULL 
              THEN CAST(foreign_amount AS NUMERIC) 
              ELSE (debit - credit)
            END
          ) as foreign_balance,
          SUM(
            CASE 
              WHEN foreign_amount IS NOT NULL AND exchange_rate IS NOT NULL 
              THEN CAST(foreign_amount AS NUMERIC) * CAST(exchange_rate AS NUMERIC)
              ELSE (debit - credit)
            END
          ) / NULLIF(SUM(
            CASE 
              WHEN foreign_amount IS NOT NULL AND exchange_rate IS NOT NULL 
              THEN CAST(foreign_amount AS NUMERIC)
              ELSE (debit - credit)
            END
          ), 0) as weighted_avg_rate
        FROM foreign_ledger
        GROUP BY account_type, currency
        HAVING SUM(debit - credit) != 0
      )
      SELECT 
        currency,
        account_type as "accountType",
        foreign_balance::text as "foreignBalance",
        COALESCE(weighted_avg_rate, 1.0)::text as "originalRate"
      FROM balances
      ORDER BY account_type, currency
    `);

    return result.rows as Array<{
      currency: string;
      accountType: string;
      foreignBalance: string;
      originalRate: string;
    }>;
  }

  // Currency Locks
  async getCurrencyLocks(): Promise<CurrencyLock[]> {
    return await db.select()
      .from(currencyLocksSchema);
  }

  async getCurrencyLockByEntity(entityType: string, entityId: number): Promise<CurrencyLock | undefined> {
    const [lock] = await db.select()
      .from(currencyLocksSchema)
      .where(
        and(
          eq(currencyLocksSchema.entityType, entityType),
          eq(currencyLocksSchema.entityId, entityId)
        )
      )
      .limit(1);
    return lock;
  }

  async createCurrencyLock(currencyLock: InsertCurrencyLock): Promise<CurrencyLock> {
    const [newLock] = await db.insert(currencyLocksSchema)
      .values(currencyLock)
      .returning();
    return newLock;
  }

  // Activity Logs
  async getActivityLogs(filters?: {
    userId?: number;
    companyId?: number; // Company isolation filter
    entityType?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }): Promise<ActivityLog[]> {
    let query = db.select().from(activityLogsSchema);

    // Apply filters
    const conditions = [];
    if (filters?.userId) {
      conditions.push(eq(activityLogsSchema.userId, filters.userId));
    }
    // CRITICAL: Filter by companyId for multi-tenant isolation
    if (filters?.companyId) {
      conditions.push(eq(activityLogsSchema.companyId, filters.companyId));
    }
    if (filters?.entityType) {
      conditions.push(eq(activityLogsSchema.entityType, filters.entityType));
    }
    if (filters?.dateFrom) {
      conditions.push(gte(activityLogsSchema.createdAt, filters.dateFrom));
    }
    if (filters?.dateTo) {
      conditions.push(lte(activityLogsSchema.createdAt, filters.dateTo));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    // Order by most recent first
    query = query.orderBy(desc(activityLogsSchema.createdAt)) as any;

    // Apply pagination
    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }
    if (filters?.offset) {
      query = query.offset(filters.offset) as any;
    }

    return await query;
  }

  async getActivityLog(id: number): Promise<ActivityLog | undefined> {
    const [log] = await db.select()
      .from(activityLogsSchema)
      .where(eq(activityLogsSchema.id, id))
      .limit(1);
    return log;
  }

  async createActivityLog(activityLog: InsertActivityLog): Promise<ActivityLog> {
    const [newLog] = await db.insert(activityLogsSchema)
      .values(activityLog)
      .returning();
    return newLog;
  }

  // Accounting Firms
  async getAccountingFirms(): Promise<AccountingFirm[]> {
    return await db.select()
      .from(accountingFirmsSchema)
      .where(eq(accountingFirmsSchema.isActive, true))
      .orderBy(accountingFirmsSchema.name);
  }

  async getAccountingFirm(id: number): Promise<AccountingFirm | undefined> {
    const [firm] = await db.select()
      .from(accountingFirmsSchema)
      .where(eq(accountingFirmsSchema.id, id))
      .limit(1);
    return firm;
  }

  async createAccountingFirm(firm: InsertAccountingFirm): Promise<AccountingFirm> {
    const [newFirm] = await db.insert(accountingFirmsSchema)
      .values(firm)
      .returning();
    return newFirm;
  }

  async updateAccountingFirm(id: number, firm: Partial<AccountingFirm>): Promise<AccountingFirm | undefined> {
    const [updatedFirm] = await db.update(accountingFirmsSchema)
      .set({ ...firm, updatedAt: new Date() })
      .where(eq(accountingFirmsSchema.id, id))
      .returning();
    return updatedFirm;
  }

  async deleteAccountingFirm(id: number): Promise<boolean> {
    const result = await db.delete(accountingFirmsSchema)
      .where(eq(accountingFirmsSchema.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Firm Client Access
  async getFirmClientAccess(firmId: number): Promise<FirmClientAccess[]> {
    return await db.select()
      .from(firmClientAccessSchema)
      .where(
        and(
          eq(firmClientAccessSchema.firmId, firmId),
          eq(firmClientAccessSchema.isActive, true)
        )
      )
      .orderBy(firmClientAccessSchema.createdAt);
  }

  async getClientFirms(companyId: number): Promise<FirmClientAccess[]> {
    return await db.select()
      .from(firmClientAccessSchema)
      .where(
        and(
          eq(firmClientAccessSchema.companyId, companyId),
          eq(firmClientAccessSchema.isActive, true)
        )
      )
      .orderBy(firmClientAccessSchema.createdAt);
  }

  async createFirmClientAccess(access: InsertFirmClientAccess): Promise<FirmClientAccess> {
    const [newAccess] = await db.insert(firmClientAccessSchema)
      .values(access)
      .returning();
    return newAccess;
  }

  async revokeFirmClientAccess(id: number): Promise<boolean> {
    const [updated] = await db.update(firmClientAccessSchema)
      .set({ isActive: false })
      .where(eq(firmClientAccessSchema.id, id))
      .returning();
    return !!updated;
  }

  // User Invitations
  async getUserInvitations(filters?: { companyId?: number; firmId?: number; pending?: boolean }): Promise<UserInvitation[]> {
    let query = db.select().from(userInvitationsSchema);

    const conditions = [];
    if (filters?.companyId) {
      conditions.push(eq(userInvitationsSchema.companyId, filters.companyId));
    }
    if (filters?.firmId) {
      conditions.push(eq(userInvitationsSchema.firmId, filters.firmId));
    }
    if (filters?.pending) {
      conditions.push(isNull(userInvitationsSchema.acceptedAt));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(desc(userInvitationsSchema.createdAt)) as any;

    return await query;
  }

  async getUserInvitation(id: number): Promise<UserInvitation | undefined> {
    const [invitation] = await db.select()
      .from(userInvitationsSchema)
      .where(eq(userInvitationsSchema.id, id))
      .limit(1);
    return invitation;
  }

  async getUserInvitationByToken(token: string): Promise<UserInvitation | undefined> {
    const [invitation] = await db.select()
      .from(userInvitationsSchema)
      .where(eq(userInvitationsSchema.token, token))
      .limit(1);
    return invitation;
  }

  async createUserInvitation(invitation: InsertUserInvitation): Promise<UserInvitation> {
    const [newInvitation] = await db.insert(userInvitationsSchema)
      .values(invitation)
      .returning();
    return newInvitation;
  }

  async acceptUserInvitation(token: string): Promise<UserInvitation | undefined> {
    const invitation = await this.getUserInvitationByToken(token);
    
    if (!invitation) {
      return undefined;
    }

    if (new Date() > new Date(invitation.expiresAt)) {
      return undefined;
    }

    if (invitation.acceptedAt) {
      return undefined;
    }

    const [acceptedInvitation] = await db.update(userInvitationsSchema)
      .set({ acceptedAt: new Date() })
      .where(eq(userInvitationsSchema.token, token))
      .returning();

    return acceptedInvitation;
  }

  async deleteUserInvitation(id: number): Promise<boolean> {
    const result = await db.delete(userInvitationsSchema)
      .where(eq(userInvitationsSchema.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Invoice Activities
  async getInvoiceActivities(invoiceId: number): Promise<InvoiceActivity[]> {
    return await db.select()
      .from(invoiceActivitiesSchema)
      .where(eq(invoiceActivitiesSchema.invoiceId, invoiceId))
      .orderBy(desc(invoiceActivitiesSchema.timestamp));
  }

  async createInvoiceActivity(activity: InsertInvoiceActivity): Promise<InvoiceActivity> {
    const [newActivity] = await db.insert(invoiceActivitiesSchema)
      .values(activity)
      .returning();
    return newActivity;
  }

  // Generate secure token for public invoice access
  async generateSecureToken(invoiceId: number): Promise<string> {
    // Generate a cryptographically secure random token
    const token = randomBytes(32).toString('hex');
    
    // Update the invoice with the secure token
    await db.update(transactions)
      .set({ secureToken: token })
      .where(eq(transactions.id, invoiceId));
    
    return token;
  }

  // Get invoice by secure token (for public view)
  async getInvoiceByToken(token: string): Promise<Transaction | undefined> {
    const [invoice] = await db.select()
      .from(transactions)
      .where(
        and(
          eq(transactions.secureToken, token),
          eq(transactions.type, 'invoice' as any)
        )
      )
      .limit(1);
    return invoice;
  }

  // Recurring Invoices
  async getRecurringTemplates(filters?: { status?: string; customerId?: number }): Promise<(RecurringTemplate & { customerName?: string })[]> {
    const conditions: any[] = [];
    if (filters?.status) {
      conditions.push(eq(recurringTemplatesSchema.status, filters.status as any));
    }
    if (filters?.customerId) {
      conditions.push(eq(recurringTemplatesSchema.customerId, filters.customerId));
    }

    const baseQuery = db.select({
      template: recurringTemplatesSchema,
      customerName: contacts.name,
    })
    .from(recurringTemplatesSchema)
    .leftJoin(contacts, eq(recurringTemplatesSchema.customerId, contacts.id));

    const results = conditions.length > 0
      ? await baseQuery.where(and(...conditions)).orderBy(desc(recurringTemplatesSchema.createdAt))
      : await baseQuery.orderBy(desc(recurringTemplatesSchema.createdAt));

    return results.map(r => ({ ...r.template, customerName: r.customerName || '' }));
  }

  async getRecurringTemplate(id: number): Promise<(RecurringTemplate & { customerName?: string }) | undefined> {
    const results = await db.select({
      template: recurringTemplatesSchema,
      customerName: contacts.name,
    })
    .from(recurringTemplatesSchema)
    .leftJoin(contacts, eq(recurringTemplatesSchema.customerId, contacts.id))
    .where(eq(recurringTemplatesSchema.id, id))
    .limit(1);

    if (results.length === 0) return undefined;
    return { ...results[0].template, customerName: results[0].customerName || '' };
  }

  async createRecurringTemplate(template: InsertRecurringTemplate, lines: InsertRecurringLine[]): Promise<RecurringTemplate> {
    return await db.transaction(async (tx) => {
      const [newTemplate] = await tx.insert(recurringTemplatesSchema)
        .values(template)
        .returning();

      if (lines.length > 0) {
        const linesWithTemplateId = lines.map(line => ({
          ...line,
          templateId: newTemplate.id,
        }));
        await tx.insert(recurringLinesSchema).values(linesWithTemplateId);
      }

      return newTemplate;
    });
  }

  async updateRecurringTemplate(id: number, template: Partial<RecurringTemplate>): Promise<RecurringTemplate | undefined> {
    const [updated] = await db.update(recurringTemplatesSchema)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(recurringTemplatesSchema.id, id))
      .returning();
    return updated;
  }

  async deleteRecurringTemplate(id: number): Promise<boolean> {
    const result = await db.delete(recurringTemplatesSchema)
      .where(eq(recurringTemplatesSchema.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getRecurringLines(templateId: number): Promise<RecurringLine[]> {
    return await db.select()
      .from(recurringLinesSchema)
      .where(eq(recurringLinesSchema.templateId, templateId))
      .orderBy(recurringLinesSchema.orderIndex);
  }

  async updateRecurringLines(templateId: number, lines: InsertRecurringLine[]): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(recurringLinesSchema)
        .where(eq(recurringLinesSchema.templateId, templateId));

      if (lines.length > 0) {
        const linesWithTemplateId = lines.map(line => ({
          ...line,
          templateId,
        }));
        await tx.insert(recurringLinesSchema).values(linesWithTemplateId);
      }
    });
  }

  async pauseRecurringTemplate(id: number): Promise<RecurringTemplate | undefined> {
    const [updated] = await db.update(recurringTemplatesSchema)
      .set({ status: 'paused' as any, updatedAt: new Date() })
      .where(eq(recurringTemplatesSchema.id, id))
      .returning();
    return updated;
  }

  async resumeRecurringTemplate(id: number): Promise<RecurringTemplate | undefined> {
    const [updated] = await db.update(recurringTemplatesSchema)
      .set({ status: 'active' as any, updatedAt: new Date() })
      .where(eq(recurringTemplatesSchema.id, id))
      .returning();
    return updated;
  }

  async cancelRecurringTemplate(id: number): Promise<RecurringTemplate | undefined> {
    const [updated] = await db.update(recurringTemplatesSchema)
      .set({ status: 'cancelled' as any, updatedAt: new Date() })
      .where(eq(recurringTemplatesSchema.id, id))
      .returning();
    return updated;
  }

  async duplicateRecurringTemplate(id: number, templateName: string): Promise<RecurringTemplate> {
    const original = await this.getRecurringTemplate(id);
    if (!original) {
      throw new Error('Template not found');
    }

    const originalLines = await this.getRecurringLines(id);

    return await db.transaction(async (tx) => {
      const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, currentOccurrences: _currentOccurrences, lastRunAt: _lastRunAt, ...templateData } = original;

      const [newTemplate] = await tx.insert(recurringTemplatesSchema)
        .values({
          ...templateData,
          templateName,
          status: 'paused' as any,
          currentOccurrences: 0,
          lastRunAt: null,
        })
        .returning();

      if (originalLines.length > 0) {
        const newLines = originalLines.map(({ id: _lineId, templateId: _templateId, ...lineData }) => ({
          ...lineData,
          templateId: newTemplate.id,
        }));
        await tx.insert(recurringLinesSchema).values(newLines);
      }

      return newTemplate;
    });
  }

  async getRecurringHistory(templateId: number): Promise<RecurringHistory[]> {
    return await db.select()
      .from(recurringHistorySchema)
      .where(eq(recurringHistorySchema.templateId, templateId))
      .orderBy(desc(recurringHistorySchema.scheduledAt));
  }

  async createRecurringHistory(history: InsertRecurringHistory): Promise<RecurringHistory> {
    const [newHistory] = await db.insert(recurringHistorySchema)
      .values(history)
      .returning();
    return newHistory;
  }

  async getActiveTemplatesDue(now: Date): Promise<RecurringTemplate[]> {
    return await db.select()
      .from(recurringTemplatesSchema)
      .where(
        and(
          eq(recurringTemplatesSchema.status, 'active' as any),
          lte(recurringTemplatesSchema.nextRunAt, now)
        )
      );
  }

  // ============================================
  // Merchant Patterns (AI Learning)
  // ============================================

  async getMerchantPatterns(): Promise<MerchantPattern[]> {
    return await db.select()
      .from(merchantPatternsSchema)
      .orderBy(desc(merchantPatternsSchema.totalOccurrences));
  }

  async getMerchantPattern(id: number): Promise<MerchantPattern | undefined> {
    const [pattern] = await db.select()
      .from(merchantPatternsSchema)
      .where(eq(merchantPatternsSchema.id, id))
      .limit(1);
    return pattern;
  }

  async getMerchantPatternByName(merchantNameNormalized: string, companyId?: number): Promise<MerchantPattern | undefined> {
    const conditions = [eq(merchantPatternsSchema.merchantNameNormalized, merchantNameNormalized)];
    if (companyId) {
      conditions.push(eq(merchantPatternsSchema.companyId, companyId));
    }
    const [pattern] = await db.select()
      .from(merchantPatternsSchema)
      .where(and(...conditions))
      .limit(1);
    return pattern;
  }

  async createMerchantPattern(pattern: InsertMerchantPattern): Promise<MerchantPattern> {
    const [newPattern] = await db.insert(merchantPatternsSchema)
      .values({
        ...pattern,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newPattern;
  }

  async updateMerchantPattern(id: number, patternUpdate: Partial<MerchantPattern>): Promise<MerchantPattern> {
    const [updatedPattern] = await db.update(merchantPatternsSchema)
      .set({
        ...patternUpdate,
        updatedAt: new Date(),
      })
      .where(eq(merchantPatternsSchema.id, id))
      .returning();
    return updatedPattern;
  }

  async deleteMerchantPattern(id: number): Promise<boolean> {
    const result = await db.delete(merchantPatternsSchema)
      .where(eq(merchantPatternsSchema.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getMerchantPatternCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(merchantPatternsSchema);
    return Number(result[0]?.count || 0);
  }

  async getTopMerchantPatterns(limit: number, companyId?: number): Promise<MerchantPattern[]> {
    if (companyId) {
      return await db.select()
        .from(merchantPatternsSchema)
        .where(eq(merchantPatternsSchema.companyId, companyId))
        .orderBy(desc(merchantPatternsSchema.totalOccurrences))
        .limit(limit);
    }
    return await db.select()
      .from(merchantPatternsSchema)
      .orderBy(desc(merchantPatternsSchema.totalOccurrences))
      .limit(limit);
  }

  // ============================================
  // Categorization Feedback (Learning)
  // ============================================

  async createCategorizationFeedback(feedback: InsertCategorizationFeedback): Promise<CategorizationFeedback> {
    const [newFeedback] = await db.insert(categorizationFeedbackSchema)
      .values({
        ...feedback,
        createdAt: new Date(),
      })
      .returning();
    return newFeedback;
  }

  async getCategorizationFeedbackCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(categorizationFeedbackSchema);
    return Number(result[0]?.count || 0);
  }

  async getAcceptedFeedbackCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(categorizationFeedbackSchema)
      .where(eq(categorizationFeedbackSchema.wasSuggestionAccepted, true));
    return Number(result[0]?.count || 0);
  }

  // ============================================
  // Extended Categorization Rules (AI Rules)
  // ============================================

  async getEnabledCategorizationRules(companyId?: number): Promise<CategorizationRule[]> {
    const conditions = [eq(categorizationRulesSchema.isEnabled, true)];
    if (companyId) {
      conditions.push(eq(categorizationRulesSchema.companyId, companyId));
    }
    return await db.select()
      .from(categorizationRulesSchema)
      .where(and(...conditions))
      .orderBy(categorizationRulesSchema.priority, categorizationRulesSchema.id);
  }

  async getCategorizationRulesByType(ruleType: 'manual' | 'ai', companyId?: number): Promise<CategorizationRule[]> {
    const conditions = [eq(categorizationRulesSchema.ruleType, ruleType)];
    if (companyId) {
      conditions.push(eq(categorizationRulesSchema.companyId, companyId));
    }
    return await db.select()
      .from(categorizationRulesSchema)
      .where(and(...conditions))
      .orderBy(categorizationRulesSchema.priority, categorizationRulesSchema.id);
  }

  async getAiRuleByMerchant(merchantNameNormalized: string, companyId?: number): Promise<CategorizationRule | undefined> {
    const conditions = [
      eq(categorizationRulesSchema.ruleType, 'ai'),
      eq(categorizationRulesSchema.sourceMerchantPattern, merchantNameNormalized)
    ];
    if (companyId) {
      conditions.push(eq(categorizationRulesSchema.companyId, companyId));
    }
    const [rule] = await db.select()
      .from(categorizationRulesSchema)
      .where(and(...conditions))
      .limit(1);
    return rule;
  }

  async getRuleCountByType(ruleType: 'manual' | 'ai'): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(categorizationRulesSchema)
      .where(eq(categorizationRulesSchema.ruleType, ruleType));
    return Number(result[0]?.count || 0);
  }

  async deleteAiRules(): Promise<number> {
    const result = await db.delete(categorizationRulesSchema)
      .where(eq(categorizationRulesSchema.ruleType, 'ai'));
    return result.rowCount || 0;
  }

  async promoteAiRule(id: number): Promise<CategorizationRule | undefined> {
    const [rule] = await db.select()
      .from(categorizationRulesSchema)
      .where(eq(categorizationRulesSchema.id, id))
      .limit(1);

    if (!rule || rule.ruleType !== 'ai') {
      return undefined;
    }

    const [updatedRule] = await db.update(categorizationRulesSchema)
      .set({
        ruleType: 'manual',
        priority: Math.min(rule.priority, 499), // Move to manual priority range
        promotedToManualAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(categorizationRulesSchema.id, id))
      .returning();

    return updatedRule;
  }

  async promoteAllAiRules(): Promise<number> {
    const result = await db.update(categorizationRulesSchema)
      .set({
        ruleType: 'manual',
        promotedToManualAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(categorizationRulesSchema.ruleType, 'ai'));

    return result.rowCount || 0;
  }

  // AI Conversations
  async getAiConversations(userId: number, companyId?: number): Promise<AiConversation[]> {
    if (companyId) {
      return await db.select()
        .from(aiConversationsSchema)
        .where(
          and(
            eq(aiConversationsSchema.userId, userId),
            eq(aiConversationsSchema.companyId, companyId),
            eq(aiConversationsSchema.isArchived, false)
          )
        )
        .orderBy(desc(aiConversationsSchema.updatedAt));
    }
    return await db.select()
      .from(aiConversationsSchema)
      .where(
        and(
          eq(aiConversationsSchema.userId, userId),
          eq(aiConversationsSchema.isArchived, false)
        )
      )
      .orderBy(desc(aiConversationsSchema.updatedAt));
  }

  async getAiConversation(id: number): Promise<AiConversation | undefined> {
    const result = await db.select()
      .from(aiConversationsSchema)
      .where(eq(aiConversationsSchema.id, id));
    return result[0];
  }

  async createAiConversation(conversation: InsertAiConversation): Promise<AiConversation> {
    const [newConversation] = await db.insert(aiConversationsSchema)
      .values(conversation)
      .returning();
    return newConversation;
  }

  async updateAiConversation(id: number, conversation: Partial<AiConversation>): Promise<AiConversation | undefined> {
    const [updated] = await db.update(aiConversationsSchema)
      .set({ ...conversation, updatedAt: new Date() })
      .where(eq(aiConversationsSchema.id, id))
      .returning();
    return updated;
  }

  async deleteAiConversation(id: number): Promise<boolean> {
    const result = await db.delete(aiConversationsSchema)
      .where(eq(aiConversationsSchema.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // AI Messages
  async getAiMessages(conversationId: number): Promise<AiMessage[]> {
    return await db.select()
      .from(aiMessagesSchema)
      .where(eq(aiMessagesSchema.conversationId, conversationId))
      .orderBy(aiMessagesSchema.createdAt);
  }

  async createAiMessage(message: InsertAiMessage): Promise<AiMessage> {
    // Update conversation's updatedAt timestamp
    await db.update(aiConversationsSchema)
      .set({ updatedAt: new Date() })
      .where(eq(aiConversationsSchema.id, message.conversationId));

    const [newMessage] = await db.insert(aiMessagesSchema)
      .values(message)
      .returning();
    return newMessage;
  }

  async deleteOldAiConversations(olderThan: Date): Promise<number> {
    const result = await db.delete(aiConversationsSchema)
      .where(lt(aiConversationsSchema.updatedAt, olderThan));
    return result.rowCount ?? 0;
  }
}