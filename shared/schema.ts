import { pgTable, text, serial, integer, doublePrecision, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums for transaction types
export const accountTypeEnum = pgEnum('account_type', [
  'accounts_receivable', 'current_assets', 'bank', 'property_plant_equipment', 'long_term_assets',
  'accounts_payable', 'credit_card', 'other_current_liabilities', 'long_term_liabilities',
  'equity', 'income', 'other_income', 'cost_of_goods_sold', 'expenses', 'other_expense'
]);

export const transactionTypeEnum = pgEnum('transaction_type', [
  'invoice', 'expense', 'journal_entry', 'deposit'
]);

export const statusEnum = pgEnum('status', [
  'draft', 'pending', 'completed', 'cancelled', 'paid', 'overdue'
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
  reference: text('reference').notNull(),
  type: transactionTypeEnum('type').notNull(),
  date: timestamp('date').notNull().defaultNow(),
  description: text('description'),
  amount: doublePrecision('amount').notNull(),
  contactId: integer('contact_id').references(() => contacts.id),
  status: statusEnum('status').notNull().default('pending'),
});

// Line Items
export const lineItems = pgTable('line_items', {
  id: serial('id').primaryKey(),
  transactionId: integer('transaction_id').notNull().references(() => transactions.id),
  description: text('description').notNull(),
  quantity: doublePrecision('quantity').notNull().default(1),
  unitPrice: doublePrecision('unit_price').notNull(),
  amount: doublePrecision('amount').notNull(),
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

// Create insert schemas
export const insertAccountSchema = createInsertSchema(accounts).omit({ id: true, balance: true });
export const insertContactSchema = createInsertSchema(contacts).omit({ id: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true });
export const insertLineItemSchema = createInsertSchema(lineItems).omit({ id: true });
export const insertLedgerEntrySchema = createInsertSchema(ledgerEntries).omit({ id: true });

// Custom schemas for form validation
export const invoiceSchema = z.object({
  date: z.date(),
  contactId: z.number(),
  reference: z.string().min(1, "Reference is required"),
  description: z.string(),
  status: z.enum(["draft", "pending", "paid", "overdue"]),
  lineItems: z.array(
    z.object({
      description: z.string().min(1, "Description is required"),
      quantity: z.number().min(0.01, "Quantity must be greater than 0"),
      unitPrice: z.number().min(0, "Price cannot be negative"),
      amount: z.number()
    })
  ).min(1, "At least one line item is required"),
  // Additional fields for enhanced invoice functionality
  subTotal: z.number().optional(),
  taxRate: z.number().optional(),
  taxAmount: z.number().optional(),
  totalAmount: z.number().optional(),
  dueDate: z.date().optional(),
  paymentTerms: z.string().optional(),
});

export const expenseSchema = z.object({
  date: z.date(),
  contactId: z.number(),
  reference: z.string().min(1, "Reference is required"),
  description: z.string(),
  status: z.enum(["draft", "pending", "completed", "cancelled"]),
  lineItems: z.array(
    z.object({
      description: z.string().min(1, "Description is required"),
      quantity: z.number().min(0.01, "Quantity must be greater than 0"),
      unitPrice: z.number().min(0, "Price cannot be negative"),
      amount: z.number()
    })
  ).min(1, "At least one line item is required"),
});

export const journalEntrySchema = z.object({
  date: z.date(),
  reference: z.string().min(1, "Reference is required"),
  description: z.string().min(1, "Description is required"),
  entries: z.array(
    z.object({
      accountId: z.number(),
      description: z.string(),
      debit: z.number().min(0, "Debit amount cannot be negative"),
      credit: z.number().min(0, "Credit amount cannot be negative"),
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
  reference: z.string().min(1, "Reference is required"),
  description: z.string(),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  sourceAccountId: z.number(),
  destinationAccountId: z.number(),
});

// Types
export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type LineItem = typeof lineItems.$inferSelect;
export type InsertLineItem = z.infer<typeof insertLineItemSchema>;

export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type InsertLedgerEntry = z.infer<typeof insertLedgerEntrySchema>;

export type Invoice = z.infer<typeof invoiceSchema>;
export type Expense = z.infer<typeof expenseSchema>;
export type JournalEntry = z.infer<typeof journalEntrySchema>;
export type Deposit = z.infer<typeof depositSchema>;
