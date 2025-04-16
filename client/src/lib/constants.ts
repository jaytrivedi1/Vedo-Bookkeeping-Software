// Account Types
export enum AccountType {
  ACCOUNTS_RECEIVABLE = 'accounts_receivable',
  CURRENT_ASSETS = 'current_assets',
  BANK = 'bank',
  PROPERTY_PLANT_EQUIPMENT = 'property_plant_equipment',
  LONG_TERM_ASSETS = 'long_term_assets',
  ACCOUNTS_PAYABLE = 'accounts_payable',
  CREDIT_CARD = 'credit_card',
  OTHER_CURRENT_LIABILITIES = 'other_current_liabilities',
  LONG_TERM_LIABILITIES = 'long_term_liabilities',
  EQUITY = 'equity',
  INCOME = 'income',
  OTHER_INCOME = 'other_income',
  COST_OF_GOODS_SOLD = 'cost_of_goods_sold',
  EXPENSES = 'expenses',
  OTHER_EXPENSE = 'other_expense',
  
  // Legacy types for backward compatibility
  ASSET = 'asset',
  LIABILITY = 'liability',
  EXPENSE = 'expense'
}

// Transaction Types
export enum TransactionType {
  INVOICE = 'invoice',
  PAYMENT = 'payment',
  EXPENSE = 'expense',
  JOURNAL_ENTRY = 'journal_entry',
  DEPOSIT = 'deposit'
}

// Transaction Statuses
export enum TransactionStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  OVERDUE = 'overdue',
  COMPLETED = 'completed',
  VOID = 'void'
}

// Contact Types
export enum ContactType {
  CUSTOMER = 'customer',
  VENDOR = 'vendor',
  EMPLOYEE = 'employee',
  OTHER = 'other'
}

// Payment Methods
export enum PaymentMethod {
  CASH = 'cash',
  CHECK = 'check',
  CREDIT_CARD = 'credit_card',
  BANK_TRANSFER = 'bank_transfer',
  OTHER = 'other'
}

// Currency Codes
export const CURRENCY_CODES = [
  'USD', 'CAD', 'EUR', 'GBP', 'AUD', 'JPY', 'CNY'
];

// Date Formats
export const DATE_FORMAT = 'MMM dd, yyyy';
export const DATE_TIME_FORMAT = 'MMM dd, yyyy HH:mm';