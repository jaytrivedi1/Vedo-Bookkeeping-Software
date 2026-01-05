/**
 * Company Scoped Storage
 *
 * This class wraps the storage layer and ensures all queries are automatically
 * scoped to a specific company. This makes it impossible to accidentally fetch
 * or create data for the wrong company.
 *
 * Usage:
 *   const scopedStorage = createScopedStorage(req);
 *   const accounts = await scopedStorage.getAccounts(); // Always scoped!
 */

import { Request } from "express";
import { storage, IStorage } from "./storage";
import {
  Account, Contact, Transaction, LineItem, LedgerEntry, SalesTax, Product,
  InsertAccount, InsertContact, InsertTransaction, InsertLineItem, InsertLedgerEntry,
  InsertSalesTax, InsertProduct, ContactNote, InsertContactNote,
  ImportedTransaction, InsertImportedTransaction, BankConnection, BankAccount,
  CategorizationRule, InsertCategorizationRule
} from "@shared/schema";

/**
 * Error thrown when user doesn't have access to a resource
 */
export class CompanyAccessError extends Error {
  constructor(message: string = "Access denied to this resource") {
    super(message);
    this.name = "CompanyAccessError";
  }
}

/**
 * Error thrown when no company context is available
 */
export class NoCompanyContextError extends Error {
  constructor(message: string = "No company context available") {
    super(message);
    this.name = "NoCompanyContextError";
  }
}

/**
 * Company Scoped Storage class
 * Wraps storage methods to automatically filter by company
 */
export class CompanyScopedStorage {
  private readonly storage: IStorage;
  private readonly companyId: number;
  private readonly userId?: number;

  constructor(storage: IStorage, companyId: number, userId?: number) {
    this.storage = storage;
    this.companyId = companyId;
    this.userId = userId;
  }

  /**
   * Get the company ID this storage is scoped to
   */
  getCompanyId(): number {
    return this.companyId;
  }

  // ============ ACCOUNTS ============

  async getAccounts(): Promise<Account[]> {
    return this.storage.getAccounts(this.companyId);
  }

  async getAccount(id: number): Promise<Account | undefined> {
    const account = await this.storage.getAccount(id);
    if (account && account.companyId !== this.companyId) {
      return undefined; // Don't expose accounts from other companies
    }
    return account;
  }

  async getAccountByCode(code: string): Promise<Account | undefined> {
    return this.storage.getAccountByCode(code, this.companyId);
  }

  async createAccount(account: InsertAccount): Promise<Account> {
    return this.storage.createAccount({
      ...account,
      companyId: this.companyId
    });
  }

  async updateAccount(id: number, account: Partial<Account>): Promise<Account | undefined> {
    // Verify ownership first
    const existing = await this.storage.getAccount(id);
    if (!existing || existing.companyId !== this.companyId) {
      throw new CompanyAccessError("Account not found or access denied");
    }
    // Don't allow changing companyId
    const { companyId, ...safeUpdate } = account;
    return this.storage.updateAccount(id, safeUpdate);
  }

  async deleteAccount(id: number): Promise<boolean> {
    // Verify ownership first
    const existing = await this.storage.getAccount(id);
    if (!existing || existing.companyId !== this.companyId) {
      throw new CompanyAccessError("Account not found or access denied");
    }
    return this.storage.deleteAccount(id);
  }

  async hasAccountTransactions(accountId: number): Promise<boolean> {
    return this.storage.hasAccountTransactions(accountId);
  }

  async getAccountBalances(): Promise<{ account: Account; balance: number }[]> {
    return this.storage.getAccountBalances(this.companyId);
  }

  // ============ CONTACTS ============

  async getContacts(includeInactive?: boolean): Promise<Contact[]> {
    return this.storage.getContacts(this.companyId, includeInactive);
  }

  async getContact(id: number): Promise<Contact | undefined> {
    const contact = await this.storage.getContact(id);
    if (contact && contact.companyId !== this.companyId) {
      return undefined;
    }
    return contact;
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    return this.storage.createContact({
      ...contact,
      companyId: this.companyId
    });
  }

  async updateContact(id: number, contact: Partial<Contact>): Promise<Contact | undefined> {
    const existing = await this.storage.getContact(id);
    if (!existing || existing.companyId !== this.companyId) {
      throw new CompanyAccessError("Contact not found or access denied");
    }
    const { companyId, ...safeUpdate } = contact;
    return this.storage.updateContact(id, safeUpdate);
  }

  async deleteContact(id: number): Promise<boolean> {
    const existing = await this.storage.getContact(id);
    if (!existing || existing.companyId !== this.companyId) {
      throw new CompanyAccessError("Contact not found or access denied");
    }
    return this.storage.deleteContact(id);
  }

  async hasContactTransactions(contactId: number): Promise<boolean> {
    return this.storage.hasContactTransactions(contactId);
  }

  // ============ CONTACT NOTES ============

  async getContactNotes(contactId: number): Promise<ContactNote[]> {
    // Verify contact belongs to this company
    const contact = await this.getContact(contactId);
    if (!contact) {
      throw new CompanyAccessError("Contact not found or access denied");
    }
    return this.storage.getContactNotes(contactId);
  }

  async createContactNote(note: InsertContactNote): Promise<ContactNote> {
    // Verify contact belongs to this company
    const contact = await this.getContact(note.contactId);
    if (!contact) {
      throw new CompanyAccessError("Contact not found or access denied");
    }
    return this.storage.createContactNote(note);
  }

  // ============ TRANSACTIONS ============

  async getTransactions(): Promise<Transaction[]> {
    return this.storage.getTransactions(this.companyId);
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    const transaction = await this.storage.getTransaction(id);
    if (transaction && transaction.companyId !== this.companyId) {
      return undefined;
    }
    return transaction;
  }

  async createTransaction(
    transaction: InsertTransaction,
    lineItems: InsertLineItem[],
    ledgerEntries: InsertLedgerEntry[]
  ): Promise<Transaction> {
    return this.storage.createTransaction(
      { ...transaction, companyId: this.companyId },
      lineItems,
      ledgerEntries
    );
  }

  async updateTransaction(id: number, transaction: Partial<Transaction>): Promise<Transaction | undefined> {
    const existing = await this.storage.getTransaction(id);
    if (!existing || existing.companyId !== this.companyId) {
      throw new CompanyAccessError("Transaction not found or access denied");
    }
    const { companyId, ...safeUpdate } = transaction;
    return this.storage.updateTransaction(id, safeUpdate);
  }

  async deleteTransaction(id: number): Promise<boolean> {
    const existing = await this.storage.getTransaction(id);
    if (!existing || existing.companyId !== this.companyId) {
      throw new CompanyAccessError("Transaction not found or access denied");
    }
    return this.storage.deleteTransaction(id);
  }

  async getTransactionsByContact(contactId: number): Promise<Transaction[]> {
    return this.storage.getTransactionsByContact(contactId, this.companyId);
  }

  async getTransactionsByDescription(searchText: string, type?: string): Promise<Transaction[]> {
    return this.storage.getTransactionsByDescription(searchText, type, this.companyId);
  }

  async getRecentTransactions(limit: number): Promise<Transaction[]> {
    return this.storage.getRecentTransactions(limit, this.companyId);
  }

  // ============ LINE ITEMS & LEDGER ENTRIES ============

  async getLineItemsByTransaction(transactionId: number): Promise<LineItem[]> {
    // Verify transaction belongs to this company
    const transaction = await this.getTransaction(transactionId);
    if (!transaction) {
      throw new CompanyAccessError("Transaction not found or access denied");
    }
    return this.storage.getLineItemsByTransaction(transactionId);
  }

  async getLedgerEntriesByTransaction(transactionId: number): Promise<LedgerEntry[]> {
    const transaction = await this.getTransaction(transactionId);
    if (!transaction) {
      throw new CompanyAccessError("Transaction not found or access denied");
    }
    return this.storage.getLedgerEntriesByTransaction(transactionId);
  }

  // ============ PRODUCTS ============

  async getProducts(): Promise<Product[]> {
    return this.storage.getProducts(this.companyId);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const product = await this.storage.getProduct(id);
    if (product && product.companyId !== this.companyId) {
      return undefined;
    }
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    return this.storage.createProduct({
      ...product,
      companyId: this.companyId
    });
  }

  async updateProduct(id: number, product: Partial<Product>): Promise<Product | undefined> {
    const existing = await this.storage.getProduct(id);
    if (!existing || existing.companyId !== this.companyId) {
      throw new CompanyAccessError("Product not found or access denied");
    }
    const { companyId, ...safeUpdate } = product;
    return this.storage.updateProduct(id, safeUpdate);
  }

  async deleteProduct(id: number): Promise<boolean> {
    const existing = await this.storage.getProduct(id);
    if (!existing || existing.companyId !== this.companyId) {
      throw new CompanyAccessError("Product not found or access denied");
    }
    return this.storage.deleteProduct(id);
  }

  // ============ SALES TAXES ============

  async getSalesTaxes(): Promise<SalesTax[]> {
    return this.storage.getSalesTaxes(this.companyId);
  }

  async getSalesTax(id: number): Promise<SalesTax | undefined> {
    const tax = await this.storage.getSalesTax(id);
    if (tax && tax.companyId !== this.companyId) {
      return undefined;
    }
    return tax;
  }

  async createSalesTax(salesTax: InsertSalesTax): Promise<SalesTax> {
    return this.storage.createSalesTax({
      ...salesTax,
      companyId: this.companyId
    });
  }

  async updateSalesTax(id: number, salesTax: Partial<SalesTax>): Promise<SalesTax | undefined> {
    const existing = await this.storage.getSalesTax(id);
    if (!existing || existing.companyId !== this.companyId) {
      throw new CompanyAccessError("Sales tax not found or access denied");
    }
    const { companyId, ...safeUpdate } = salesTax;
    return this.storage.updateSalesTax(id, safeUpdate);
  }

  async deleteSalesTax(id: number): Promise<boolean> {
    const existing = await this.storage.getSalesTax(id);
    if (!existing || existing.companyId !== this.companyId) {
      throw new CompanyAccessError("Sales tax not found or access denied");
    }
    return this.storage.deleteSalesTax(id);
  }

  // ============ IMPORTED TRANSACTIONS ============

  async getImportedTransactions(): Promise<ImportedTransaction[]> {
    return this.storage.getImportedTransactions(this.companyId);
  }

  async getUnmatchedImportedTransactions(): Promise<ImportedTransaction[]> {
    return this.storage.getUnmatchedImportedTransactions(this.companyId);
  }

  // ============ SEARCH ============

  async searchAll(query: string): Promise<{
    transactions: any[];
    contacts: Contact[];
    accounts: Account[];
    products: any[];
  }> {
    return this.storage.searchAll(query, this.companyId);
  }

  // ============ REPORTS ============

  async getTrialBalance(asOfDate: Date, fiscalYearStartDate: Date) {
    return this.storage.getTrialBalance(asOfDate, fiscalYearStartDate);
  }

  async getIncomeStatement(startDate?: Date, endDate?: Date) {
    return this.storage.getIncomeStatement(startDate, endDate);
  }

  async getBalanceSheet() {
    return this.storage.getBalanceSheet();
  }

  async getCashFlowStatement(startDate?: Date, endDate?: Date) {
    return this.storage.getCashFlowStatement(startDate, endDate);
  }

  async getDashboardMetrics() {
    return this.storage.getDashboardMetrics();
  }

  // ============ BANK CONNECTIONS ============

  async getBankConnections(): Promise<BankConnection[]> {
    return this.storage.getBankConnections(this.companyId);
  }

  // ============ CATEGORIZATION RULES ============

  async getCategorizationRules(): Promise<CategorizationRule[]> {
    return this.storage.getCategorizationRules();
  }

  // ============ PASS-THROUGH METHODS (no company scoping needed) ============

  // These access the underlying storage directly for operations
  // that don't need company scoping or are already scoped

  getUnderlyingStorage(): IStorage {
    return this.storage;
  }
}

/**
 * Create a company-scoped storage instance from the request
 * Throws NoCompanyContextError if no company context is available
 */
export function createScopedStorage(req: Request): CompanyScopedStorage {
  if (!req.companyId) {
    throw new NoCompanyContextError(
      "No company context available. Ensure companyContextMiddleware is applied."
    );
  }
  return new CompanyScopedStorage(storage, req.companyId, req.user?.id);
}

/**
 * Safely create a scoped storage, returning null if no context
 * Use this when you want to handle missing context gracefully
 */
export function tryCreateScopedStorage(req: Request): CompanyScopedStorage | null {
  if (!req.companyId) {
    return null;
  }
  return new CompanyScopedStorage(storage, req.companyId, req.user?.id);
}
