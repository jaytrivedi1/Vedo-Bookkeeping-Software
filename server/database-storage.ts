import { db } from "./db";
import { 
  Account, Contact, Transaction, LineItem, LedgerEntry, SalesTax,
  InsertAccount, InsertContact, InsertTransaction, InsertLineItem, InsertLedgerEntry, InsertSalesTax,
  accounts, contacts, transactions, lineItems, ledgerEntries, salesTaxSchema
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
    return await db.select().from(transactions).orderBy(desc(transactions.date));
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
    return await db.select().from(ledgerEntries).orderBy(desc(ledgerEntries.date));
  }

  async getLedgerEntriesByDateRange(startDate?: Date, endDate?: Date): Promise<LedgerEntry[]> {
    let query = db.select().from(ledgerEntries);
    
    if (startDate) {
      query = query.where(gte(ledgerEntries.date, startDate));
    }
    
    if (endDate) {
      query = query.where(lte(ledgerEntries.date, endDate));
    }
    
    return await query.orderBy(ledgerEntries.date);
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
      const currentBalance = balanceMap.get(entry.accountId) || 0;
      // Calculate balance based on normal balance of account type
      balanceMap.set(entry.accountId, currentBalance + (entry.debit - entry.credit));
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
    // Revenue accounts have credit balances, so we negate the balance
    const revenues = revenueAccounts.reduce((sum, item) => sum + (-1 * item.balance), 0);
    
    // For expense accounts, debit increases the balance (expense)
    const expenseAccounts = accountBalances.filter(item => 
      item.account.type === 'expenses' || item.account.type === 'cost_of_goods_sold'
    );
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
      item.account.type === 'fixed_assets'
    );
    const assets = assetAccounts.reduce((sum, item) => sum + item.balance, 0);
    
    // Liability accounts have credit balances (negative in our ledger system)
    const liabilityAccounts = accountBalances.filter(item => 
      item.account.type === 'accounts_payable' || 
      item.account.type === 'credit_card' || 
      item.account.type === 'other_current_liabilities' ||
      item.account.type === 'long_term_liabilities'
    );
    // Liability accounts have credit balances, so we negate the balance
    const liabilities = liabilityAccounts.reduce((sum, item) => sum + (-1 * item.balance), 0);
    
    // Equity accounts have credit balances (negative in our ledger system)
    const equityAccounts = accountBalances.filter(item => 
      item.account.type === 'equity'
    );
    // Equity accounts have credit balances, so we negate the balance
    const equity = equityAccounts.reduce((sum, item) => sum + (-1 * item.balance), 0);
    
    return { assets, liabilities, equity };
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
    return result.rowCount > 0;
  }
}