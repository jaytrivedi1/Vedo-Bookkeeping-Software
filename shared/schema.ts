import { pgTable, text, serial, integer, doublePrecision, timestamp, boolean, pgEnum, decimal, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums for transaction types
export const accountTypeEnum = pgEnum('account_type', [
  'accounts_receivable', 'current_assets', 'bank', 'property_plant_equipment', 'long_term_assets',
  'accounts_payable', 'credit_card', 'other_current_liabilities', 'long_term_liabilities',
  'equity', 'income', 'other_income', 'cost_of_goods_sold', 'expenses', 'other_expense'
]);

export enum AccountType {
  ACCOUNTS_RECEIVABLE = 'accounts_receivable',
  CURRENT_ASSETS = 'current_assets',
  BANK = 'bank',
  FIXED_ASSETS = 'property_plant_equipment',
  LONG_TERM_ASSETS = 'long_term_assets',
  ACCOUNTS_PAYABLE = 'accounts_payable',
  CREDIT = 'credit_card',
  CURRENT_LIABILITIES = 'other_current_liabilities',
  LONG_TERM_LIABILITIES = 'long_term_liabilities',
  EQUITY = 'equity',
  INCOME = 'income',
  OTHER_INCOME = 'other_income',
  COGS = 'cost_of_goods_sold',
  EXPENSES = 'expenses',
  OTHER_EXPENSE = 'other_expense'
}

export const transactionTypeEnum = pgEnum('transaction_type', [
  'invoice', 'expense', 'journal_entry', 'deposit', 'payment', 'bill', 'cheque', 'sales_receipt', 'transfer'
]);

export const statusEnum = pgEnum('status', [
  'completed', 'cancelled', 'paid', 'overdue', 'partial', 'unapplied_credit', 'open'
]);

export const paymentMethodEnum = pgEnum('payment_method', [
  'cash', 'check', 'credit_card', 'bank_transfer', 'other'
]);

export const reconciliationStatusEnum = pgEnum('reconciliation_status', [
  'in_progress', 'completed', 'cancelled'
]);

// Chart of Accounts
export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  type: accountTypeEnum('type').notNull(),
  currency: text('currency').default('USD'),
  salesTaxType: text('sales_tax_type'),
  balance: doublePrecision('balance').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
});

// Relations are defined through foreign keys in the table definitions

// Contacts (Customers and Vendors)
export const contacts = pgTable('contacts', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(), // Company/Business name
  contactName: text('contact_name'), // Primary contact person's name
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  type: text('type').notNull(), // customer, vendor, or both
  currency: text('currency').default('USD'), // Default currency for this contact
  defaultTaxRate: doublePrecision('default_tax_rate').default(0), // Default sales tax rate
  documentIds: text('document_ids').array(), // Array of document IDs for attachments
});

// Transaction Headers
export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  reference: text('reference'),  // Made optional - can be left blank
  type: transactionTypeEnum('type').notNull(),
  date: timestamp('date').notNull().defaultNow(),
  description: text('description'),
  amount: doublePrecision('amount').notNull(),
  subTotal: doublePrecision('sub_total'),
  taxAmount: doublePrecision('tax_amount'),
  balance: doublePrecision('balance'),
  contactId: integer('contact_id').references(() => contacts.id),
  status: statusEnum('status').notNull().default('open'),
  paymentMethod: paymentMethodEnum('payment_method'),
  paymentAccountId: integer('payment_account_id').references(() => accounts.id),
  paymentDate: timestamp('payment_date'),
  memo: text('memo'),
  attachments: text('attachments').array(),
  dueDate: timestamp('due_date'),
  paymentTerms: text('payment_terms'),
});

// Line Items
export const lineItems = pgTable('line_items', {
  id: serial('id').primaryKey(),
  transactionId: integer('transaction_id').notNull().references(() => transactions.id),
  description: text('description').notNull(),
  quantity: doublePrecision('quantity').notNull().default(1),
  unitPrice: doublePrecision('unit_price').notNull(),
  amount: doublePrecision('amount').notNull(),
  accountId: integer('account_id').references(() => accounts.id), // Added for expense account tracking
  salesTaxId: integer('sales_tax_id').references(() => salesTaxSchema.id),
  productId: integer('product_id').references(() => productsSchema.id), // Added for product tracking
});

// Ledger Entries (for double-entry accounting)
export const ledgerEntries = pgTable('ledger_entries', {
  id: serial('id').primaryKey(),
  transactionId: integer('transaction_id').notNull().references(() => transactions.id),
  accountId: integer('account_id').notNull().references(() => accounts.id),
  description: text('description'),
  debit: doublePrecision('debit').notNull().default(0),
  credit: doublePrecision('credit').notNull().default(0),
  date: timestamp('date').notNull().defaultNow(),
});

// Payment Applications (tracks which payments are applied to which invoices)
export const paymentApplications = pgTable('payment_applications', {
  id: serial('id').primaryKey(),
  paymentId: integer('payment_id').notNull().references(() => transactions.id),
  invoiceId: integer('invoice_id').notNull().references(() => transactions.id),
  amountApplied: doublePrecision('amount_applied').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Reconciliations (tracks account reconciliation sessions)
export const reconciliations = pgTable('reconciliations', {
  id: serial('id').primaryKey(),
  accountId: integer('account_id').notNull().references(() => accounts.id),
  statementDate: timestamp('statement_date').notNull(),
  statementEndingBalance: doublePrecision('statement_ending_balance').notNull(),
  clearedBalance: doublePrecision('cleared_balance').notNull().default(0),
  difference: doublePrecision('difference').notNull().default(0),
  status: reconciliationStatusEnum('status').notNull().default('in_progress'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  notes: text('notes'),
});

// Reconciliation Items (tracks which ledger entries are cleared/reconciled)
export const reconciliationItems = pgTable('reconciliation_items', {
  id: serial('id').primaryKey(),
  reconciliationId: integer('reconciliation_id').notNull().references(() => reconciliations.id),
  ledgerEntryId: integer('ledger_entry_id').notNull().references(() => ledgerEntries.id),
  isCleared: boolean('is_cleared').notNull().default(false),
});

// Create insert schemas
export const insertAccountSchema = createInsertSchema(accounts).omit({ id: true, balance: true });
export const insertContactSchema = createInsertSchema(contacts).omit({ id: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true });
export const insertLineItemSchema = createInsertSchema(lineItems).omit({ id: true });
export const insertLedgerEntrySchema = createInsertSchema(ledgerEntries).omit({ id: true });
export const insertPaymentApplicationSchema = createInsertSchema(paymentApplications).omit({ id: true, createdAt: true });
export const insertReconciliationSchema = createInsertSchema(reconciliations).omit({ id: true, createdAt: true, completedAt: true, clearedBalance: true, difference: true });
export const insertReconciliationItemSchema = createInsertSchema(reconciliationItems).omit({ id: true });

// Custom schemas for form validation
export const invoiceSchema = z.object({
  date: z.date(),
  contactId: z.number(),
  reference: z.string().min(1, "Reference is required"),
  description: z.string(),
  status: z.enum(["open", "paid", "overdue", "partial"]),
  lineItems: z.array(
    z.object({
      description: z.string().min(1, "Description is required"),
      quantity: z.number().min(0.01, "Quantity must be greater than 0"),
      unitPrice: z.number().min(0, "Price cannot be negative"),
      amount: z.number(),
      salesTaxId: z.number().optional(),
      productId: z.preprocess(
        (val) => (val === '' || val === undefined || val === null ? undefined : val),
        z.coerce.number().optional()
      )
    })
  ).min(1, "At least one line item is required"),
  // Additional fields for enhanced invoice functionality
  subTotal: z.number().optional(),
  taxAmount: z.number().optional(),
  totalAmount: z.number().optional(),
  dueDate: z.date().optional(),
  paymentTerms: z.string().optional(),
});

export const expenseSchema = z.object({
  date: z.date(),
  contactId: z.number().optional(),
  reference: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["open", "completed", "cancelled"]),
  paymentMethod: z.enum(["cash", "check", "credit_card", "bank_transfer", "other"]).optional(),
  paymentAccountId: z.number({required_error: "Payment account is required"}),
  paymentDate: z.date().optional(),
  memo: z.string().optional(),
  lineItems: z.array(
    z.object({
      accountId: z.number({required_error: "Account is required"}),
      description: z.string().optional(),
      amount: z.number().min(0, "Amount cannot be negative"),
      salesTaxId: z.number().optional(),
    })
  ).min(1, "At least one line item is required"),
  subTotal: z.number().optional(),
  taxAmount: z.number().optional(),
  totalAmount: z.number().optional(),
});

export const chequeSchema = z.object({
  date: z.date(),
  contactId: z.number({required_error: "Payee is required"}),
  reference: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["open", "completed", "cancelled"]),
  paymentAccountId: z.number({required_error: "Bank account is required"}),
  paymentDate: z.date().optional(),
  memo: z.string().optional(),
  lineItems: z.array(
    z.object({
      accountId: z.number({required_error: "Account is required"}),
      description: z.string().optional(),
      amount: z.number().min(0, "Amount cannot be negative"),
      salesTaxId: z.number().optional(),
    })
  ).min(1, "At least one line item is required"),
  subTotal: z.number().optional(),
  taxAmount: z.number().optional(),
  totalAmount: z.number().optional(),
});

export const journalEntrySchema = z.object({
  date: z.date(),
  reference: z.string().min(1, "Reference is required"),
  description: z.string().optional(),
  attachments: z.string().optional(),
  entries: z.array(
    z.object({
      accountId: z.number(),
      contactId: z.number().optional(),
      description: z.string(),
      debit: z.number().min(0, "Debit amount cannot be negative"),
      credit: z.number().min(0, "Credit amount cannot be negative"),
      salesTaxId: z.number().optional(),
    })
  ).min(2, "At least two entries are required")
  .refine(entries => {
    const totalDebits = entries.reduce((sum, entry) => sum + entry.debit, 0);
    const totalCredits = entries.reduce((sum, entry) => sum + entry.credit, 0);
    return Math.abs(totalDebits - totalCredits) < 0.001; // Allow for small floating point differences
  }, "Total debits must equal total credits")
});

export const depositSchema = z.object({
  date: z.date(),
  reference: z.string().optional(),
  description: z.string(),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  sourceAccountId: z.number(),
  destinationAccountId: z.number(),
  contactId: z.number().optional(),
});

// Types
export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;

export type Transaction = typeof transactions.$inferSelect & {
  appliedCredits?: { id: number; amount: number }[];
  appliedCreditAmount?: number;
};
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type LineItem = typeof lineItems.$inferSelect;
export type InsertLineItem = z.infer<typeof insertLineItemSchema>;

export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type InsertLedgerEntry = z.infer<typeof insertLedgerEntrySchema>;

export type PaymentApplication = typeof paymentApplications.$inferSelect;
export type InsertPaymentApplication = z.infer<typeof insertPaymentApplicationSchema>;

export type Reconciliation = typeof reconciliations.$inferSelect;
export type InsertReconciliation = z.infer<typeof insertReconciliationSchema>;

export type ReconciliationItem = typeof reconciliationItems.$inferSelect;
export type InsertReconciliationItem = z.infer<typeof insertReconciliationItemSchema>;

// Forward declare salesTaxSchema to fix circular reference
export const salesTaxesTable = 'sales_taxes';

// Sales Tax Schema
export const salesTaxSchema = pgTable(salesTaxesTable, {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  rate: doublePrecision('rate').notNull().default(0),
  accountId: integer('account_id').references(() => accounts.id),
  isActive: boolean('is_active').default(true),
  isComposite: boolean('is_composite').default(false),
  parentId: integer('parent_id').references((): any => salesTaxSchema.id),
  displayOrder: integer('display_order').default(0),
});

export const insertSalesTaxSchema = createInsertSchema(salesTaxSchema).omit({ id: true });

// Tax Component Schema (to store component taxes for composite taxes like GST+QST)
export const salesTaxComponentsSchema = pgTable('sales_tax_components', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  rate: doublePrecision('rate').notNull().default(0),
  accountId: integer('account_id').references(() => accounts.id),
  parentTaxId: integer('parent_tax_id').notNull().references(() => salesTaxSchema.id),
  displayOrder: integer('display_order').default(0),
});

export const insertSalesTaxComponentSchema = createInsertSchema(salesTaxComponentsSchema).omit({ id: true });

export type SalesTax = typeof salesTaxSchema.$inferSelect;
export type InsertSalesTax = z.infer<typeof insertSalesTaxSchema>;
export type SalesTaxComponent = typeof salesTaxComponentsSchema.$inferSelect;
export type InsertSalesTaxComponent = z.infer<typeof insertSalesTaxComponentSchema>;

// Interface for tax component information in forms
export interface TaxComponentInfo {
  name: string;
  rate: number;
  accountId: number | null;
}

// Products & Services schema
export const productsSchema = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  sku: text('sku'),
  type: text('type', { enum: ['product', 'service'] }).notNull().default('product'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull().default('0'),
  cost: decimal('cost', { precision: 10, scale: 2 }).default('0'),
  accountId: integer('account_id').references(() => accounts.id).notNull(),
  salesTaxId: integer('sales_tax_id').references(() => salesTaxSchema.id),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(productsSchema, {
  id: undefined,
  createdAt: undefined, 
  updatedAt: undefined
});

export type Product = typeof productsSchema.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

// Bill schema for vendor purchases
export const billSchema = z.object({
  date: z.date(),
  contactId: z.number(),
  reference: z.string().min(1, "Reference is required"),
  description: z.string(),
  status: z.enum(["open", "paid", "overdue", "partial"]),
  lineItems: z.array(
    z.object({
      description: z.string(),
      quantity: z.number().min(0.01, "Quantity must be greater than 0"),
      unitPrice: z.number().min(0, "Price cannot be negative"),
      amount: z.number(),
      accountId: z.number().optional(), // expense account
      salesTaxId: z.number().nullable().optional(), // sales tax ID reference
      productId: z.number().optional() // product reference
    })
  ).min(1, "At least one line item is required"),
  // Additional fields for bill functionality
  subTotal: z.number().optional(),
  taxAmount: z.number().optional(),
  totalAmount: z.number().optional(),
  dueDate: z.date().optional(),
  paymentTerms: z.string().optional(),
  attachment: z.string().optional(), // File attachment name or reference
});

export type Invoice = z.infer<typeof invoiceSchema>;
export type Bill = z.infer<typeof billSchema>;
export type Expense = z.infer<typeof expenseSchema>;
export type JournalEntry = z.infer<typeof journalEntrySchema>;
export type Deposit = z.infer<typeof depositSchema>;

// Companies schema to manage multiple company books
export const companiesSchema = pgTable('companies', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address'),
  phone: text('phone'),
  email: text('email'),
  website: text('website'),
  taxId: text('tax_id'),
  logoUrl: text('logo_url'),
  fiscalYearStartMonth: integer('fiscal_year_start_month').default(1), // 1=January, 12=December
  isActive: boolean('is_active').default(true),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Settings schema for company details
export const companySchema = pgTable('company_settings', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address'),
  phone: text('phone'),
  email: text('email'),
  website: text('website'),
  taxId: text('tax_id'),
  logoUrl: text('logo_url'),
  fiscalYearStartMonth: integer('fiscal_year_start_month').default(1), // 1=January, 12=December
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Settings schema for application preferences
export const preferencesSchema = pgTable('preferences', {
  id: serial('id').primaryKey(),
  darkMode: boolean('dark_mode').default(false),
  foreignCurrency: boolean('foreign_currency').default(false),
  defaultCurrency: text('default_currency').default('USD'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const insertCompanySchema = createInsertSchema(companySchema).omit({ id: true, updatedAt: true });
export const insertPreferencesSchema = createInsertSchema(preferencesSchema).omit({ id: true, updatedAt: true });
export const insertCompaniesSchema = createInsertSchema(companiesSchema).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  isDefault: true
});

export type CompanySettings = typeof companySchema.$inferSelect;
export type InsertCompanySettings = z.infer<typeof insertCompanySchema>;

export type Preferences = typeof preferencesSchema.$inferSelect;
export type InsertPreferences = z.infer<typeof insertPreferencesSchema>;

export type Company = typeof companiesSchema.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompaniesSchema>;

// Role-based access control (RBAC)
export const roleEnum = pgEnum('role', ['admin', 'accountant', 'bookkeeper', 'viewer']);

// Users schema
export const usersSchema = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  role: roleEnum('role').notNull().default('viewer'),
  isActive: boolean('is_active').notNull().default(true),
  lastLogin: timestamp('last_login'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  companyId: integer('company_id').references(() => companiesSchema.id),
});

// Define company-user many-to-many relationship
export const userCompaniesSchema = pgTable('user_companies', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => usersSchema.id),
  companyId: integer('company_id').notNull().references(() => companiesSchema.id),
  role: roleEnum('role').notNull().default('viewer'), // Role can be specific to a company
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Define permissions schema
export const permissionsSchema = pgTable('permissions', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(), // e.g., "create_invoice", "delete_contact", etc.
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Define role-permission many-to-many relationship
export const rolePermissionsSchema = pgTable('role_permissions', {
  id: serial('id').primaryKey(),
  role: roleEnum('role').notNull(),
  permissionId: integer('permission_id').notNull().references(() => permissionsSchema.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Create schemas
export const insertUserSchema = createInsertSchema(usersSchema).omit({ 
  id: true, 
  lastLogin: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertUserCompanySchema = createInsertSchema(userCompaniesSchema).omit({
  id: true,
  createdAt: true
});

export const insertPermissionSchema = createInsertSchema(permissionsSchema).omit({
  id: true,
  createdAt: true
});

export const insertRolePermissionSchema = createInsertSchema(rolePermissionsSchema).omit({
  id: true,
  createdAt: true
});

// Define types
export type User = typeof usersSchema.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type UserCompany = typeof userCompaniesSchema.$inferSelect;
export type InsertUserCompany = z.infer<typeof insertUserCompanySchema>;

export type Permission = typeof permissionsSchema.$inferSelect;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;

export type RolePermission = typeof rolePermissionsSchema.$inferSelect;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;

// Bank Connections (for Plaid integration)
export const bankConnectionsSchema = pgTable('bank_connections', {
  id: serial('id').primaryKey(),
  itemId: text('item_id').notNull().unique(), // Plaid item_id
  accessToken: text('access_token').notNull(), // Plaid access_token (encrypted in production)
  institutionId: text('institution_id').notNull(),
  institutionName: text('institution_name').notNull(),
  accountIds: text('account_ids').array().notNull(), // Array of Plaid account IDs
  status: text('status').notNull().default('active'), // active, inactive, error
  lastSync: timestamp('last_sync'),
  error: text('error'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Bank Accounts (individual accounts from bank connection)
export const bankAccountsSchema = pgTable('bank_accounts', {
  id: serial('id').primaryKey(),
  connectionId: integer('connection_id').notNull().references(() => bankConnectionsSchema.id),
  plaidAccountId: text('plaid_account_id').notNull().unique(),
  name: text('name').notNull(),
  mask: text('mask'), // Last 4 digits of account
  officialName: text('official_name'),
  type: text('type').notNull(), // checking, savings, credit card, etc.
  subtype: text('subtype'),
  currentBalance: doublePrecision('current_balance'),
  availableBalance: doublePrecision('available_balance'),
  linkedAccountId: integer('linked_account_id').references(() => accounts.id), // Link to chart of accounts
  isActive: boolean('is_active').notNull().default(true),
  lastSyncedAt: timestamp('last_synced_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// CSV Column Mapping Preferences (remembers user's column choices)
export const csvMappingPreferencesSchema = pgTable('csv_mapping_preferences', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => usersSchema.id),
  accountId: integer('account_id').notNull().references(() => accounts.id), // Which bank account
  dateColumn: text('date_column').notNull(),
  descriptionColumn: text('description_column').notNull(),
  amountColumn: text('amount_column'), // For 3-column format
  creditColumn: text('credit_column'), // For 4-column format
  debitColumn: text('debit_column'), // For 4-column format
  dateFormat: text('date_format').notNull().default('MM/DD/YYYY'),
  hasHeaderRow: boolean('has_header_row').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Imported Transactions (from bank feeds - Plaid or CSV)
export const importedTransactionsSchema = pgTable('imported_transactions', {
  id: serial('id').primaryKey(),
  source: text('source').notNull().default('plaid'), // 'plaid' or 'csv'
  bankAccountId: integer('bank_account_id').references(() => bankAccountsSchema.id), // For Plaid imports
  accountId: integer('account_id').references(() => accounts.id), // For CSV imports (chart of accounts)
  plaidTransactionId: text('plaid_transaction_id').unique(), // Only for Plaid
  date: timestamp('date').notNull(),
  authorizedDate: timestamp('authorized_date'),
  name: text('name').notNull(),
  merchantName: text('merchant_name'),
  amount: doublePrecision('amount').notNull(),
  isoCurrencyCode: text('iso_currency_code'),
  category: text('category').array(), // Plaid categories
  pending: boolean('pending').notNull().default(false),
  paymentChannel: text('payment_channel'), // online, in store, etc.
  matchedTransactionId: integer('matched_transaction_id').references(() => transactions.id), // Link to created or existing transaction (null for multi-match)
  matchedTransactionType: text('matched_transaction_type'), // Type of matched transaction: 'invoice', 'bill', 'payment', 'expense', etc.
  matchConfidence: doublePrecision('match_confidence'), // Confidence score (0-100) for suggested matches
  isManualMatch: boolean('is_manual_match').default(false), // true = linked to existing entry (no new transaction), false = new transaction created
  isMultiMatch: boolean('is_multi_match').default(false), // true = matched to multiple transactions
  status: text('status').notNull().default('unmatched'), // unmatched, matched, ignored, deleted
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Transaction Attachments (for imported transactions)
export const transactionAttachmentsSchema = pgTable('transaction_attachments', {
  id: serial('id').primaryKey(),
  importedTransactionId: integer('imported_transaction_id').notNull().references(() => importedTransactionsSchema.id),
  fileName: text('file_name').notNull(),
  filePath: text('file_path').notNull(),
  fileSize: integer('file_size').notNull(), // in bytes
  mimeType: text('mime_type').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Bank Transaction Matches (tracks one-to-many relationship between bank transactions and accounting transactions)
export const bankTransactionMatchesSchema = pgTable('bank_transaction_matches', {
  id: serial('id').primaryKey(),
  importedTransactionId: integer('imported_transaction_id').notNull().references(() => importedTransactionsSchema.id),
  matchedTransactionId: integer('matched_transaction_id').notNull().references(() => transactions.id),
  amountApplied: doublePrecision('amount_applied').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Insert schemas
export const insertBankConnectionSchema = createInsertSchema(bankConnectionsSchema).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertBankAccountSchema = createInsertSchema(bankAccountsSchema).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertImportedTransactionSchema = createInsertSchema(importedTransactionsSchema).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertCsvMappingPreferenceSchema = createInsertSchema(csvMappingPreferencesSchema).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertTransactionAttachmentSchema = createInsertSchema(transactionAttachmentsSchema).omit({
  id: true,
  createdAt: true
});

export const insertBankTransactionMatchSchema = createInsertSchema(bankTransactionMatchesSchema).omit({
  id: true,
  createdAt: true
});

// Types
export type BankConnection = typeof bankConnectionsSchema.$inferSelect;
export type InsertBankConnection = z.infer<typeof insertBankConnectionSchema>;

export type BankAccount = typeof bankAccountsSchema.$inferSelect;
export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;

export type ImportedTransaction = typeof importedTransactionsSchema.$inferSelect;
export type InsertImportedTransaction = z.infer<typeof insertImportedTransactionSchema>;

export type CsvMappingPreference = typeof csvMappingPreferencesSchema.$inferSelect;
export type InsertCsvMappingPreference = z.infer<typeof insertCsvMappingPreferenceSchema>;

export type TransactionAttachment = typeof transactionAttachmentsSchema.$inferSelect;
export type InsertTransactionAttachment = z.infer<typeof insertTransactionAttachmentSchema>;

export type BankTransactionMatch = typeof bankTransactionMatchesSchema.$inferSelect;
export type InsertBankTransactionMatch = z.infer<typeof insertBankTransactionMatchSchema>;
