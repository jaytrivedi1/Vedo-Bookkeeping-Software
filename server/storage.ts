import {
  accounts,
  contacts,
  contactNotesSchema,
  transactions,
  lineItems,
  ledgerEntries,
  salesTaxSchema,
  productsSchema,
  companySchema,
  preferencesSchema,
  companiesSchema,
  usersSchema,
  userCompaniesSchema,
  permissionsSchema,
  rolePermissionsSchema,
  bankConnectionsSchema,
  bankAccountsSchema,
  importedTransactionsSchema,
  type Account,
  type InsertAccount,
  type Contact,
  type InsertContact,
  type ContactNote,
  type InsertContactNote,
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
  type User,
  type InsertUser,
  type UserCompany,
  type InsertUserCompany,
  type Permission,
  type InsertPermission,
  type RolePermission,
  type InsertRolePermission,
  type BankConnection,
  type InsertBankConnection,
  type BankAccount,
  type InsertBankAccount,
  type ImportedTransaction,
  type InsertImportedTransaction,
  type CsvMappingPreference,
  type InsertCsvMappingPreference,
  reconciliations,
  reconciliationItems,
  type Reconciliation,
  type InsertReconciliation,
  type ReconciliationItem,
  type InsertReconciliationItem,
  categorizationRulesSchema,
  type CategorizationRule,
  type InsertCategorizationRule,
  currenciesSchema,
  exchangeRatesSchema,
  fxRealizationsSchema,
  fxRevaluationsSchema,
  currencyLocksSchema,
  type Currency,
  type InsertCurrency,
  type ExchangeRate,
  type InsertExchangeRate,
  type FxRealization,
  type InsertFxRealization,
  type FxRevaluation,
  type InsertFxRevaluation,
  type CurrencyLock,
  type InsertCurrencyLock,
  activityLogsSchema,
  type ActivityLog,
  type InsertActivityLog,
  accountingFirmsSchema,
  type AccountingFirm,
  type InsertAccountingFirm,
  firmClientAccessSchema,
  type FirmClientAccess,
  type InsertFirmClientAccess,
  userInvitationsSchema,
  type UserInvitation,
  type InsertUserInvitation,
  recurringTemplatesSchema,
  recurringLinesSchema,
  recurringHistorySchema,
  type RecurringTemplate,
  type InsertRecurringTemplate,
  type RecurringLine,
  type InsertRecurringLine,
  type RecurringHistory,
  type InsertRecurringHistory,
  aiConversationsSchema,
  aiMessagesSchema,
  type AiConversation,
  type InsertAiConversation,
  type AiMessage,
  type InsertAiMessage,
} from "@shared/schema";

export interface IStorage {
  // Accounts (companyId for data isolation)
  getAccounts(companyId?: number): Promise<Account[]>;
  getAccount(id: number): Promise<Account | undefined>;
  getAccountByCode(code: string, companyId?: number): Promise<Account | undefined>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: number, account: Partial<Account>): Promise<Account | undefined>;
  deleteAccount(id: number): Promise<boolean>;
  hasAccountTransactions(accountId: number): Promise<boolean>;

  // Sales Taxes (companyId for data isolation)
  getSalesTaxes(companyId?: number): Promise<SalesTax[]>;
  getSalesTax(id: number): Promise<SalesTax | undefined>;
  createSalesTax(salesTax: InsertSalesTax): Promise<SalesTax>;
  updateSalesTax(id: number, salesTax: Partial<SalesTax>): Promise<SalesTax | undefined>;
  deleteSalesTax(id: number): Promise<boolean>;

  // Products & Services (companyId for data isolation)
  getProducts(companyId?: number): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<Product>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;

  // Contacts (companyId for data isolation)
  getContacts(companyId?: number, includeInactive?: boolean): Promise<Contact[]>;
  getContact(id: number): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: number, contact: Partial<Contact>): Promise<Contact | undefined>;
  deleteContact(id: number): Promise<boolean>;
  hasContactTransactions(contactId: number): Promise<boolean>;

  // Contact Notes
  getContactNotes(contactId: number): Promise<ContactNote[]>;
  getContactNote(id: number): Promise<ContactNote | undefined>;
  createContactNote(note: InsertContactNote): Promise<ContactNote>;
  updateContactNote(id: number, note: Partial<ContactNote>): Promise<ContactNote | undefined>;
  deleteContactNote(id: number): Promise<boolean>;
  unpinAllContactNotes(contactId: number): Promise<void>;

  // Transactions (companyId for data isolation)
  getTransactions(companyId?: number): Promise<Transaction[]>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction, lineItems: InsertLineItem[], ledgerEntries: InsertLedgerEntry[]): Promise<Transaction>;
  updateTransaction(id: number, transaction: Partial<Transaction>): Promise<Transaction | undefined>;
  deleteTransaction(id: number): Promise<boolean>;
  getTransactionsByContact(contactId: number, companyId?: number): Promise<Transaction[]>;
  getTransactionsByDescription(searchText: string, type?: string, companyId?: number): Promise<Transaction[]>;
  getTransactionsByContactAndType(contactId: number, type: string, companyId?: number): Promise<Transaction[]>;
  getRecentTransactions(limit: number, companyId?: number): Promise<Transaction[]>;
  
  // Global Search (companyId for data isolation)
  searchAll(query: string, companyId?: number): Promise<{
    transactions: any[];
    contacts: Contact[];
    accounts: Account[];
    products: any[];
  }>;

  // Line Items
  getLineItemsByTransaction(transactionId: number): Promise<LineItem[]>;
  createLineItem(lineItem: InsertLineItem): Promise<LineItem>;

  // Ledger Entries
  getLedgerEntriesByTransaction(transactionId: number): Promise<LedgerEntry[]>;
  getAllLedgerEntries(): Promise<LedgerEntry[]>;
  getAllLedgerEntriesByCompany(companyId: number): Promise<any[]>;
  getLedgerEntriesUpToDate(asOfDate: Date): Promise<LedgerEntry[]>;
  getLedgerEntriesUpToDateByCompany(asOfDate: Date, companyId: number): Promise<LedgerEntry[]>;
  getLedgerEntriesByDateRange(startDate?: Date, endDate?: Date): Promise<LedgerEntry[]>;
  getLedgerEntriesByDateRangeAndCompany(startDate: Date | undefined, endDate: Date | undefined, companyId: number): Promise<any[]>;
  getLedgerEntry(id: number): Promise<LedgerEntry | undefined>;
  createLedgerEntry(ledgerEntry: InsertLedgerEntry): Promise<LedgerEntry>;
  updateLedgerEntry(id: number, ledgerEntry: Partial<LedgerEntry>): Promise<LedgerEntry | undefined>;
  createPaymentApplication(application: { paymentId: number; invoiceId: number; amountApplied: number }): Promise<any>;

  // Reports (companyId for data isolation)
  getAccountBalances(companyId?: number): Promise<{ account: Account; balance: number }[]>;
  getTrialBalance(asOfDate: Date, fiscalYearStartDate: Date, companyId?: number): Promise<{
    account: Account;
    totalDebits: number;
    totalCredits: number;
    debitBalance: number;
    creditBalance: number;
  }[]>;
  getIncomeStatement(startDate?: Date, endDate?: Date, companyId?: number): Promise<{ revenues: number; expenses: number; netIncome: number }>;
  getBalanceSheet(companyId?: number): Promise<{ assets: number; liabilities: number; equity: number }>;
  getCashFlowStatement(startDate?: Date, endDate?: Date, companyId?: number): Promise<{
    period: { startDate: Date | null; endDate: Date | null };
    categories: {
      operating: { total: number; accounts: Array<{ account: Account; amount: number }> };
      investing: { total: number; accounts: Array<{ account: Account; amount: number }> };
      financing: { total: number; accounts: Array<{ account: Account; amount: number }> };
    };
    netChange: number;
    openingCash: number;
    closingCash: number;
  }>;
  getDashboardMetrics(companyId?: number): Promise<{
    profitLoss: {
      netProfit: number;
      percentageChange: number;
      income: number;
      expenses: number;
    };
    expensesByCategory: Array<{ category: string; amount: number }>;
    invoices: {
      unpaid: { count: number; amount: number };
      paid: { count: number; amount: number };
      overdue: { count: number; amount: number };
      deposited: { count: number; amount: number };
    };
    bankAccounts: {
      total: number;
      accounts: Array<{ name: string; balance: number; updated: string }>;
    };
    sales: Array<{ month: string; amount: number }>;
    accountsReceivable: {
      total: number;
      current: number;
      days30: number;
      days60: number;
      days90Plus: number;
    };
  }>;
  
  // Accounting helpers for Retained Earnings and Net Income (companyId for data isolation)
  calculatePriorYearsRetainedEarnings(asOfDate: Date, fiscalYearStartMonth: number, companyId?: number): Promise<number>;
  calculateCurrentYearNetIncome(asOfDate: Date, fiscalYearStartMonth: number, companyId?: number): Promise<number>;
  
  // Companies
  getCompanies(): Promise<Company[]>;
  getCompany(id: number): Promise<Company | undefined>;
  getCompanyByCode(code: string): Promise<Company | undefined>;
  getDefaultCompany(): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, company: Partial<Company>): Promise<Company | undefined>;
  setDefaultCompany(id: number): Promise<Company | undefined>;
  
  // Settings
  getCompanySettings(): Promise<CompanySettings | undefined>;
  saveCompanySettings(settings: InsertCompanySettings): Promise<CompanySettings>;
  getPreferences(companyId?: number): Promise<Preferences | undefined>;
  savePreferences(preferences: InsertPreferences, companyId?: number): Promise<Preferences>;
  updatePreferences(updates: Partial<InsertPreferences>, companyId?: number): Promise<Preferences>;
  
  // User Management
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  updateUserLastLogin(id: number): Promise<User | undefined>;
  
  // User-Company Assignments
  getUserCompanies(userId: number): Promise<UserCompany[]>;
  getCompanyUsers(companyId: number): Promise<UserCompany[]>;
  assignUserToCompany(userCompany: InsertUserCompany): Promise<UserCompany>;
  updateUserCompanyRole(userId: number, companyId: number, role: string): Promise<UserCompany | undefined>;
  updateUserCompanyPrimary(userId: number, companyId: number, isPrimary: boolean): Promise<UserCompany | undefined>;
  removeUserFromCompany(userId: number, companyId: number): Promise<boolean>;
  
  // Permissions
  getPermissions(): Promise<Permission[]>;
  getPermission(id: number): Promise<Permission | undefined>;
  getPermissionByName(name: string): Promise<Permission | undefined>;
  createPermission(permission: InsertPermission): Promise<Permission>;
  deletePermission(id: number): Promise<boolean>;
  
  // Role Permissions
  getRolePermissions(role: string): Promise<RolePermission[]>;
  addPermissionToRole(rolePermission: InsertRolePermission): Promise<RolePermission>;
  removePermissionFromRole(role: string, permissionId: number): Promise<boolean>;
  
  // Authentication helpers
  validatePassword(storedPassword: string, suppliedPassword: string): Promise<boolean>;
  hashPassword(password: string): Promise<string>;
  
  // Bank Connections (companyId for data isolation)
  getBankConnections(companyId?: number): Promise<BankConnection[]>;
  getBankConnection(id: number): Promise<BankConnection | undefined>;
  getBankConnectionByItemId(itemId: string): Promise<BankConnection | undefined>;
  createBankConnection(connection: InsertBankConnection): Promise<BankConnection>;
  updateBankConnection(id: number, connection: Partial<BankConnection>): Promise<BankConnection | undefined>;
  deleteBankConnection(id: number): Promise<boolean>;
  
  // Bank Accounts
  getBankAccounts(): Promise<BankAccount[]>;
  getBankAccount(id: number): Promise<BankAccount | undefined>;
  getBankAccountsByConnectionId(connectionId: number): Promise<BankAccount[]>;
  getBankAccountByPlaidId(plaidAccountId: string): Promise<BankAccount | undefined>;
  createBankAccount(account: InsertBankAccount): Promise<BankAccount>;
  updateBankAccount(id: number, account: Partial<BankAccount>): Promise<BankAccount | undefined>;
  deleteBankAccount(id: number): Promise<boolean>;
  
  // Imported Transactions (companyId for data isolation)
  getImportedTransactions(companyId?: number): Promise<ImportedTransaction[]>;
  getImportedTransaction(id: number): Promise<ImportedTransaction | undefined>;
  getImportedTransactionsByBankAccount(bankAccountId: number): Promise<ImportedTransaction[]>;
  getImportedTransactionByPlaidId(plaidTransactionId: string): Promise<ImportedTransaction | undefined>;
  getUnmatchedImportedTransactions(companyId?: number): Promise<ImportedTransaction[]>;
  createImportedTransaction(transaction: InsertImportedTransaction): Promise<ImportedTransaction>;
  updateImportedTransaction(id: number, transaction: Partial<ImportedTransaction>): Promise<ImportedTransaction | undefined>;
  deleteImportedTransaction(id: number): Promise<boolean>;
  
  // CSV Mapping Preferences
  getCsvMappingPreference(userId: number, accountId: number): Promise<CsvMappingPreference | undefined>;
  createCsvMappingPreference(preference: InsertCsvMappingPreference): Promise<CsvMappingPreference>;
  updateCsvMappingPreference(id: number, preference: Partial<InsertCsvMappingPreference>): Promise<CsvMappingPreference>;
  bulkCreateImportedTransactions(transactions: InsertImportedTransaction[]): Promise<ImportedTransaction[]>;
  
  // Reconciliations
  getReconciliations(): Promise<Reconciliation[]>;
  getReconciliation(id: number): Promise<Reconciliation | undefined>;
  getReconciliationsByAccount(accountId: number): Promise<Reconciliation[]>;
  createReconciliation(reconciliation: InsertReconciliation): Promise<Reconciliation>;
  updateReconciliation(id: number, reconciliation: Partial<Reconciliation>): Promise<Reconciliation | undefined>;
  deleteReconciliation(id: number): Promise<boolean>;
  getLedgerEntriesForReconciliation(accountId: number, statementDate: Date): Promise<LedgerEntry[]>;
  
  // Reconciliation Items
  getReconciliationItems(reconciliationId: number): Promise<ReconciliationItem[]>;
  createReconciliationItem(item: InsertReconciliationItem): Promise<ReconciliationItem>;
  updateReconciliationItem(id: number, item: Partial<ReconciliationItem>): Promise<ReconciliationItem | undefined>;
  bulkUpsertReconciliationItems(reconciliationId: number, ledgerEntryIds: number[], isCleared: boolean): Promise<void>;

  // Categorization Rules
  getCategorizationRules(companyId?: number): Promise<CategorizationRule[]>;
  getCategorizationRule(id: number): Promise<CategorizationRule | undefined>;
  createCategorizationRule(rule: InsertCategorizationRule): Promise<CategorizationRule>;
  updateCategorizationRule(id: number, rule: Partial<CategorizationRule>): Promise<CategorizationRule | undefined>;
  deleteCategorizationRule(id: number): Promise<boolean>;
  
  // Currencies
  getCurrencies(): Promise<Currency[]>;
  getCurrency(code: string): Promise<Currency | undefined>;
  
  // Exchange Rates
  getExchangeRates(fromCurrency?: string, effectiveDate?: string): Promise<ExchangeRate[]>;
  getExchangeRate(id: number): Promise<ExchangeRate | undefined>;
  getExchangeRateForDate(fromCurrency: string, toCurrency: string, date: Date): Promise<ExchangeRate | undefined>;
  createExchangeRate(exchangeRate: InsertExchangeRate): Promise<ExchangeRate>;
  updateExchangeRate(id: number, exchangeRate: Partial<ExchangeRate>): Promise<ExchangeRate | undefined>;
  deleteExchangeRate(id: number): Promise<boolean>;
  
  // FX Realizations
  getFxRealizations(): Promise<FxRealization[]>;
  getFxRealizationsByTransaction(transactionId: number): Promise<FxRealization[]>;
  createFxRealization(fxRealization: InsertFxRealization): Promise<FxRealization>;
  
  // FX Revaluations
  getFxRevaluations(): Promise<FxRevaluation[]>;
  getFxRevaluation(id: number): Promise<FxRevaluation | undefined>;
  createFxRevaluation(fxRevaluation: InsertFxRevaluation): Promise<FxRevaluation>;
  getForeignCurrencyBalances(asOfDate: Date): Promise<Array<{
    currency: string;
    accountType: string;
    foreignBalance: string;
    originalRate: string;
  }>>;
  
  // Currency Locks
  getCurrencyLocks(): Promise<CurrencyLock[]>;
  getCurrencyLockByEntity(entityType: string, entityId: number): Promise<CurrencyLock | undefined>;
  createCurrencyLock(currencyLock: InsertCurrencyLock): Promise<CurrencyLock>;
  
  // Activity Logs
  getActivityLogs(filters?: {
    userId?: number;
    entityType?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }): Promise<ActivityLog[]>;
  getActivityLog(id: number): Promise<ActivityLog | undefined>;
  createActivityLog(activityLog: InsertActivityLog): Promise<ActivityLog>;
  
  // User Management
  getUsers(filters?: { companyId?: number; firmId?: number; includeInactive?: boolean }): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  
  // Accounting Firms
  getAccountingFirms(): Promise<AccountingFirm[]>;
  getAccountingFirm(id: number): Promise<AccountingFirm | undefined>;
  createAccountingFirm(firm: InsertAccountingFirm): Promise<AccountingFirm>;
  updateAccountingFirm(id: number, firm: Partial<AccountingFirm>): Promise<AccountingFirm | undefined>;
  deleteAccountingFirm(id: number): Promise<boolean>;
  
  // Firm Client Access
  getFirmClientAccess(firmId: number): Promise<FirmClientAccess[]>;
  getClientFirms(companyId: number): Promise<FirmClientAccess[]>;
  createFirmClientAccess(access: InsertFirmClientAccess): Promise<FirmClientAccess>;
  revokeFirmClientAccess(id: number): Promise<boolean>;
  
  // User Invitations
  getUserInvitations(filters?: { companyId?: number; firmId?: number; pending?: boolean }): Promise<UserInvitation[]>;
  getUserInvitation(id: number): Promise<UserInvitation | undefined>;
  getUserInvitationByToken(token: string): Promise<UserInvitation | undefined>;
  createUserInvitation(invitation: InsertUserInvitation): Promise<UserInvitation>;
  acceptUserInvitation(token: string): Promise<UserInvitation | undefined>;
  deleteUserInvitation(id: number): Promise<boolean>;
  
  // Recurring Invoices
  getRecurringTemplates(filters?: { status?: string; customerId?: number }): Promise<(RecurringTemplate & { customerName?: string })[]>;
  getRecurringTemplate(id: number): Promise<(RecurringTemplate & { customerName?: string }) | undefined>;
  createRecurringTemplate(template: InsertRecurringTemplate, lines: InsertRecurringLine[]): Promise<RecurringTemplate>;
  updateRecurringTemplate(id: number, template: Partial<RecurringTemplate>): Promise<RecurringTemplate | undefined>;
  deleteRecurringTemplate(id: number): Promise<boolean>;
  getRecurringLines(templateId: number): Promise<RecurringLine[]>;
  updateRecurringLines(templateId: number, lines: InsertRecurringLine[]): Promise<void>;
  pauseRecurringTemplate(id: number): Promise<RecurringTemplate | undefined>;
  resumeRecurringTemplate(id: number): Promise<RecurringTemplate | undefined>;
  cancelRecurringTemplate(id: number): Promise<RecurringTemplate | undefined>;
  duplicateRecurringTemplate(id: number, templateName: string): Promise<RecurringTemplate>;
  getRecurringHistory(templateId: number): Promise<RecurringHistory[]>;
  createRecurringHistory(history: InsertRecurringHistory): Promise<RecurringHistory>;
  getActiveTemplatesDue(now: Date): Promise<RecurringTemplate[]>;

  // AI Conversations
  getAiConversations(userId: number, companyId?: number): Promise<AiConversation[]>;
  getAiConversation(id: number): Promise<AiConversation | undefined>;
  createAiConversation(conversation: InsertAiConversation): Promise<AiConversation>;
  updateAiConversation(id: number, conversation: Partial<AiConversation>): Promise<AiConversation | undefined>;
  deleteAiConversation(id: number): Promise<boolean>;

  // AI Messages
  getAiMessages(conversationId: number): Promise<AiMessage[]>;
  createAiMessage(message: InsertAiMessage): Promise<AiMessage>;
  deleteOldAiConversations(olderThan: Date): Promise<number>;
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
  private users: Map<number, User>;
  private userCompanies: Map<string, UserCompany>; // Composite key: `${userId}-${companyId}`
  private permissions: Map<number, Permission>;
  private rolePermissions: Map<string, RolePermission>; // Composite key: `${role}-${permissionId}`
  private companySettings: CompanySettings | undefined;
  private preferences: Preferences | undefined;
  
  private accountIdCounter: number;
  private contactIdCounter: number;
  private transactionIdCounter: number;
  private lineItemIdCounter: number;
  private ledgerEntryIdCounter: number;
  private salesTaxIdCounter: number;
  private productIdCounter: number;
  private companyIdCounter: number;
  private userIdCounter: number;
  private permissionIdCounter: number;

  constructor() {
    this.accounts = new Map();
    this.contacts = new Map();
    this.transactions = new Map();
    this.lineItems = new Map();
    this.ledgerEntries = new Map();
    this.salesTaxes = new Map();
    this.products = new Map();
    this.companies = new Map();
    this.users = new Map();
    this.userCompanies = new Map();
    this.permissions = new Map();
    this.rolePermissions = new Map();
    
    this.accountIdCounter = 1;
    this.contactIdCounter = 1;
    this.transactionIdCounter = 1;
    this.lineItemIdCounter = 1;
    this.ledgerEntryIdCounter = 1;
    this.salesTaxIdCounter = 1;
    this.productIdCounter = 1;
    this.companyIdCounter = 1;
    this.userIdCounter = 1;
    this.permissionIdCounter = 1;
    
    // Create a default company
    this.initializeDefaultCompany();

    // Initialize with default chart of accounts
    this.initializeDefaultAccounts();
    // Initialize with some default contacts
    this.initializeDefaultContacts();
    // Initialize with a default admin user
    this.initializeDefaultUser();
  }
  
  private initializeDefaultUser() {
    // Create an admin user
    this.createUser({
      username: 'admin',
      password: 'admin123', // This will be hashed in the implementation
      email: 'admin@example.com',
      fullName: 'System Administrator',
      role: 'admin',
      isActive: true
    });
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
  async getAccounts(companyId?: number): Promise<Account[]> {
    const accounts = Array.from(this.accounts.values());
    if (companyId) {
      return accounts.filter(a => a.companyId === companyId);
    }
    return accounts;
  }

  async getAccount(id: number): Promise<Account | undefined> {
    return this.accounts.get(id);
  }

  async getAccountByCode(code: string, companyId?: number): Promise<Account | undefined> {
    const accounts = Array.from(this.accounts.values());
    return accounts.find(account =>
      account.code === code && (!companyId || account.companyId === companyId)
    );
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
  async getSalesTaxes(companyId?: number): Promise<SalesTax[]> {
    const taxes = Array.from(this.salesTaxes.values());
    if (companyId) {
      return taxes.filter(t => t.companyId === companyId);
    }
    return taxes;
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

  // Helper methods for currency-specific AR/AP accounts
  private async findARAccountForCurrency(currency: string): Promise<Account | undefined> {
    const accounts = Array.from(this.accounts.values());
    const accountName = `Accounts Receivable - ${currency}`;
    
    // First check by exact name match
    let account = accounts.find(a => a.name === accountName);
    
    // If not found by name, check by type and currency
    if (!account) {
      account = accounts.find(a => 
        a.type === 'accounts_receivable' && 
        a.currency === currency
      );
    }
    
    return account;
  }

  private async findAPAccountForCurrency(currency: string): Promise<Account | undefined> {
    const accounts = Array.from(this.accounts.values());
    const accountName = `Accounts Payable - ${currency}`;
    
    // First check by exact name match
    let account = accounts.find(a => a.name === accountName);
    
    // If not found by name, check by type and currency
    if (!account) {
      account = accounts.find(a => 
        a.type === 'accounts_payable' && 
        a.currency === currency
      );
    }
    
    return account;
  }

  private async ensureCurrencyARAccount(currency: string): Promise<void> {
    const existingAccount = await this.findARAccountForCurrency(currency);
    if (!existingAccount) {
      await this.createAccount({
        code: `AR-${currency}`,
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
        code: `AP-${currency}`,
        name: `Accounts Payable - ${currency}`,
        type: 'accounts_payable',
        currency: currency,
        isActive: true
      });
    }
  }

  // Contact Methods
  async getContacts(companyId?: number, includeInactive = false): Promise<Contact[]> {
    let allContacts = Array.from(this.contacts.values());
    if (companyId) {
      allContacts = allContacts.filter(c => c.companyId === companyId);
    }
    if (includeInactive) {
      return allContacts;
    }
    return allContacts.filter(contact => contact.isActive !== false);
  }

  async getContact(id: number): Promise<Contact | undefined> {
    return this.contacts.get(id);
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const id = this.contactIdCounter++;
    const newContact: Contact = { ...contact, id, isActive: contact.isActive !== undefined ? contact.isActive : true };
    this.contacts.set(id, newContact);
    
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
    const contact = this.contacts.get(id);
    if (!contact) return undefined;

    const updatedContact = { ...contact, ...contactUpdate };
    this.contacts.set(id, updatedContact);
    return updatedContact;
  }
  
  async deleteContact(id: number): Promise<boolean> {
    if (!this.contacts.has(id)) return false;
    return this.contacts.delete(id);
  }

  async hasContactTransactions(contactId: number): Promise<boolean> {
    const transactions = Array.from(this.transactions.values());
    return transactions.some(tx => tx.contactId === contactId);
  }

  // Transaction Methods
  async getTransactions(companyId?: number): Promise<Transaction[]> {
    const txs = Array.from(this.transactions.values());
    if (companyId) {
      return txs.filter(t => t.companyId === companyId);
    }
    return txs;
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

  async getLedgerEntriesUpToDate(asOfDate: Date): Promise<LedgerEntry[]> {
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

  async getLedgerEntry(id: number): Promise<LedgerEntry | undefined> {
    return this.ledgerEntries.get(id);
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

  async createPaymentApplication(application: { paymentId: number; invoiceId: number; amountApplied: number }): Promise<any> {
    // MemStorage stub - in real implementation, this would store in a Map
    return { id: Date.now(), ...application, createdAt: new Date() };
  }

  // Reports
  async getAccountBalances(companyId?: number): Promise<{ account: Account; balance: number }[]> {
    const accounts = await this.getAccounts(companyId);
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

  async getCashFlowStatement(startDate?: Date, endDate?: Date): Promise<{
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
    return {
      period: { startDate: startDate || null, endDate: endDate || null },
      categories: {
        operating: { total: 0, accounts: [] },
        investing: { total: 0, accounts: [] },
        financing: { total: 0, accounts: [] }
      },
      netChange: 0,
      openingCash: 0,
      closingCash: 0
    };
  }

  async calculatePriorYearsRetainedEarnings(asOfDate: Date, fiscalYearStartMonth: number): Promise<number> {
    return 0;
  }

  async calculateCurrentYearNetIncome(asOfDate: Date, fiscalYearStartMonth: number): Promise<number> {
    return 0;
  }

  // Product Methods
  async getProducts(companyId?: number): Promise<Product[]> {
    const products = Array.from(this.products.values());
    if (companyId) {
      return products.filter(p => p.companyId === companyId);
    }
    return products;
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
  
  // Company Methods
  private initializeDefaultCompany() {
    const defaultCompany: InsertCompany = {
      name: 'Vedo, Inc.',
      address: '123 Financial Way, Suite 100',
      phone: '(555) 123-4567',
      email: 'info@vedo.com',
      website: 'www.vedo.com',
      taxId: '12-3456789',
      logoUrl: '/assets/vedo-logo.svg',
      isActive: true
    };
    
    this.createCompany(defaultCompany)
      .then(company => this.setDefaultCompany(company.id))
      .catch(err => console.error('Failed to create default company:', err));
  }
  
  async getCompanies(): Promise<Company[]> {
    return Array.from(this.companies.values());
  }
  
  async getCompany(id: number): Promise<Company | undefined> {
    return this.companies.get(id);
  }
  
  async getDefaultCompany(): Promise<Company | undefined> {
    return Array.from(this.companies.values()).find(company => company.isDefault);
  }
  
  async getCompanyByCode(code: string): Promise<Company | undefined> {
    return Array.from(this.companies.values()).find(c => c.companyCode === code);
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const { generateUniqueCompanyCode } = await import('./utils/company-code');
    const id = this.companyIdCounter++;
    const now = new Date();
    
    const companyCode = await generateUniqueCompanyCode(async (code) => {
      const existing = await this.getCompanyByCode(code);
      return !!existing;
    });
    
    const newCompany: Company = {
      ...company,
      id,
      companyCode,
      isDefault: false,
      createdAt: now,
      updatedAt: now
    };
    
    this.companies.set(id, newCompany);
    return newCompany;
  }
  
  async updateCompany(id: number, companyUpdate: Partial<Company>): Promise<Company | undefined> {
    const company = this.companies.get(id);
    if (!company) return undefined;
    
    const updatedCompany = { 
      ...company, 
      ...companyUpdate,
      updatedAt: new Date()
    };
    
    this.companies.set(id, updatedCompany);
    return updatedCompany;
  }
  
  async setDefaultCompany(id: number): Promise<Company | undefined> {
    const company = this.companies.get(id);
    if (!company) return undefined;
    
    // Reset all companies to non-default
    for (const [companyId, companyData] of this.companies.entries()) {
      if (companyData.isDefault) {
        this.companies.set(companyId, { ...companyData, isDefault: false });
      }
    }
    
    // Set the new default company
    const updatedCompany = { ...company, isDefault: true };
    this.companies.set(id, updatedCompany);
    
    return updatedCompany;
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
  
  async getPreferences(companyId?: number): Promise<Preferences | undefined> {
    // MemStorage doesn't support company-scoped preferences, returns global
    return this.preferences;
  }

  async savePreferences(preferences: InsertPreferences, companyId?: number): Promise<Preferences> {
    const now = new Date();
    if (!this.preferences) {
      this.preferences = {
        id: 1,
        companyId: companyId || null,
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

  async updatePreferences(updates: Partial<InsertPreferences>, companyId?: number): Promise<Preferences> {
    return this.savePreferences(updates as InsertPreferences, companyId);
  }

  // User Management Methods
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    
    // Hash the password
    const hashedPassword = await this.hashPassword(user.password);
    
    const newUser: User = {
      id,
      username: user.username,
      email: user.email,
      password: hashedPassword,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      role: user.role || 'viewer',
      isActive: user.isActive !== undefined ? user.isActive : true,
      lastLogin: null,
      createdAt: now,
      updatedAt: now,
      companyId: user.companyId || null
    };
    
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUser(id: number, userUpdate: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    // Hash the password if it's being updated
    if (userUpdate.password) {
      userUpdate.password = await this.hashPassword(userUpdate.password);
    }
    
    const updatedUser = { 
      ...user, 
      ...userUpdate,
      updatedAt: new Date() 
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    // Check if this is the last admin
    if (this.users.get(id)?.role === 'admin') {
      const admins = Array.from(this.users.values()).filter(u => u.role === 'admin');
      if (admins.length <= 1) {
        console.error('Cannot delete the last admin user');
        return false;
      }
    }
    
    // Delete user-company associations
    const userCompaniesToDelete = Array.from(this.userCompanies.entries())
      .filter(([key]) => key.startsWith(`${id}-`));
      
    for (const [key] of userCompaniesToDelete) {
      this.userCompanies.delete(key);
    }
    
    // Delete the user
    return this.users.delete(id);
  }

  async updateUserLastLogin(id: number): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { 
      ...user, 
      lastLogin: new Date(),
      updatedAt: new Date()
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  // User-Company Assignments
  async getUserCompanies(userId: number): Promise<UserCompany[]> {
    const userCompanies: UserCompany[] = [];
    
    for (const [key, userCompany] of this.userCompanies.entries()) {
      if (key.startsWith(`${userId}-`)) {
        userCompanies.push(userCompany);
      }
    }
    
    return userCompanies;
  }

  async getCompanyUsers(companyId: number): Promise<UserCompany[]> {
    const companyUsers: UserCompany[] = [];
    
    for (const [key, userCompany] of this.userCompanies.entries()) {
      if (key.endsWith(`-${companyId}`)) {
        companyUsers.push(userCompany);
      }
    }
    
    return companyUsers;
  }

  async assignUserToCompany(userCompany: InsertUserCompany): Promise<UserCompany> {
    const key = `${userCompany.userId}-${userCompany.companyId}`;
    const now = new Date();
    
    const newUserCompany: UserCompany = {
      ...userCompany,
      createdAt: now,
      updatedAt: now
    };
    
    this.userCompanies.set(key, newUserCompany);
    return newUserCompany;
  }

  async updateUserCompanyRole(userId: number, companyId: number, role: string): Promise<UserCompany | undefined> {
    const key = `${userId}-${companyId}`;
    const userCompany = this.userCompanies.get(key);
    
    if (!userCompany) return undefined;
    
    const updatedUserCompany: UserCompany = {
      ...userCompany,
      role,
      updatedAt: new Date()
    };
    
    this.userCompanies.set(key, updatedUserCompany);
    return updatedUserCompany;
  }

  async updateUserCompanyPrimary(userId: number, companyId: number, isPrimary: boolean): Promise<UserCompany | undefined> {
    const key = `${userId}-${companyId}`;
    const userCompany = this.userCompanies.get(key);
    
    if (!userCompany) return undefined;
    
    const updatedUserCompany: UserCompany = {
      ...userCompany,
      isPrimary,
      updatedAt: new Date()
    };
    
    this.userCompanies.set(key, updatedUserCompany);
    return updatedUserCompany;
  }

  async removeUserFromCompany(userId: number, companyId: number): Promise<boolean> {
    const key = `${userId}-${companyId}`;
    return this.userCompanies.delete(key);
  }
  
  // Permissions
  async getPermissions(): Promise<Permission[]> {
    return Array.from(this.permissions.values());
  }

  async getPermission(id: number): Promise<Permission | undefined> {
    return this.permissions.get(id);
  }

  async getPermissionByName(name: string): Promise<Permission | undefined> {
    return Array.from(this.permissions.values()).find(p => p.name === name);
  }

  async createPermission(permission: InsertPermission): Promise<Permission> {
    const id = this.permissionIdCounter++;
    const now = new Date();
    
    const newPermission: Permission = {
      id,
      name: permission.name,
      description: permission.description || null,
      createdAt: now,
      updatedAt: now
    };
    
    this.permissions.set(id, newPermission);
    return newPermission;
  }

  async deletePermission(id: number): Promise<boolean> {
    // First remove any role-permission associations for this permission
    const rolePermissionsToDelete = Array.from(this.rolePermissions.entries())
      .filter(([key]) => key.endsWith(`-${id}`));
      
    for (const [key] of rolePermissionsToDelete) {
      this.rolePermissions.delete(key);
    }
    
    // Delete the permission
    return this.permissions.delete(id);
  }
  
  // Role Permissions
  async getRolePermissions(role: string): Promise<RolePermission[]> {
    const rolePermissions: RolePermission[] = [];
    
    for (const [key, rolePermission] of this.rolePermissions.entries()) {
      if (key.startsWith(`${role}-`)) {
        rolePermissions.push(rolePermission);
      }
    }
    
    return rolePermissions;
  }

  async addPermissionToRole(rolePermission: InsertRolePermission): Promise<RolePermission> {
    const key = `${rolePermission.role}-${rolePermission.permissionId}`;
    const now = new Date();
    
    const newRolePermission: RolePermission = {
      ...rolePermission,
      createdAt: now
    };
    
    this.rolePermissions.set(key, newRolePermission);
    return newRolePermission;
  }

  async removePermissionFromRole(role: string, permissionId: number): Promise<boolean> {
    const key = `${role}-${permissionId}`;
    return this.rolePermissions.delete(key);
  }
  
  // Authentication helper methods
  async validatePassword(storedPassword: string, suppliedPassword: string): Promise<boolean> {
    // Implementation similar to comparePasswords from database-storage.ts
    const [hash, salt] = storedPassword.split('.');
    if (!hash || !salt) return false;
    
    // Simple implementation for in-memory storage
    const suppliedHash = await this.hashPasswordWithSalt(suppliedPassword, salt);
    return suppliedHash === hash;
  }

  async hashPassword(password: string): Promise<string> {
    // Implementation similar to hashPassword from database-storage.ts
    // Generate a random salt
    const salt = this.generateSalt();
    const hash = await this.hashPasswordWithSalt(password, salt);
    return `${hash}.${salt}`;
  }
  
  // Helper methods for password hashing in memory
  private generateSalt(): string {
    // Simple salt generation for in-memory storage
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  
  private async hashPasswordWithSalt(password: string, salt: string): Promise<string> {
    // Simple hash function for in-memory storage
    // In a real implementation, we would use a proper crypto function
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Bank Connections
  async getBankConnections(companyId?: number): Promise<BankConnection[]> {
    throw new Error("Bank connections not supported in MemStorage");
  }

  async getBankConnection(id: number): Promise<BankConnection | undefined> {
    throw new Error("Bank connections not supported in MemStorage");
  }

  async getBankConnectionByItemId(itemId: string): Promise<BankConnection | undefined> {
    throw new Error("Bank connections not supported in MemStorage");
  }

  async createBankConnection(connection: InsertBankConnection): Promise<BankConnection> {
    throw new Error("Bank connections not supported in MemStorage");
  }

  async updateBankConnection(id: number, connection: Partial<BankConnection>): Promise<BankConnection | undefined> {
    throw new Error("Bank connections not supported in MemStorage");
  }

  async deleteBankConnection(id: number): Promise<boolean> {
    throw new Error("Bank connections not supported in MemStorage");
  }

  // Bank Accounts
  async getBankAccounts(): Promise<BankAccount[]> {
    throw new Error("Bank accounts not supported in MemStorage");
  }

  async getBankAccount(id: number): Promise<BankAccount | undefined> {
    throw new Error("Bank accounts not supported in MemStorage");
  }

  async getBankAccountsByConnectionId(connectionId: number): Promise<BankAccount[]> {
    throw new Error("Bank accounts not supported in MemStorage");
  }

  async getBankAccountByPlaidId(plaidAccountId: string): Promise<BankAccount | undefined> {
    throw new Error("Bank accounts not supported in MemStorage");
  }

  async createBankAccount(account: InsertBankAccount): Promise<BankAccount> {
    throw new Error("Bank accounts not supported in MemStorage");
  }

  async updateBankAccount(id: number, account: Partial<BankAccount>): Promise<BankAccount | undefined> {
    throw new Error("Bank accounts not supported in MemStorage");
  }

  async deleteBankAccount(id: number): Promise<boolean> {
    throw new Error("Bank accounts not supported in MemStorage");
  }

  // Imported Transactions
  async getImportedTransactions(companyId?: number): Promise<ImportedTransaction[]> {
    throw new Error("Imported transactions not supported in MemStorage");
  }

  async getImportedTransaction(id: number): Promise<ImportedTransaction | undefined> {
    throw new Error("Imported transactions not supported in MemStorage");
  }

  async getImportedTransactionsByBankAccount(bankAccountId: number): Promise<ImportedTransaction[]> {
    throw new Error("Imported transactions not supported in MemStorage");
  }

  async getImportedTransactionByPlaidId(plaidTransactionId: string): Promise<ImportedTransaction | undefined> {
    throw new Error("Imported transactions not supported in MemStorage");
  }

  async getUnmatchedImportedTransactions(companyId?: number): Promise<ImportedTransaction[]> {
    throw new Error("Imported transactions not supported in MemStorage");
  }

  async createImportedTransaction(transaction: InsertImportedTransaction): Promise<ImportedTransaction> {
    throw new Error("Imported transactions not supported in MemStorage");
  }

  async updateImportedTransaction(id: number, transaction: Partial<ImportedTransaction>): Promise<ImportedTransaction | undefined> {
    throw new Error("Imported transactions not supported in MemStorage");
  }

  async deleteImportedTransaction(id: number): Promise<boolean> {
    throw new Error("Imported transactions not supported in MemStorage");
  }

  // CSV Mapping Preferences
  async getCsvMappingPreference(userId: number, accountId: number): Promise<CsvMappingPreference | undefined> {
    throw new Error("CSV mapping preferences not supported in MemStorage");
  }

  async createCsvMappingPreference(preference: InsertCsvMappingPreference): Promise<CsvMappingPreference> {
    throw new Error("CSV mapping preferences not supported in MemStorage");
  }

  async updateCsvMappingPreference(id: number, preference: Partial<InsertCsvMappingPreference>): Promise<CsvMappingPreference> {
    throw new Error("CSV mapping preferences not supported in MemStorage");
  }

  async bulkCreateImportedTransactions(transactions: InsertImportedTransaction[]): Promise<ImportedTransaction[]> {
    throw new Error("Bulk import not supported in MemStorage");
  }

  // Reconciliations
  async getReconciliations(): Promise<Reconciliation[]> {
    throw new Error("Reconciliations not supported in MemStorage");
  }

  async getReconciliation(id: number): Promise<Reconciliation | undefined> {
    throw new Error("Reconciliations not supported in MemStorage");
  }

  async getReconciliationsByAccount(accountId: number): Promise<Reconciliation[]> {
    throw new Error("Reconciliations not supported in MemStorage");
  }

  async createReconciliation(reconciliation: InsertReconciliation): Promise<Reconciliation> {
    throw new Error("Reconciliations not supported in MemStorage");
  }

  async updateReconciliation(id: number, reconciliation: Partial<Reconciliation>): Promise<Reconciliation | undefined> {
    throw new Error("Reconciliations not supported in MemStorage");
  }

  async deleteReconciliation(id: number): Promise<boolean> {
    throw new Error("Reconciliations not supported in MemStorage");
  }

  async getLedgerEntriesForReconciliation(accountId: number, statementDate: Date): Promise<LedgerEntry[]> {
    throw new Error("Reconciliations not supported in MemStorage");
  }

  // Reconciliation Items
  async getReconciliationItems(reconciliationId: number): Promise<ReconciliationItem[]> {
    throw new Error("Reconciliation items not supported in MemStorage");
  }

  async createReconciliationItem(item: InsertReconciliationItem): Promise<ReconciliationItem> {
    throw new Error("Reconciliation items not supported in MemStorage");
  }

  async updateReconciliationItem(id: number, item: Partial<ReconciliationItem>): Promise<ReconciliationItem | undefined> {
    throw new Error("Reconciliation items not supported in MemStorage");
  }

  async bulkUpsertReconciliationItems(reconciliationId: number, ledgerEntryIds: number[], isCleared: boolean): Promise<void> {
    throw new Error("Reconciliation items not supported in MemStorage");
  }

  // Categorization Rules
  async getCategorizationRules(companyId?: number): Promise<CategorizationRule[]> {
    throw new Error("Categorization rules not supported in MemStorage");
  }

  async getCategorizationRule(id: number): Promise<CategorizationRule | undefined> {
    throw new Error("Categorization rules not supported in MemStorage");
  }

  async createCategorizationRule(rule: InsertCategorizationRule): Promise<CategorizationRule> {
    throw new Error("Categorization rules not supported in MemStorage");
  }

  async updateCategorizationRule(id: number, rule: Partial<CategorizationRule>): Promise<CategorizationRule | undefined> {
    throw new Error("Categorization rules not supported in MemStorage");
  }

  async deleteCategorizationRule(id: number): Promise<boolean> {
    throw new Error("Categorization rules not supported in MemStorage");
  }

  // Currencies
  async getCurrencies(): Promise<Currency[]> {
    throw new Error("Currencies not supported in MemStorage");
  }

  async getCurrency(code: string): Promise<Currency | undefined> {
    throw new Error("Currencies not supported in MemStorage");
  }

  // Exchange Rates
  async getExchangeRates(fromCurrency?: string, effectiveDate?: string): Promise<ExchangeRate[]> {
    throw new Error("Exchange rates not supported in MemStorage");
  }

  async getExchangeRate(id: number): Promise<ExchangeRate | undefined> {
    throw new Error("Exchange rates not supported in MemStorage");
  }

  async getExchangeRateForDate(fromCurrency: string, toCurrency: string, date: Date): Promise<ExchangeRate | undefined> {
    throw new Error("Exchange rates not supported in MemStorage");
  }

  async createExchangeRate(exchangeRate: InsertExchangeRate): Promise<ExchangeRate> {
    throw new Error("Exchange rates not supported in MemStorage");
  }

  async updateExchangeRate(id: number, exchangeRate: Partial<ExchangeRate>): Promise<ExchangeRate | undefined> {
    throw new Error("Exchange rates not supported in MemStorage");
  }

  async deleteExchangeRate(id: number): Promise<boolean> {
    throw new Error("Exchange rates not supported in MemStorage");
  }

  // FX Realizations
  async getFxRealizations(): Promise<FxRealization[]> {
    throw new Error("FX realizations not supported in MemStorage");
  }

  async getFxRealizationsByTransaction(transactionId: number): Promise<FxRealization[]> {
    throw new Error("FX realizations not supported in MemStorage");
  }

  async createFxRealization(fxRealization: InsertFxRealization): Promise<FxRealization> {
    throw new Error("FX realizations not supported in MemStorage");
  }

  // FX Revaluations
  async getFxRevaluations(): Promise<FxRevaluation[]> {
    throw new Error("FX revaluations not supported in MemStorage");
  }

  async getFxRevaluation(id: number): Promise<FxRevaluation | undefined> {
    throw new Error("FX revaluations not supported in MemStorage");
  }

  async createFxRevaluation(fxRevaluation: InsertFxRevaluation): Promise<FxRevaluation> {
    throw new Error("FX revaluations not supported in MemStorage");
  }

  async getForeignCurrencyBalances(asOfDate: Date): Promise<Array<{
    currency: string;
    accountType: string;
    foreignBalance: string;
    originalRate: string;
  }>> {
    throw new Error("FX revaluations not supported in MemStorage");
  }

  // Currency Locks
  async getCurrencyLocks(): Promise<CurrencyLock[]> {
    throw new Error("Currency locks not supported in MemStorage");
  }

  async getCurrencyLockByEntity(entityType: string, entityId: number): Promise<CurrencyLock | undefined> {
    throw new Error("Currency locks not supported in MemStorage");
  }

  async createCurrencyLock(currencyLock: InsertCurrencyLock): Promise<CurrencyLock> {
    throw new Error("Currency locks not supported in MemStorage");
  }

  // AI Conversations
  async getAiConversations(userId: number, companyId?: number): Promise<AiConversation[]> {
    throw new Error("AI conversations not supported in MemStorage");
  }

  async getAiConversation(id: number): Promise<AiConversation | undefined> {
    throw new Error("AI conversations not supported in MemStorage");
  }

  async createAiConversation(conversation: InsertAiConversation): Promise<AiConversation> {
    throw new Error("AI conversations not supported in MemStorage");
  }

  async updateAiConversation(id: number, conversation: Partial<AiConversation>): Promise<AiConversation | undefined> {
    throw new Error("AI conversations not supported in MemStorage");
  }

  async deleteAiConversation(id: number): Promise<boolean> {
    throw new Error("AI conversations not supported in MemStorage");
  }

  // AI Messages
  async getAiMessages(conversationId: number): Promise<AiMessage[]> {
    throw new Error("AI messages not supported in MemStorage");
  }

  async createAiMessage(message: InsertAiMessage): Promise<AiMessage> {
    throw new Error("AI messages not supported in MemStorage");
  }

  async deleteOldAiConversations(olderThan: Date): Promise<number> {
    throw new Error("AI conversations not supported in MemStorage");
  }
}

// Use DatabaseStorage instead of MemStorage for persistence
import { DatabaseStorage } from "./database-storage";
export const storage = new DatabaseStorage();
