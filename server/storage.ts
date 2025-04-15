import {
  accounts,
  contacts,
  transactions,
  lineItems,
  ledgerEntries,
  salesTaxSchema,
  productsSchema,
  companySchema,
  preferencesSchema,
  companiesSchema,
  type Account,
  type InsertAccount,
  type Contact,
  type InsertContact,
  type Transaction,
  type InsertTransaction,
  type LineItem,
  type InsertLineItem,
  type LedgerEntry,
  type InsertLedgerEntry,
  type SalesTax,
  type InsertSalesTax,
  type Product,
  type InsertProduct,
  type CompanySettings,
  type InsertCompanySettings,
  type Preferences,
  type InsertPreferences,
  type Company,
  type InsertCompany,
} from "@shared/schema";

export interface IStorage {
  // Accounts
  getAccounts(): Promise<Account[]>;
  getAccount(id: number): Promise<Account | undefined>;
  getAccountByCode(code: string): Promise<Account | undefined>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: number, account: Partial<Account>): Promise<Account | undefined>;

  // Sales Taxes
  getSalesTaxes(): Promise<SalesTax[]>;
  getSalesTax(id: number): Promise<SalesTax | undefined>;
  createSalesTax(salesTax: InsertSalesTax): Promise<SalesTax>;
  updateSalesTax(id: number, salesTax: Partial<SalesTax>): Promise<SalesTax | undefined>;
  deleteSalesTax(id: number): Promise<boolean>;

  // Products & Services
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<Product>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;

  // Contacts
  getContacts(): Promise<Contact[]>;
  getContact(id: number): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: number, contact: Partial<Contact>): Promise<Contact | undefined>;

  // Transactions
  getTransactions(): Promise<Transaction[]>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction, lineItems: InsertLineItem[], ledgerEntries: InsertLedgerEntry[]): Promise<Transaction>;
  updateTransaction(id: number, transaction: Partial<Transaction>): Promise<Transaction | undefined>;
  deleteTransaction(id: number): Promise<boolean>;

  // Line Items
  getLineItemsByTransaction(transactionId: number): Promise<LineItem[]>;
  createLineItem(lineItem: InsertLineItem): Promise<LineItem>;

  // Ledger Entries
  getLedgerEntriesByTransaction(transactionId: number): Promise<LedgerEntry[]>;
  getAllLedgerEntries(): Promise<LedgerEntry[]>;
  getLedgerEntriesByDateRange(startDate?: Date, endDate?: Date): Promise<LedgerEntry[]>;
  createLedgerEntry(ledgerEntry: InsertLedgerEntry): Promise<LedgerEntry>;
  updateLedgerEntry(id: number, ledgerEntry: Partial<LedgerEntry>): Promise<LedgerEntry | undefined>;

  // Reports
  getAccountBalances(): Promise<{ account: Account; balance: number }[]>;
  getIncomeStatement(startDate?: Date, endDate?: Date): Promise<{ revenues: number; expenses: number; netIncome: number }>;
  getBalanceSheet(): Promise<{ assets: number; liabilities: number; equity: number }>;
  
  // Companies
  getCompanies(): Promise<Company[]>;
  getCompany(id: number): Promise<Company | undefined>;
  getDefaultCompany(): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, company: Partial<Company>): Promise<Company | undefined>;
  setDefaultCompany(id: number): Promise<Company | undefined>;
  
  // Settings
  getCompanySettings(): Promise<CompanySettings | undefined>;
  saveCompanySettings(settings: InsertCompanySettings): Promise<CompanySettings>;
  getPreferences(): Promise<Preferences | undefined>;
  savePreferences(preferences: InsertPreferences): Promise<Preferences>;
}

export class MemStorage implements IStorage {
  private accounts: Map<number, Account>;
  private contacts: Map<number, Contact>;
  private transactions: Map<number, Transaction>;
  private lineItems: Map<number, LineItem>;
  private ledgerEntries: Map<number, LedgerEntry>;
  private salesTaxes: Map<number, SalesTax>;
  private products: Map<number, Product>;
  private companies: Map<number, Company>;
  
  private accountIdCounter: number;
  private contactIdCounter: number;
  private transactionIdCounter: number;
  private lineItemIdCounter: number;
  private ledgerEntryIdCounter: number;
  private salesTaxIdCounter: number;
  private productIdCounter: number;
  private companyIdCounter: number;

  constructor() {
    this.accounts = new Map();
    this.contacts = new Map();
    this.transactions = new Map();
    this.lineItems = new Map();
    this.ledgerEntries = new Map();
    this.salesTaxes = new Map();
    this.products = new Map();
    this.companies = new Map();
    
    this.accountIdCounter = 1;
    this.contactIdCounter = 1;
    this.transactionIdCounter = 1;
    this.lineItemIdCounter = 1;
    this.ledgerEntryIdCounter = 1;
    this.salesTaxIdCounter = 1;
    this.productIdCounter = 1;
    this.companyIdCounter = 1;
    
    // Create a default company
    this.initializeDefaultCompany();

    // Initialize with default chart of accounts
    this.initializeDefaultAccounts();
    // Initialize with some default contacts
    this.initializeDefaultContacts();
  }

  private initializeDefaultAccounts() {
    const defaultAccounts: InsertAccount[] = [
      { code: '1000', name: 'Cash', type: 'asset', description: 'Cash on hand' },
      { code: '1010', name: 'Bank Account', type: 'asset', description: 'Primary checking account' },
      { code: '1200', name: 'Accounts Receivable', type: 'asset', description: 'Money owed by customers' },
      { code: '1400', name: 'Office Supplies', type: 'asset', description: 'Office supplies inventory' },
      { code: '1700', name: 'Equipment', type: 'asset', description: 'Equipment assets' },
      { code: '2000', name: 'Accounts Payable', type: 'liability', description: 'Money owed to vendors' },
      { code: '2100', name: 'Credit Card', type: 'liability', description: 'Business credit card payable' },
      { code: '2200', name: 'Sales Tax Payable', type: 'liability', description: 'Tax collected on sales' },
      { code: '3000', name: 'Owner Equity', type: 'equity', description: 'Owner investment' },
      { code: '3900', name: 'Retained Earnings', type: 'equity', description: 'Accumulated earnings' },
      { code: '4000', name: 'Service Revenue', type: 'income', description: 'Revenue from services' },
      { code: '4100', name: 'Product Revenue', type: 'income', description: 'Revenue from product sales' },
      { code: '5000', name: 'Cost of Goods Sold', type: 'expense', description: 'Direct costs of goods sold' },
      { code: '6000', name: 'Advertising', type: 'expense', description: 'Advertising and marketing expenses' },
      { code: '6100', name: 'Rent', type: 'expense', description: 'Office rent expense' },
      { code: '6200', name: 'Utilities', type: 'expense', description: 'Utility expenses' },
      { code: '6300', name: 'Office Supplies Expense', type: 'expense', description: 'Office supplies consumed' },
      { code: '6500', name: 'Salaries and Wages', type: 'expense', description: 'Employee salaries and wages' },
      { code: '6600', name: 'Professional Fees', type: 'expense', description: 'Professional services fees' },
      { code: '6700', name: 'Depreciation Expense', type: 'expense', description: 'Depreciation of assets' },
      { code: '6800', name: 'Bank Fees', type: 'expense', description: 'Bank and financial service fees' },
      { code: '6900', name: 'Other Expenses', type: 'expense', description: 'Miscellaneous expenses' }
    ];

    defaultAccounts.forEach(account => this.createAccount(account));
  }

  private initializeDefaultContacts() {
    const defaultContacts: InsertContact[] = [
      { name: 'Acme Inc.', email: 'accounts@acme.com', phone: '555-123-4567', address: '123 Business St, City', type: 'customer' },
      { name: 'Global Solutions Ltd.', email: 'billing@globalsolutions.com', phone: '555-987-6543', address: '456 Corporate Ave, Town', type: 'customer' },
      { name: 'Office World', email: 'sales@officeworld.com', phone: '555-123-7890', address: '789 Supply Rd, County', type: 'vendor' },
      { name: 'Tech Services Co.', email: 'billing@techservices.com', phone: '555-456-7890', address: '321 Technology Blvd, State', type: 'vendor' },
      { name: 'Marketing Pros', email: 'invoices@marketingpros.com', phone: '555-234-5678', address: '567 Advertising Way, City', type: 'both' }
    ];

    defaultContacts.forEach(contact => this.createContact(contact));
  }

  // Account Methods
  async getAccounts(): Promise<Account[]> {
    return Array.from(this.accounts.values());
  }

  async getAccount(id: number): Promise<Account | undefined> {
    return this.accounts.get(id);
  }

  async getAccountByCode(code: string): Promise<Account | undefined> {
    return Array.from(this.accounts.values()).find(account => account.code === code);
  }

  async createAccount(account: InsertAccount): Promise<Account> {
    const id = this.accountIdCounter++;
    const newAccount: Account = {
      ...account,
      id,
      balance: 0,
      isActive: true
    };
    this.accounts.set(id, newAccount);
    return newAccount;
  }

  async updateAccount(id: number, accountUpdate: Partial<Account>): Promise<Account | undefined> {
    const account = this.accounts.get(id);
    if (!account) return undefined;

    const updatedAccount = { ...account, ...accountUpdate };
    this.accounts.set(id, updatedAccount);
    return updatedAccount;
  }

  // Sales Tax Methods
  async getSalesTaxes(): Promise<SalesTax[]> {
    return Array.from(this.salesTaxes.values());
  }

  async getSalesTax(id: number): Promise<SalesTax | undefined> {
    return this.salesTaxes.get(id);
  }

  async createSalesTax(salesTax: InsertSalesTax): Promise<SalesTax> {
    const id = this.salesTaxIdCounter++;
    const newSalesTax: SalesTax = {
      ...salesTax,
      id,
      isActive: salesTax.isActive !== undefined ? salesTax.isActive : true
    };
    this.salesTaxes.set(id, newSalesTax);
    return newSalesTax;
  }

  async updateSalesTax(id: number, salesTaxUpdate: Partial<SalesTax>): Promise<SalesTax | undefined> {
    const salesTax = this.salesTaxes.get(id);
    if (!salesTax) return undefined;

    const updatedSalesTax = { ...salesTax, ...salesTaxUpdate };
    this.salesTaxes.set(id, updatedSalesTax);
    return updatedSalesTax;
  }

  async deleteSalesTax(id: number): Promise<boolean> {
    if (!this.salesTaxes.has(id)) return false;
    return this.salesTaxes.delete(id);
  }

  // Contact Methods
  async getContacts(): Promise<Contact[]> {
    return Array.from(this.contacts.values());
  }

  async getContact(id: number): Promise<Contact | undefined> {
    return this.contacts.get(id);
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const id = this.contactIdCounter++;
    const newContact: Contact = { ...contact, id };
    this.contacts.set(id, newContact);
    return newContact;
  }

  async updateContact(id: number, contactUpdate: Partial<Contact>): Promise<Contact | undefined> {
    const contact = this.contacts.get(id);
    if (!contact) return undefined;

    const updatedContact = { ...contact, ...contactUpdate };
    this.contacts.set(id, updatedContact);
    return updatedContact;
  }

  // Transaction Methods
  async getTransactions(): Promise<Transaction[]> {
    return Array.from(this.transactions.values());
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async createTransaction(
    transaction: InsertTransaction, 
    items: InsertLineItem[], 
    entries: InsertLedgerEntry[]
  ): Promise<Transaction> {
    const id = this.transactionIdCounter++;
    const newTransaction: Transaction = { ...transaction, id };
    this.transactions.set(id, newTransaction);

    // Create line items
    items.forEach(item => {
      this.createLineItem({ ...item, transactionId: id });
    });

    // Create ledger entries and update account balances
    entries.forEach(entry => {
      this.createLedgerEntry({ ...entry, transactionId: id });
      
      this.updateAccountBalance(entry.accountId, entry.debit, entry.credit);
    });

    return newTransaction;
  }

  private async updateAccountBalance(accountId: number, debit: number, credit: number): Promise<void> {
    const account = await this.getAccount(accountId);
    if (!account) return;

    // Calculate new balance based on account type and debit/credit amounts
    let balanceChange = 0;
    
    if (account.type === 'asset' || account.type === 'expense') {
      // Debits increase assets and expenses
      balanceChange = debit - credit;
    } else {
      // Credits increase liabilities, equity, and income
      balanceChange = credit - debit;
    }

    await this.updateAccount(accountId, { balance: account.balance + balanceChange });
  }

  async updateTransaction(id: number, transactionUpdate: Partial<Transaction>): Promise<Transaction | undefined> {
    const transaction = this.transactions.get(id);
    if (!transaction) return undefined;

    const updatedTransaction = { ...transaction, ...transactionUpdate };
    this.transactions.set(id, updatedTransaction);
    return updatedTransaction;
  }

  async deleteTransaction(id: number): Promise<boolean> {
    // Check if transaction exists
    if (!this.transactions.has(id)) return false;

    // Get ledger entries to reverse account balances
    const ledgerEntries = await this.getLedgerEntriesByTransaction(id);
    
    // Reverse the effect on account balances - subtract debits and add credits
    for (const entry of ledgerEntries) {
      const account = await this.getAccount(entry.accountId);
      if (account) {
        let balanceChange = 0;
        
        if (account.type === 'asset' || account.type === 'expense') {
          // Debits increase assets and expenses, so subtract them for deletion
          balanceChange = -(entry.debit - entry.credit);
        } else {
          // Credits increase liabilities, equity, and income, so subtract them for deletion
          balanceChange = -(entry.credit - entry.debit);
        }
        
        await this.updateAccount(entry.accountId, { balance: account.balance + balanceChange });
      }
    }
    
    // Delete related ledger entries
    const ledgerEntriesToDelete = Array.from(this.ledgerEntries.values())
      .filter(entry => entry.transactionId === id);
    
    for (const entry of ledgerEntriesToDelete) {
      this.ledgerEntries.delete(entry.id);
    }
    
    // Delete related line items
    const lineItemsToDelete = Array.from(this.lineItems.values())
      .filter(item => item.transactionId === id);
    
    for (const item of lineItemsToDelete) {
      this.lineItems.delete(item.id);
    }
    
    // Delete the transaction
    return this.transactions.delete(id);
  }

  // Line Item Methods
  async getLineItemsByTransaction(transactionId: number): Promise<LineItem[]> {
    return Array.from(this.lineItems.values()).filter(
      item => item.transactionId === transactionId
    );
  }

  async createLineItem(lineItem: InsertLineItem): Promise<LineItem> {
    const id = this.lineItemIdCounter++;
    const newLineItem: LineItem = { ...lineItem, id };
    this.lineItems.set(id, newLineItem);
    return newLineItem;
  }

  // Ledger Entry Methods
  async getLedgerEntriesByTransaction(transactionId: number): Promise<LedgerEntry[]> {
    return Array.from(this.ledgerEntries.values()).filter(
      entry => entry.transactionId === transactionId
    );
  }

  async getAllLedgerEntries(): Promise<LedgerEntry[]> {
    return Array.from(this.ledgerEntries.values());
  }
  
  async getLedgerEntriesByDateRange(startDate?: Date, endDate?: Date): Promise<LedgerEntry[]> {
    const entries = Array.from(this.ledgerEntries.values());
    const transactions = Array.from(this.transactions.values());
    
    // Map to quickly look up transactions by ID
    const transactionMap = new Map<number, Transaction>();
    transactions.forEach(tx => transactionMap.set(tx.id, tx));
    
    // If no dates specified, return all entries
    if (!startDate && !endDate) {
      return entries;
    }
    
    return entries.filter(entry => {
      const transaction = transactionMap.get(entry.transactionId);
      if (!transaction) return false;
      
      const txDate = new Date(transaction.date);
      
      if (startDate && endDate) {
        return txDate >= startDate && txDate <= endDate;
      } else if (startDate) {
        return txDate >= startDate;
      } else if (endDate) {
        return txDate <= endDate;
      }
      
      return true;
    });
  }

  async createLedgerEntry(ledgerEntry: InsertLedgerEntry): Promise<LedgerEntry> {
    const id = this.ledgerEntryIdCounter++;
    const newLedgerEntry: LedgerEntry = { ...ledgerEntry, id };
    this.ledgerEntries.set(id, newLedgerEntry);
    return newLedgerEntry;
  }
  
  async updateLedgerEntry(id: number, ledgerEntryUpdate: Partial<LedgerEntry>): Promise<LedgerEntry | undefined> {
    const ledgerEntry = this.ledgerEntries.get(id);
    if (!ledgerEntry) return undefined;

    const updatedLedgerEntry = { ...ledgerEntry, ...ledgerEntryUpdate };
    this.ledgerEntries.set(id, updatedLedgerEntry);
    return updatedLedgerEntry;
  }

  // Reports
  async getAccountBalances(): Promise<{ account: Account; balance: number }[]> {
    const accounts = await this.getAccounts();
    return accounts.map(account => ({ account, balance: account.balance }));
  }

  async getIncomeStatement(startDate?: Date, endDate?: Date): Promise<{ revenues: number; expenses: number; netIncome: number }> {
    const accounts = await this.getAccounts();
    
    const revenueAccounts = accounts.filter(account => account.type === 'income');
    const expenseAccounts = accounts.filter(account => account.type === 'expense');
    
    const revenues = revenueAccounts.reduce((sum, account) => sum + account.balance, 0);
    const expenses = expenseAccounts.reduce((sum, account) => sum + account.balance, 0);
    
    return {
      revenues,
      expenses,
      netIncome: revenues - expenses
    };
  }

  async getBalanceSheet(): Promise<{ assets: number; liabilities: number; equity: number }> {
    const accounts = await this.getAccounts();
    
    const assetAccounts = accounts.filter(account => account.type === 'asset');
    const liabilityAccounts = accounts.filter(account => account.type === 'liability');
    const equityAccounts = accounts.filter(account => account.type === 'equity');
    
    const assets = assetAccounts.reduce((sum, account) => sum + account.balance, 0);
    const liabilities = liabilityAccounts.reduce((sum, account) => sum + account.balance, 0);
    const equity = equityAccounts.reduce((sum, account) => sum + account.balance, 0);
    
    return { assets, liabilities, equity };
  }

  // Product Methods
  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const id = this.productIdCounter++;
    const newProduct: Product = {
      ...product,
      id,
      isActive: product.isActive ?? true
    };
    this.products.set(id, newProduct);
    return newProduct;
  }

  async updateProduct(id: number, productUpdate: Partial<Product>): Promise<Product | undefined> {
    const product = this.products.get(id);
    if (!product) return undefined;

    const updatedProduct = { ...product, ...productUpdate };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<boolean> {
    if (!this.products.has(id)) return false;
    return this.products.delete(id);
  }
  
  // Settings Methods
  private companySettings: CompanySettings | undefined;
  private preferences: Preferences | undefined;
  
  async getCompanySettings(): Promise<CompanySettings | undefined> {
    return this.companySettings;
  }
  
  async saveCompanySettings(settings: InsertCompanySettings): Promise<CompanySettings> {
    const now = new Date();
    if (!this.companySettings) {
      this.companySettings = {
        id: 1,
        ...settings,
        updatedAt: now
      };
    } else {
      this.companySettings = {
        ...this.companySettings,
        ...settings,
        updatedAt: now
      };
    }
    return this.companySettings;
  }
  
  async getPreferences(): Promise<Preferences | undefined> {
    return this.preferences;
  }
  
  async savePreferences(preferences: InsertPreferences): Promise<Preferences> {
    const now = new Date();
    if (!this.preferences) {
      this.preferences = {
        id: 1,
        ...preferences,
        updatedAt: now
      };
    } else {
      this.preferences = {
        ...this.preferences,
        ...preferences,
        updatedAt: now
      };
    }
    return this.preferences;
  }
}

// Use DatabaseStorage instead of MemStorage for persistence
import { DatabaseStorage } from "./database-storage";
export const storage = new DatabaseStorage();
