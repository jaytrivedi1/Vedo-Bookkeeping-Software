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
    return allAccounts.map(account => ({ 
      account, 
      balance: account.balance 
    }));
  }

  async getIncomeStatement(startDate?: Date, endDate?: Date): Promise<{ revenues: number; expenses: number; netIncome: number }> {
    const allAccounts = await this.getAccounts();
    
    // Filter revenue accounts
    const revenueAccounts = allAccounts.filter(account => account.type === 'income');
    const revenues = revenueAccounts.reduce((sum, account) => sum + account.balance, 0);
    
    // Filter expense accounts
    const expenseAccounts = allAccounts.filter(account => account.type === 'expense');
    const expenses = expenseAccounts.reduce((sum, account) => sum + account.balance, 0);
    
    return {
      revenues,
      expenses,
      netIncome: revenues - expenses
    };
  }

  async getBalanceSheet(): Promise<{ assets: number; liabilities: number; equity: number }> {
    const allAccounts = await this.getAccounts();
    
    // Calculate total assets
    const assetAccounts = allAccounts.filter(account => account.type === 'asset');
    const assets = assetAccounts.reduce((sum, account) => sum + account.balance, 0);
    
    // Calculate total liabilities
    const liabilityAccounts = allAccounts.filter(account => account.type === 'liability');
    const liabilities = liabilityAccounts.reduce((sum, account) => sum + account.balance, 0);
    
    // Calculate total equity
    const equityAccounts = allAccounts.filter(account => account.type === 'equity');
    const equity = equityAccounts.reduce((sum, account) => sum + account.balance, 0);
    
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