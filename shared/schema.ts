import { pgTable, text, serial, integer, doublePrecision, timestamp, boolean, pgEnum, decimal, json, varchar, date, uniqueIndex } from "drizzle-orm/pg-core";
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
  'invoice', 'expense', 'journal_entry', 'deposit', 'payment', 'bill', 'cheque', 'sales_receipt', 'transfer', 'customer_credit', 'vendor_credit'
]);

export const statusEnum = pgEnum('status', [
  'completed', 'cancelled', 'paid', 'overdue', 'partial', 'unapplied_credit', 'open', 'quotation', 'draft', 'approved'
]);

export const paymentMethodEnum = pgEnum('payment_method', [
  'cash', 'check', 'credit_card', 'bank_transfer', 'other'
]);

export const reconciliationStatusEnum = pgEnum('reconciliation_status', [
  'in_progress', 'completed', 'cancelled'
]);

export const cashFlowCategoryEnum = pgEnum('cash_flow_category', [
  'operating', 'investing', 'financing', 'none'
]);

// Chart of Accounts
export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  code: text('code').unique(),
  name: text('name').notNull(),
  type: accountTypeEnum('type').notNull(),
  currency: text('currency').default('USD'),
  salesTaxType: text('sales_tax_type'),
  balance: doublePrecision('balance').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  cashFlowCategory: cashFlowCategoryEnum('cash_flow_category').default('none'),
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
  isActive: boolean('is_active').notNull().default(true), // Active status for filtering
  notes: text('notes'), // Internal notes about this contact (not visible to customer/vendor) - DEPRECATED: use contact_notes table
  pinnedNote: text('pinned_note'), // Important note to display as alert banner across tabs
});

// Contact Notes - timestamped log entries for customer/vendor internal notes
export const contactNotesSchema = pgTable('contact_notes', {
  id: serial('id').primaryKey(),
  contactId: integer('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  isPinned: boolean('is_pinned').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  createdBy: integer('created_by'), // User ID who created the note (FK added separately)
});

// Transaction Headers
export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  reference: text('reference'),  // Made optional - can be left blank
  type: transactionTypeEnum('type').notNull(),
  date: timestamp('date').notNull().defaultNow(),
  description: text('description'),
  amount: doublePrecision('amount').notNull(), // Home currency amount (converted if foreign)
  subTotal: doublePrecision('sub_total'),
  taxAmount: doublePrecision('tax_amount'),
  taxType: varchar('tax_type', { length: 20 }), // 'exclusive' | 'inclusive' | 'no-tax'
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
  // Multi-currency fields
  currency: varchar('currency', { length: 3 }), // Foreign currency code (null = home currency)
  exchangeRate: decimal('exchange_rate', { precision: 18, scale: 6 }), // Rate used for conversion
  foreignAmount: decimal('foreign_amount', { precision: 15, scale: 2 }), // Original amount in foreign currency
  // Public invoice access
  secureToken: varchar('secure_token', { length: 64 }).unique(), // Secure token for public invoice view
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
  // Multi-currency support - stores foreign currency metadata for reference
  // Note: debit/credit amounts are ALWAYS in home currency (CAD)
  currency: varchar('currency', { length: 3 }),  // ISO currency code (e.g., EUR, USD)
  exchangeRate: decimal('exchange_rate', { precision: 18, scale: 6 }),  // Exchange rate used for conversion
  foreignAmount: decimal('foreign_amount', { precision: 15, scale: 2 }),  // Original amount in foreign currency
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
export const insertAccountSchema = createInsertSchema(accounts).omit({ id: true, balance: true }).extend({
  code: z.string().optional()
});
export const insertContactSchema = createInsertSchema(contacts).omit({ id: true });
export const insertContactNoteSchema = createInsertSchema(contactNotesSchema).omit({ id: true, createdAt: true });
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
  status: z.enum(["open", "paid", "overdue", "partial", "quotation", "draft", "approved"]),
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
  // Multi-currency fields
  currency: z.string().optional(),
  exchangeRate: z.union([z.string(), z.number()]).optional(),
  foreignAmount: z.number().optional(),
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

export type ContactNote = typeof contactNotesSchema.$inferSelect;
export type InsertContactNote = z.infer<typeof insertContactNoteSchema>;

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
  companyCode: text('company_code').unique(), // Unique identifier like VED-A7B2C9D4
  name: text('name').notNull(),
  street1: text('street1'),
  street2: text('street2'),
  city: text('city'),
  state: text('state'),
  postalCode: text('postal_code'),
  country: text('country'),
  phone: text('phone'),
  email: text('email'),
  website: text('website'),
  taxId: text('tax_id'),
  logoUrl: text('logo_url'),
  fiscalYearStartMonth: integer('fiscal_year_start_month').default(1), // 1=January, 12=December
  industry: text('industry'), // e.g., "Retail", "Professional Services", "Construction"
  companyType: text('company_type'), // e.g., "sole_proprietor", "partnership", "corporation", "llc"
  previousSoftware: text('previous_software'), // e.g., "quickbooks", "freshbooks", "wave", "spreadsheets", "none"
  referralSource: text('referral_source'), // e.g., "google", "friend", "accountant", "social_media", "other"
  isActive: boolean('is_active').default(true),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Settings schema for company details
export const companySchema = pgTable('company_settings', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  street1: text('street1'),
  street2: text('street2'),
  city: text('city'),
  state: text('state'),
  postalCode: text('postal_code'),
  country: text('country'),
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
  foreignCurrency: boolean('foreign_currency').default(false), // deprecated - use multiCurrencyEnabled
  defaultCurrency: text('default_currency').default('USD'), // deprecated - use homeCurrency
  multiCurrencyEnabled: boolean('multi_currency_enabled').default(false), // one-time enable, cannot disable
  homeCurrency: varchar('home_currency', { length: 3 }).default('USD'), // primary currency for business
  multiCurrencyEnabledAt: timestamp('multi_currency_enabled_at'), // track when multi-currency was enabled
  invoiceTemplate: text('invoice_template').default('classic'), // default invoice template (classic, modern, minimal, compact)
  transactionLockDate: timestamp('transaction_lock_date'), // lock transactions on or before this date
  // AI Categorization Settings
  aiCategorizationEnabled: boolean('ai_categorization_enabled').default(true), // Enable AI suggestions for new merchants
  aiAutoPostEnabled: boolean('ai_auto_post_enabled').default(false), // Auto-post high confidence matches (requires user consent)
  aiAutoPostMinConfidence: decimal('ai_auto_post_min_confidence', { precision: 3, scale: 2 }).default('0.95'), // Minimum confidence for auto-post (0.80-0.99)
  aiRuleGenerationEnabled: boolean('ai_rule_generation_enabled').default(true), // Auto-generate AI rules from patterns
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const insertCompanySchema = createInsertSchema(companySchema).omit({ id: true, updatedAt: true });
export const insertPreferencesSchema = createInsertSchema(preferencesSchema)
  .omit({ id: true, updatedAt: true })
  .extend({
    multiCurrencyEnabledAt: z.coerce.date().optional().nullable(),
    transactionLockDate: z.coerce.date().optional().nullable()
  });
export const insertCompaniesSchema = createInsertSchema(companiesSchema).omit({ 
  id: true, 
  companyCode: true,
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
export const roleEnum = pgEnum('role', ['admin', 'staff', 'read_only', 'accountant']);

// Accounting Firms schema - for accounting firms that manage multiple client companies
export const accountingFirmsSchema = pgTable('accounting_firms', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Users schema
export const usersSchema = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  role: roleEnum('role').notNull().default('read_only'),
  isActive: boolean('is_active').notNull().default(true),
  lastLogin: timestamp('last_login'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  companyId: integer('company_id').references(() => companiesSchema.id),
  firmId: integer('firm_id').references(() => accountingFirmsSchema.id), // For accountants belonging to a firm
  currentCompanyId: integer('current_company_id').references(() => companiesSchema.id), // Track which company context accountant is viewing
});

// Firm-Client Access - grants accounting firm users access to client companies
export const firmClientAccessSchema = pgTable('firm_client_access', {
  id: serial('id').primaryKey(),
  firmId: integer('firm_id').notNull().references(() => accountingFirmsSchema.id),
  companyId: integer('company_id').notNull().references(() => companiesSchema.id),
  grantedBy: integer('granted_by').references(() => usersSchema.id), // Company admin who granted access
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// User Invitations - for inviting new users to join
export const userInvitationsSchema = pgTable('user_invitations', {
  id: serial('id').primaryKey(),
  email: text('email').notNull(),
  token: text('token').notNull().unique(), // Unique secure token for accepting invitation
  role: roleEnum('role').notNull(),
  companyId: integer('company_id').references(() => companiesSchema.id), // For company users
  firmId: integer('firm_id').references(() => accountingFirmsSchema.id), // For firm users
  invitedBy: integer('invited_by').notNull().references(() => usersSchema.id),
  expiresAt: timestamp('expires_at').notNull(), // Invitation expiration
  acceptedAt: timestamp('accepted_at'), // When invitation was accepted
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Define company-user many-to-many relationship
export const userCompaniesSchema = pgTable('user_companies', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => usersSchema.id),
  companyId: integer('company_id').notNull().references(() => companiesSchema.id),
  role: roleEnum('role').notNull().default('read_only'), // Role can be specific to a company
  isPrimary: boolean('is_primary').default(false), // Indicates user's primary/default company
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

// Activity Log schema for audit trail
export const activityLogsSchema = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => usersSchema.id),
  action: text('action').notNull(), // e.g., "created", "updated", "deleted", "logged_in"
  entityType: text('entity_type'), // e.g., "invoice", "account", "customer", "payment"
  entityId: integer('entity_id'), // ID of the entity affected
  details: json('details'), // Additional context (old values, new values, etc.)
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Create schemas
export const insertAccountingFirmSchema = createInsertSchema(accountingFirmsSchema).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertUserSchema = createInsertSchema(usersSchema).omit({ 
  id: true, 
  lastLogin: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertFirmClientAccessSchema = createInsertSchema(firmClientAccessSchema).omit({
  id: true,
  createdAt: true
});

export const insertUserInvitationSchema = createInsertSchema(userInvitationsSchema).omit({
  id: true,
  createdAt: true
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

export const insertActivityLogSchema = createInsertSchema(activityLogsSchema).omit({
  id: true,
  createdAt: true
});

// Define types
export type AccountingFirm = typeof accountingFirmsSchema.$inferSelect;
export type InsertAccountingFirm = z.infer<typeof insertAccountingFirmSchema>;

export type User = typeof usersSchema.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type FirmClientAccess = typeof firmClientAccessSchema.$inferSelect;
export type InsertFirmClientAccess = z.infer<typeof insertFirmClientAccessSchema>;

export type UserInvitation = typeof userInvitationsSchema.$inferSelect;
export type InsertUserInvitation = z.infer<typeof insertUserInvitationSchema>;

export type UserCompany = typeof userCompaniesSchema.$inferSelect;
export type InsertUserCompany = z.infer<typeof insertUserCompanySchema>;

export type Permission = typeof permissionsSchema.$inferSelect;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;

export type RolePermission = typeof rolePermissionsSchema.$inferSelect;
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;

export type ActivityLog = typeof activityLogsSchema.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

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
  // Suggested categorization from rules
  suggestedAccountId: integer('suggested_account_id').references(() => accounts.id),
  suggestedSalesTaxId: integer('suggested_sales_tax_id').references(() => salesTaxSchema.id),
  suggestedContactName: text('suggested_contact_name'),
  suggestedMemo: text('suggested_memo'),
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

// Rule type enum for categorization rules
export const ruleTypeEnum = pgEnum('rule_type', ['manual', 'ai']);

// Bank Feed Categorization Rules
export const categorizationRulesSchema = pgTable('categorization_rules', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id').references(() => companiesSchema.id), // Company-specific rules
  name: text('name').notNull(),
  isEnabled: boolean('is_enabled').notNull().default(true),
  autoApply: boolean('auto_apply').notNull().default(true), // When true, automatically categorize matching transactions
  priority: integer('priority').notNull().default(0), // Lower number = higher priority (manual: 0-499, ai: 500-999)
  conditions: json('conditions').notNull(), // {descriptionContains, amountMin, amountMax}
  actions: json('actions').notNull(), // {accountId, contactName, memo}
  salesTaxId: integer('sales_tax_id').references(() => salesTaxSchema.id), // Optional sales tax to apply
  attachmentPath: text('attachment_path'), // Optional document attachment path
  // New fields for AI rule management
  ruleType: ruleTypeEnum('rule_type').notNull().default('manual'), // 'manual' or 'ai'
  sourceMerchantPattern: text('source_merchant_pattern'), // Normalized merchant name that triggered AI rule creation
  autoGeneratedAt: timestamp('auto_generated_at'), // When AI rule was auto-generated
  promotedToManualAt: timestamp('promoted_to_manual_at'), // When AI rule was promoted to manual
  occurrenceCount: integer('occurrence_count').default(0), // Number of transactions matched when rule was created
  confidenceScore: decimal('confidence_score', { precision: 5, scale: 4 }), // Confidence when rule was created (0.0000-1.0000)
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const insertCategorizationRuleSchema = createInsertSchema(categorizationRulesSchema).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type CategorizationRule = typeof categorizationRulesSchema.$inferSelect;
export type InsertCategorizationRule = z.infer<typeof insertCategorizationRuleSchema>;

// Merchant Patterns - learned categorizations from user behavior
export const merchantPatternsSchema = pgTable('merchant_patterns', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id').references(() => companiesSchema.id), // Company-specific patterns
  merchantNameNormalized: text('merchant_name_normalized').notNull(), // Normalized merchant name (e.g., "STARBUCKS")
  merchantNameVariants: json('merchant_name_variants').default([]), // Array of original names seen ["STARBUCKS #123", "STARBUCKS COFFEE"]
  defaultAccountId: integer('default_account_id').references(() => accounts.id),
  defaultContactId: integer('default_contact_id').references(() => contacts.id),
  defaultSalesTaxId: integer('default_sales_tax_id').references(() => salesTaxSchema.id),
  defaultTransactionType: text('default_transaction_type'), // expense, deposit, etc.
  totalOccurrences: integer('total_occurrences').notNull().default(0), // Total times this merchant was categorized
  userConfirmations: integer('user_confirmations').notNull().default(0), // Times user confirmed suggestion
  userCorrections: integer('user_corrections').notNull().default(0), // Times user changed suggestion
  confidenceScore: decimal('confidence_score', { precision: 5, scale: 4 }).notNull().default('0.5000'), // Calculated confidence (0.0000-1.0000)
  lastSeenAt: timestamp('last_seen_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const insertMerchantPatternSchema = createInsertSchema(merchantPatternsSchema).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type MerchantPattern = typeof merchantPatternsSchema.$inferSelect;
export type InsertMerchantPattern = z.infer<typeof insertMerchantPatternSchema>;

// Suggestion source enum
export const suggestionSourceEnum = pgEnum('suggestion_source', ['pattern', 'rule', 'ai', 'none']);

// Categorization Feedback - tracks user decisions for learning
export const categorizationFeedbackSchema = pgTable('categorization_feedback', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id').references(() => companiesSchema.id), // Company-specific feedback
  importedTransactionId: integer('imported_transaction_id').references(() => importedTransactionsSchema.id),
  // Transaction info for analysis
  merchantName: text('merchant_name'),
  merchantNameNormalized: text('merchant_name_normalized'),
  transactionAmount: decimal('transaction_amount', { precision: 15, scale: 2 }),
  transactionDate: date('transaction_date'),
  // What was suggested
  suggestionSource: suggestionSourceEnum('suggestion_source'), // Where suggestion came from
  suggestedAccountId: integer('suggested_account_id').references(() => accounts.id),
  suggestedContactId: integer('suggested_contact_id').references(() => contacts.id),
  suggestedTaxId: integer('suggested_tax_id').references(() => salesTaxSchema.id),
  aiConfidence: text('ai_confidence'), // High, Medium, Low
  // What user chose
  chosenAccountId: integer('chosen_account_id').references(() => accounts.id),
  chosenContactId: integer('chosen_contact_id').references(() => contacts.id),
  chosenTaxId: integer('chosen_tax_id').references(() => salesTaxSchema.id),
  // Outcome
  wasSuggestionAccepted: boolean('was_suggestion_accepted'), // Did user accept the suggestion as-is?
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const insertCategorizationFeedbackSchema = createInsertSchema(categorizationFeedbackSchema).omit({
  id: true,
  createdAt: true
});

export type CategorizationFeedback = typeof categorizationFeedbackSchema.$inferSelect;
export type InsertCategorizationFeedback = z.infer<typeof insertCategorizationFeedbackSchema>;

// Multi-Currency Support Tables

// Currencies table - stores all available currencies
export const currenciesSchema = pgTable('currencies', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 3 }).notNull().unique(), // USD, CAD, EUR, etc.
  name: text('name').notNull(), // US Dollar, Canadian Dollar, etc.
  symbol: varchar('symbol', { length: 10 }).notNull(), // $, €, £, etc.
  decimals: integer('decimals').notNull().default(2), // number of decimal places
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Exchange rates table - stores currency conversion rates
export const exchangeRatesSchema = pgTable('exchange_rates', {
  id: serial('id').primaryKey(),
  fromCurrency: varchar('from_currency', { length: 3 }).notNull(), // e.g., USD
  toCurrency: varchar('to_currency', { length: 3 }).notNull(), // e.g., CAD
  rate: decimal('rate', { precision: 18, scale: 6 }).notNull(), // conversion rate
  effectiveDate: date('effective_date').notNull(), // date this rate is effective
  isManual: boolean('is_manual').notNull().default(false), // true if user manually set this rate
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  // Unique constraint to prevent duplicate rates for the same currency pair on the same date
  uniqueRatePerDay: uniqueIndex('unique_rate_per_day').on(table.fromCurrency, table.toCurrency, table.effectiveDate),
}));

// FX Realizations table - tracks realized foreign exchange gains/losses
export const fxRealizationsSchema = pgTable('fx_realizations', {
  id: serial('id').primaryKey(),
  transactionId: integer('transaction_id').references(() => transactions.id), // original invoice/bill
  paymentId: integer('payment_id').references(() => transactions.id), // payment transaction
  originalRate: decimal('original_rate', { precision: 18, scale: 6 }).notNull(),
  paymentRate: decimal('payment_rate', { precision: 18, scale: 6 }).notNull(),
  foreignAmount: decimal('foreign_amount', { precision: 15, scale: 2 }).notNull(),
  gainLossAmount: decimal('gain_loss_amount', { precision: 15, scale: 2 }).notNull(), // in home currency
  realizedDate: date('realized_date').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// FX Revaluations table - tracks unrealized foreign exchange gains/losses (month-end)
export const fxRevaluationsSchema = pgTable('fx_revaluations', {
  id: serial('id').primaryKey(),
  revaluationDate: date('revaluation_date').notNull(),
  accountType: varchar('account_type', { length: 50 }).notNull(), // AR, AP, Bank
  currency: varchar('currency', { length: 3 }).notNull(),
  foreignBalance: decimal('foreign_balance', { precision: 15, scale: 2 }).notNull(),
  originalRate: decimal('original_rate', { precision: 18, scale: 6 }).notNull(),
  revaluationRate: decimal('revaluation_rate', { precision: 18, scale: 6 }).notNull(),
  unrealizedGainLoss: decimal('unrealized_gain_loss', { precision: 15, scale: 2 }).notNull(), // in home currency
  journalEntryId: integer('journal_entry_id').references(() => transactions.id), // journal entry that posted this
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Currency locks table - prevents currency changes after first transaction
export const currencyLocksSchema = pgTable('currency_locks', {
  id: serial('id').primaryKey(),
  entityType: varchar('entity_type', { length: 50 }).notNull(), // customer, vendor, bank_account
  entityId: integer('entity_id').notNull(),
  lockedAt: timestamp('locked_at').notNull().defaultNow(),
  firstTransactionId: integer('first_transaction_id').references(() => transactions.id),
});

// Insert schemas for multi-currency tables
export const insertCurrencySchema = createInsertSchema(currenciesSchema).omit({
  id: true,
  createdAt: true
});

export const insertExchangeRateSchema = createInsertSchema(exchangeRatesSchema).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertFxRealizationSchema = createInsertSchema(fxRealizationsSchema).omit({
  id: true,
  createdAt: true
});

export const insertFxRevaluationSchema = createInsertSchema(fxRevaluationsSchema).omit({
  id: true,
  createdAt: true
});

export const insertCurrencyLockSchema = createInsertSchema(currencyLocksSchema).omit({
  id: true,
  lockedAt: true
});

// Types for multi-currency tables
export type Currency = typeof currenciesSchema.$inferSelect;
export type InsertCurrency = z.infer<typeof insertCurrencySchema>;

export type ExchangeRate = typeof exchangeRatesSchema.$inferSelect;
export type InsertExchangeRate = z.infer<typeof insertExchangeRateSchema>;

export type FxRealization = typeof fxRealizationsSchema.$inferSelect;
export type InsertFxRealization = z.infer<typeof insertFxRealizationSchema>;

export type FxRevaluation = typeof fxRevaluationsSchema.$inferSelect;
export type InsertFxRevaluation = z.infer<typeof insertFxRevaluationSchema>;

export type CurrencyLock = typeof currencyLocksSchema.$inferSelect;
export type InsertCurrencyLock = z.infer<typeof insertCurrencyLockSchema>;

// Recurring Invoices - automated invoice generation on schedule
export const recurringStatusEnum = pgEnum('recurring_status', [
  'active', 'paused', 'cancelled', 'completed'
]);

export const recurringFrequencyEnum = pgEnum('recurring_frequency', [
  'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'custom'
]);

export const recurringTemplatesSchema = pgTable('recurring_templates', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id').notNull().references(() => contacts.id),
  templateName: text('template_name').notNull(),
  currency: varchar('currency', { length: 3 }).default('USD'),
  frequency: recurringFrequencyEnum('frequency').notNull(),
  frequencyValue: integer('frequency_value').default(1), // For custom: every N days/weeks/months
  frequencyUnit: text('frequency_unit'), // For custom: days, weeks, months
  startDate: date('start_date').notNull(),
  endDate: date('end_date'), // null means no end date
  maxOccurrences: integer('max_occurrences'), // Alternative to end date
  currentOccurrences: integer('current_occurrences').default(0),
  dayOfMonth: integer('day_of_month'), // 1-31 or -1 for last business day
  timezone: text('timezone').default('UTC'),
  nextRunAt: timestamp('next_run_at').notNull(),
  lastRunAt: timestamp('last_run_at'),
  status: recurringStatusEnum('status').notNull().default('active'),
  autoEmail: boolean('auto_email').default(false),
  autoCharge: boolean('auto_charge').default(false),
  previewBeforeSend: boolean('preview_before_send').default(false),
  paymentTerms: text('payment_terms'),
  memo: text('memo'),
  attachments: text('attachments').array(),
  subTotal: doublePrecision('sub_total').notNull().default(0),
  taxAmount: doublePrecision('tax_amount').notNull().default(0),
  totalAmount: doublePrecision('total_amount').notNull().default(0),
  exchangeRate: decimal('exchange_rate', { precision: 18, scale: 6 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const recurringLinesSchema = pgTable('recurring_lines', {
  id: serial('id').primaryKey(),
  templateId: integer('template_id').notNull().references(() => recurringTemplatesSchema.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  quantity: doublePrecision('quantity').notNull().default(1),
  unitPrice: doublePrecision('unit_price').notNull(),
  amount: doublePrecision('amount').notNull(),
  accountId: integer('account_id').references(() => accounts.id),
  salesTaxId: integer('sales_tax_id').references(() => salesTaxSchema.id),
  productId: integer('product_id').references(() => productsSchema.id),
  orderIndex: integer('order_index').default(0),
});

export const recurringHistorySchema = pgTable('recurring_history', {
  id: serial('id').primaryKey(),
  templateId: integer('template_id').notNull().references(() => recurringTemplatesSchema.id),
  invoiceId: integer('invoice_id').references(() => transactions.id),
  scheduledAt: timestamp('scheduled_at').notNull(),
  generatedAt: timestamp('generated_at'),
  sentAt: timestamp('sent_at'),
  paidAt: timestamp('paid_at'),
  status: text('status').notNull(), // scheduled, generated, sent, paid, failed, skipped
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0),
  metadata: json('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Insert schemas for recurring invoice tables
export const insertRecurringTemplateSchema = createInsertSchema(recurringTemplatesSchema).omit({
  id: true,
  currentOccurrences: true,
  createdAt: true,
  updatedAt: true
});

export const insertRecurringLineSchema = createInsertSchema(recurringLinesSchema).omit({
  id: true
});

export const insertRecurringHistorySchema = createInsertSchema(recurringHistorySchema).omit({
  id: true,
  createdAt: true
});

// Types for recurring invoice tables
export type RecurringTemplate = typeof recurringTemplatesSchema.$inferSelect;
export type InsertRecurringTemplate = z.infer<typeof insertRecurringTemplateSchema>;

export type RecurringLine = typeof recurringLinesSchema.$inferSelect;
export type InsertRecurringLine = z.infer<typeof insertRecurringLineSchema>;

export type RecurringHistory = typeof recurringHistorySchema.$inferSelect;
export type InsertRecurringHistory = z.infer<typeof insertRecurringHistorySchema>;

// Invoice Activities - track invoice lifecycle events
export const activityTypeEnum = pgEnum('activity_type', [
  'created', 'sent', 'viewed', 'paid', 'edited', 'overdue', 'reminder_sent', 'cancelled'
]);

export const invoiceActivitiesSchema = pgTable('invoice_activities', {
  id: serial('id').primaryKey(),
  invoiceId: integer('invoice_id').notNull().references(() => transactions.id),
  activityType: activityTypeEnum('activity_type').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  userId: integer('user_id').references(() => usersSchema.id), // null if activity from client
  metadata: json('metadata'), // Additional context: email, IP address, etc.
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const insertInvoiceActivitySchema = createInsertSchema(invoiceActivitiesSchema).omit({
  id: true,
  createdAt: true
});

export type InvoiceActivity = typeof invoiceActivitiesSchema.$inferSelect;
export type InsertInvoiceActivity = z.infer<typeof insertInvoiceActivitySchema>;

// AI Chat Conversations - stores chat conversation sessions
export const aiConversationsSchema = pgTable('ai_conversations', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id').references(() => companiesSchema.id),
  userId: integer('user_id').references(() => usersSchema.id),
  title: text('title').notNull().default('New Conversation'),
  isArchived: boolean('is_archived').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// AI Chat Messages - stores individual messages within conversations
export const aiMessagesSchema = pgTable('ai_messages', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id').notNull().references(() => aiConversationsSchema.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'user' or 'assistant'
  content: text('content').notNull(),
  data: json('data'), // For tables, charts, or structured data
  actions: json('actions'), // Suggested actions (buttons)
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Insert schemas for AI chat tables
export const insertAiConversationSchema = createInsertSchema(aiConversationsSchema).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertAiMessageSchema = createInsertSchema(aiMessagesSchema).omit({
  id: true,
  createdAt: true
});

// Types for AI chat tables
export type AiConversation = typeof aiConversationsSchema.$inferSelect;
export type InsertAiConversation = z.infer<typeof insertAiConversationSchema>;

export type AiMessage = typeof aiMessagesSchema.$inferSelect;
export type InsertAiMessage = z.infer<typeof insertAiMessageSchema>;
