import { db } from "./db";
import { 
  Account, Contact, Transaction, LineItem, LedgerEntry, SalesTax, Product,
  CompanySettings, Preferences, Company,
  InsertAccount, InsertContact, InsertTransaction, InsertLineItem, InsertLedgerEntry, InsertSalesTax, InsertProduct,
  InsertCompanySettings, InsertPreferences, InsertCompany,
  accounts, contacts, transactions, lineItems, ledgerEntries, salesTaxSchema, productsSchema,
  companySchema, preferencesSchema, companiesSchema
} from "@shared/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { IStorage } from "./storage";

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
    const [updatedTransaction] = await db.update(transactions)
      .set(transactionUpdate)
      .where(eq(transactions.id, id))
      .returning();
    return updatedTransaction;
  }
  
  /**
   * Recalculates the balance for an invoice by summing all payments applied to it
   * @param invoiceId The ID of the invoice to recalculate
   */
  async recalculateInvoiceBalance(invoiceId: number): Promise<Transaction | undefined> {
    try {
      // Get the invoice
      const invoice = await this.getTransaction(invoiceId);
      if (!invoice || invoice.type !== 'invoice') {
        console.error(`Transaction ${invoiceId} is not an invoice or doesn't exist`);
        return undefined;
      }
      
      // Get all payments applied to this invoice through ledger entries
      const appliedPayments = await db.select({
        amount: sql`SUM(${ledgerEntries.credit})`,
      })
      .from(ledgerEntries)
      .where(and(
        sql`${ledgerEntries.description} LIKE ${'%' + invoice.reference + '%'}`,
        eq(ledgerEntries.accountId, 2), // Accounts Receivable
        neq(ledgerEntries.transactionId, invoiceId) // Exclude the invoice's own ledger entries
      ));
      
      const totalApplied = appliedPayments[0]?.amount || 0;
      const remainingBalance = invoice.amount - totalApplied;
      
      // Update invoice balance and status
      let status = invoice.status;
      if (remainingBalance <= 0) {
        status = 'paid';
      } else if (remainingBalance < invoice.amount) {
        status = 'partial';
      } else {
        status = 'outstanding';
      }
      
      // Update the invoice
      const [updatedInvoice] = await db.update(transactions)
        .set({
          balance: remainingBalance > 0 ? remainingBalance : 0,
          status
        })
        .where(eq(transactions.id, invoiceId))
        .returning();
        
      return updatedInvoice;
    } catch (error) {
      console.error('Error recalculating invoice balance:', error);
      return undefined;
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
        
        // Special handling for payments - need to update invoice balances
        if (transaction.type === 'payment') {
          console.log(`Deleting payment transaction: ${transaction.reference}`);
          
          // Find ledger entries related to Accounts Receivable (typically account ID 2)
          // These entries indicate which invoices the payment was applied to
          const invoicePaymentEntries = ledgerEntriesToDelete.filter(entry => 
            entry.accountId === 2 && 
            entry.credit > 0 && 
            entry.description && 
            entry.description.includes('invoice')
          );
          
          // Process each payment application to restore invoice balances
          for (const entry of invoicePaymentEntries) {
            if (!entry.description) continue;
            
            // Extract invoice reference from description (e.g., "Payment applied to invoice #1002")
            const invoiceRefMatch = entry.description.match(/invoice\s+#(\d+)/i);
            
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
                // When a payment is deleted, we need to:
                // 1. Restore the full invoice balance (amount) if it was fully paid
                // 2. Add the payment credit back to the balance if it was partially paid
                
                // Always restore the full invoice amount on deletion of a payment
                // This ensures we don't have any balance calculation errors
                const newBalance = invoice.amount;
                
                // Set status to 'pending' since we're restoring the invoice
                const newStatus = 'pending';
                
                console.log(`Updating invoice #${invoiceRef} balance from ${invoice.balance || invoice.amount} to ${newBalance}, status from ${invoice.status || 'unknown'} to ${newStatus}`);
                
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
        
        return deleteResult.rowCount !== null && deleteResult.rowCount > 0;
      });
    } catch (error) {
      console.error('Error deleting transaction:', error);
      return false;
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
    let query = db.select().from(ledgerEntries);
    
    if (startDate) {
      query = query.where(gte(ledgerEntries.date, startDate));
    }
    
    if (endDate) {
      query = query.where(lte(ledgerEntries.date, endDate));
    }
    
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
    const [newSalesTax] = await db.insert(salesTaxSchema).values(salesTax).returning();
    return newSalesTax;
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
}