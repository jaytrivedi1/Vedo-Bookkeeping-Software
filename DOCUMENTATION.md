# Vedo - Bookkeeping Application Documentation

A comprehensive full-stack bookkeeping application with QuickBooks Online-style features.

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [API Endpoints](#api-endpoints)
3. [Database Schema](#database-schema)
4. [Authentication](#authentication)
5. [Key Features](#key-features)

---

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool |
| Tailwind CSS | Styling |
| shadcn/ui (Radix UI) | UI component library |
| TanStack React Query | Data fetching/caching |
| React Hook Form | Form management |
| Zod | Schema validation |
| wouter | Client-side routing |
| Recharts | Charts/graphs |
| Framer Motion | Animations |
| Lucide React | Icons |

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js | Runtime |
| Express.js | Web framework |
| TypeScript | Type safety |
| Passport.js | Authentication |
| Drizzle ORM | Database ORM |
| connect-pg-simple | Session storage |

### Database
| Technology | Purpose |
|------------|---------|
| PostgreSQL (Neon) | Primary database |
| Drizzle Kit | Migrations |

### Integrations
| Service | Purpose |
|---------|---------|
| Stripe | Payment processing |
| Plaid | Bank account connections |
| OpenAI | AI features |
| Resend | Email sending |
| Radar | Address autocomplete |
| ExchangeRate-API | Currency exchange rates |

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register` | Register new user |
| POST | `/api/login` | User login |
| POST | `/api/logout` | User logout |
| GET | `/api/user` | Get current user |
| POST | `/api/user/change-password` | Change password |
| PATCH | `/api/user/profile` | Update user profile |

### Companies
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/companies` | List all companies |
| GET | `/api/companies/default` | Get default company |
| GET | `/api/companies/:id` | Get company by ID |
| POST | `/api/companies` | Create new company |
| PATCH | `/api/companies/:id` | Update company |
| POST | `/api/companies/:id/set-default` | Set as default company |
| POST | `/api/companies/:id/logo` | Upload company logo |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List all users |
| GET | `/api/admin/users/:id` | Get user by ID |
| PATCH | `/api/admin/users/:id/status` | Update user status |
| GET | `/api/admin/companies` | List all companies |
| GET | `/api/admin/companies/:id` | Get company by ID |
| PATCH | `/api/admin/companies/:id/status` | Update company status |
| GET | `/api/admin/bank-connections` | List bank connections |
| DELETE | `/api/admin/bank-connections/:id` | Delete bank connection |

### Accounts (Chart of Accounts)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/accounts` | List all accounts |
| GET | `/api/accounts/:id` | Get account by ID |
| POST | `/api/accounts` | Create account |
| PATCH | `/api/accounts/:id` | Update account |
| DELETE | `/api/accounts/:id` | Delete account |
| GET | `/api/accounts/:id/ledger` | Get account ledger entries |

### Contacts (Customers & Vendors)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/contacts` | List all contacts |
| GET | `/api/contacts/:id` | Get contact by ID |
| POST | `/api/contacts` | Create contact |
| PATCH | `/api/contacts/:id` | Update contact |
| DELETE | `/api/contacts/:id` | Delete contact |
| GET | `/api/contacts/:id/transactions` | Get contact transactions |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions` | List all transactions |
| GET | `/api/transactions/:id` | Get transaction by ID |
| PATCH | `/api/transactions/:id` | Update transaction |
| DELETE | `/api/transactions/:id` | Delete transaction |
| GET | `/api/transactions/:id/payment-history` | Get payment history |
| POST | `/api/transactions/:id/recalculate-balance` | Recalculate balance |

### Invoices
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/invoices` | Create invoice |
| PATCH | `/api/invoices/:id` | Update invoice |
| GET | `/api/invoices/next-number` | Get next invoice number |
| GET | `/api/invoices/:id/activities` | Get invoice activities |
| GET | `/api/invoices/:id/payment-applications` | Get payment applications |
| POST | `/api/invoices/:id/generate-token` | Generate public access token |
| POST | `/api/invoices/:id/send` | Send invoice via email |
| POST | `/api/invoices/:id/convert` | Convert quotation to invoice |
| GET | `/api/invoices/public/:token` | View invoice publicly |

### Bills
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/bills` | Create bill |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments` | Create payment |
| DELETE | `/api/payments/:id/delete` | Delete payment |

### Deposits
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/deposits` | Create deposit |

### Journal Entries
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/journal-entries` | Create journal entry |

### Transfers
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/transfers` | Create account transfer |

### Sales Receipts
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sales-receipts` | Create sales receipt |

### Credits
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/customer-credits` | Create customer credit |
| POST | `/api/vendor-credits` | Create vendor credit |

### Products & Services
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List all products |
| GET | `/api/products/:id` | Get product by ID |
| POST | `/api/products` | Create product |
| PATCH | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |

### Sales Taxes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sales-taxes` | List all sales taxes |
| GET | `/api/sales-taxes/:id` | Get sales tax by ID |
| POST | `/api/sales-taxes` | Create sales tax |
| PATCH | `/api/sales-taxes/:id` | Update sales tax |
| DELETE | `/api/sales-taxes/:id` | Delete sales tax |

### Currencies & Exchange Rates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/currencies` | List all currencies |
| POST | `/api/currencies` | Create currency |
| PATCH | `/api/currencies/:id` | Update currency |
| GET | `/api/exchange-rates` | List exchange rates |
| GET | `/api/exchange-rates/rate` | Get specific rate (auto-fetches if missing) |
| PUT | `/api/exchange-rates` | Update exchange rate |
| POST | `/api/fx-revaluations/calculate` | Calculate FX revaluation |
| POST | `/api/fx-revaluations/post` | Post FX revaluation journal entries |

### Banking & Plaid Integration
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/plaid/link-token` | Create Plaid link token |
| POST | `/api/plaid/exchange-token` | Exchange public token |
| GET | `/api/plaid/connections` | List bank connections |
| GET | `/api/plaid/accounts` | List bank accounts |
| POST | `/api/plaid/sync-transactions/:accountId` | Sync transactions |
| GET | `/api/plaid/imported-transactions` | List imported transactions |
| POST | `/api/plaid/categorize-transaction/:id` | Categorize transaction |

### CSV Import
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/bank/upload-csv` | Upload CSV bank statement |
| GET | `/api/bank/csv-mapping-preferences/:accountId` | Get mapping preferences |
| POST | `/api/bank/csv-mapping-preferences` | Save mapping preferences |

### Categorization Rules
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categorization-rules` | List all rules |
| POST | `/api/categorization-rules` | Create rule |
| PATCH | `/api/categorization-rules/:id` | Update rule |
| DELETE | `/api/categorization-rules/:id` | Delete rule |
| POST | `/api/categorization-rules/apply` | Apply rules to transactions |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/income-statement` | Income Statement (P&L) |
| GET | `/api/reports/balance-sheet` | Balance Sheet |
| GET | `/api/reports/trial-balance` | Trial Balance |
| GET | `/api/reports/general-ledger` | General Ledger |
| GET | `/api/reports/general-ledger-grouped` | Grouped General Ledger |
| GET | `/api/reports/cash-flow` | Cash Flow Statement |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/metrics` | Get dashboard metrics |

### Search
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search?q={query}` | Global search |
| GET | `/api/search/recent` | Recent searches |

### Settings & Preferences
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings/company` | Get company settings |
| POST | `/api/settings/company` | Update company settings |
| GET | `/api/preferences` | Get preferences |
| POST | `/api/settings/preferences` | Update preferences |

### Address Autocomplete
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/address/autocomplete?query={query}` | Address suggestions |

### Recurring Invoices
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/recurring-templates` | List templates |
| GET | `/api/recurring-templates/:id` | Get template by ID |
| POST | `/api/recurring-templates` | Create template |
| PATCH | `/api/recurring-templates/:id` | Update template |
| DELETE | `/api/recurring-templates/:id` | Delete template |
| POST | `/api/recurring-templates/:id/generate` | Generate invoice now |
| GET | `/api/recurring-history` | List recurring history |

### Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health check |

---

## Database Schema

### Core Tables

#### users
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| username | text | Unique username |
| email | text | Unique email |
| password | text | Hashed password |
| firstName | text | First name |
| lastName | text | Last name |
| role | enum | admin, staff, read_only, accountant |
| isActive | boolean | Active status |
| lastLogin | timestamp | Last login time |
| companyId | integer | FK to companies |
| firmId | integer | FK to accounting_firms |
| currentCompanyId | integer | Current company context |
| createdAt | timestamp | Created date |
| updatedAt | timestamp | Updated date |

#### companies
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| companyCode | text | Unique code (VED-XXXXXXXX) |
| name | text | Company name |
| street1 | text | Street address line 1 |
| street2 | text | Street address line 2 |
| city | text | City |
| state | text | State/Province |
| postalCode | text | Postal/ZIP code |
| country | text | Country |
| phone | text | Phone number |
| email | text | Email |
| website | text | Website |
| taxId | text | Tax ID |
| logoUrl | text | Logo URL |
| fiscalYearStartMonth | integer | Fiscal year start (1-12) |
| industry | text | Industry type |
| companyType | text | Company type |
| previousSoftware | text | Previous software used |
| referralSource | text | How they found us |
| isActive | boolean | Active status |
| isDefault | boolean | Default company |
| createdAt | timestamp | Created date |
| updatedAt | timestamp | Updated date |

#### user_companies
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| userId | integer | FK to users |
| companyId | integer | FK to companies |
| role | enum | User's role in this company |
| isPrimary | boolean | Primary company for user |
| isActive | boolean | Active status |
| createdAt | timestamp | Created date |

#### accounts
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| code | text | Account code |
| name | text | Account name |
| type | enum | Account type (see below) |
| currency | text | Currency code |
| salesTaxType | text | Tax type |
| balance | double | Current balance |
| isActive | boolean | Active status |
| cashFlowCategory | enum | operating, investing, financing, none |

**Account Types:**
- accounts_receivable
- current_assets
- bank
- property_plant_equipment
- long_term_assets
- accounts_payable
- credit_card
- other_current_liabilities
- long_term_liabilities
- equity
- income
- other_income
- cost_of_goods_sold
- expenses
- other_expense

#### contacts
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| name | text | Company/Business name |
| contactName | text | Contact person name |
| email | text | Email |
| phone | text | Phone |
| address | text | Address |
| type | text | customer, vendor, or both |
| currency | text | Default currency |
| defaultTaxRate | double | Default tax rate |
| documentIds | text[] | Attached document IDs |
| isActive | boolean | Active status |

#### transactions
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| reference | text | Transaction reference |
| type | enum | Transaction type (see below) |
| date | timestamp | Transaction date |
| description | text | Description |
| amount | double | Amount in home currency |
| subTotal | double | Subtotal before tax |
| taxAmount | double | Tax amount |
| balance | double | Outstanding balance |
| contactId | integer | FK to contacts |
| status | enum | Transaction status |
| paymentMethod | enum | Payment method |
| paymentAccountId | integer | FK to accounts |
| paymentDate | timestamp | Payment date |
| memo | text | Memo |
| attachments | text[] | File attachments |
| dueDate | timestamp | Due date |
| paymentTerms | text | Payment terms |
| currency | varchar(3) | Foreign currency code |
| exchangeRate | decimal | Exchange rate used |
| foreignAmount | decimal | Amount in foreign currency |
| secureToken | varchar(64) | Public access token |

**Transaction Types:**
- invoice
- expense
- journal_entry
- deposit
- payment
- bill
- cheque
- sales_receipt
- transfer
- customer_credit
- vendor_credit

**Status Types:**
- completed
- cancelled
- paid
- overdue
- partial
- unapplied_credit
- open
- quotation
- draft
- approved

#### line_items
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| transactionId | integer | FK to transactions |
| description | text | Line item description |
| quantity | double | Quantity |
| unitPrice | double | Unit price |
| amount | double | Line total |
| accountId | integer | FK to accounts |
| salesTaxId | integer | FK to sales_taxes |
| productId | integer | FK to products |

#### ledger_entries
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| transactionId | integer | FK to transactions |
| accountId | integer | FK to accounts |
| description | text | Entry description |
| debit | double | Debit amount (home currency) |
| credit | double | Credit amount (home currency) |
| date | timestamp | Entry date |
| currency | varchar(3) | Foreign currency code |
| exchangeRate | decimal | Exchange rate |
| foreignAmount | decimal | Foreign currency amount |

#### payment_applications
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| paymentId | integer | FK to transactions (payment) |
| invoiceId | integer | FK to transactions (invoice) |
| amountApplied | double | Amount applied |
| createdAt | timestamp | Created date |

### Banking Tables

#### bank_connections
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| itemId | text | Plaid item ID |
| accessToken | text | Plaid access token |
| institutionId | text | Bank institution ID |
| institutionName | text | Bank name |
| accountIds | text[] | Connected account IDs |
| status | text | Connection status |
| lastSync | timestamp | Last sync time |
| error | text | Error message |
| createdAt | timestamp | Created date |
| updatedAt | timestamp | Updated date |

#### bank_accounts
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| connectionId | integer | FK to bank_connections |
| plaidAccountId | text | Plaid account ID |
| name | text | Account name |
| mask | text | Last 4 digits |
| officialName | text | Official name |
| type | text | Account type |
| subtype | text | Account subtype |
| currentBalance | double | Current balance |
| availableBalance | double | Available balance |
| linkedAccountId | integer | FK to accounts |
| isActive | boolean | Active status |
| lastSyncedAt | timestamp | Last sync time |

#### imported_transactions
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| bankAccountId | integer | FK to bank_accounts |
| plaidTransactionId | text | Plaid transaction ID |
| date | timestamp | Transaction date |
| authorizedDate | timestamp | Authorization date |
| name | text | Transaction name |
| merchantName | text | Merchant name |
| amount | double | Amount |
| isoCurrencyCode | text | Currency code |
| category | text[] | Plaid categories |
| pending | boolean | Pending status |
| paymentChannel | text | Payment channel |
| matchedTransactionId | integer | FK to transactions |
| status | text | unmatched, matched, categorized |
| source | text | plaid, csv |
| accountId | integer | Assigned account |
| matchedTransactionType | text | Type of matched transaction |
| matchConfidence | double | Match confidence score |
| isManualMatch | boolean | Manual match flag |
| isMultiMatch | boolean | Multi-match flag |
| suggestedAccountId | integer | Rule-suggested account |
| suggestedSalesTaxId | integer | Rule-suggested tax |
| suggestedContactName | text | Rule-suggested contact |
| suggestedMemo | text | Rule-suggested memo |

### Multi-Currency Tables

#### currencies
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| code | varchar(3) | ISO currency code |
| name | text | Currency name |
| symbol | varchar(10) | Currency symbol |
| decimals | integer | Decimal places |
| isActive | boolean | Active status |
| createdAt | timestamp | Created date |

#### exchange_rates
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| fromCurrency | varchar(3) | Source currency |
| toCurrency | varchar(3) | Target currency |
| rate | decimal | Exchange rate |
| effectiveDate | date | Rate date |
| isManual | boolean | Manual entry flag |
| createdAt | timestamp | Created date |
| updatedAt | timestamp | Updated date |

#### fx_realizations
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| transactionId | integer | FK to transactions |
| paymentId | integer | Payment transaction ID |
| originalRate | decimal | Original exchange rate |
| paymentRate | decimal | Payment exchange rate |
| foreignAmount | decimal | Foreign currency amount |
| gainLossAmount | decimal | FX gain/loss amount |
| realizedDate | date | Realization date |
| createdAt | timestamp | Created date |

#### fx_revaluations
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| revaluationDate | date | Revaluation date |
| accountType | varchar | Account type (AR, AP, Bank) |
| currency | varchar(3) | Currency code |
| foreignBalance | decimal | Balance in foreign currency |
| originalRate | decimal | Original weighted rate |
| revaluationRate | decimal | Revaluation rate |
| unrealizedGainLoss | decimal | Unrealized gain/loss |
| journalEntryId | integer | FK to transactions |
| createdAt | timestamp | Created date |

### Recurring Invoice Tables

#### recurring_templates
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| customerId | integer | FK to contacts |
| templateName | text | Template name |
| currency | varchar(3) | Currency code |
| frequency | enum | daily, weekly, monthly, quarterly, yearly |
| startDate | date | Start date |
| endDate | date | End date (optional) |
| maxOccurrences | integer | Max occurrences |
| currentOccurrences | integer | Current count |
| nextRunAt | timestamp | Next run time |
| lastRunAt | timestamp | Last run time |
| status | enum | active, paused, completed, cancelled |
| autoEmail | boolean | Auto-send email |
| autoCharge | boolean | Auto-charge |
| previewBeforeSend | boolean | Preview before send |
| paymentTerms | text | Payment terms |
| memo | text | Memo |
| subTotal | double | Subtotal |
| taxAmount | double | Tax amount |
| totalAmount | double | Total amount |
| exchangeRate | decimal | Exchange rate |
| createdAt | timestamp | Created date |
| updatedAt | timestamp | Updated date |

#### recurring_lines
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| templateId | integer | FK to recurring_templates |
| description | text | Line description |
| quantity | double | Quantity |
| unitPrice | double | Unit price |
| amount | double | Line amount |
| accountId | integer | FK to accounts |
| salesTaxId | integer | FK to sales_taxes |
| productId | integer | FK to products |
| orderIndex | integer | Display order |

#### recurring_history
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| templateId | integer | FK to recurring_templates |
| invoiceId | integer | FK to transactions |
| scheduledAt | timestamp | Scheduled time |
| generatedAt | timestamp | Generation time |
| sentAt | timestamp | Sent time |
| paidAt | timestamp | Paid time |
| status | text | scheduled, generated, sent, paid, failed, skipped |
| errorMessage | text | Error message |
| retryCount | integer | Retry count |
| metadata | json | Additional data |
| createdAt | timestamp | Created date |

### Other Tables

#### products
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| name | text | Product name |
| description | text | Description |
| sku | text | SKU |
| type | text | product or service |
| price | decimal | Sale price |
| cost | decimal | Cost |
| accountId | integer | FK to accounts |
| salesTaxId | integer | FK to sales_taxes |
| isActive | boolean | Active status |
| createdAt | timestamp | Created date |
| updatedAt | timestamp | Updated date |

#### sales_taxes
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| name | text | Tax name |
| description | text | Description |
| rate | double | Tax rate |
| accountId | integer | FK to accounts |
| isActive | boolean | Active status |
| isComposite | boolean | Composite tax flag |
| parentId | integer | Parent tax ID |
| displayOrder | integer | Display order |

#### preferences
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| darkMode | boolean | Dark mode enabled |
| multiCurrencyEnabled | boolean | Multi-currency enabled |
| homeCurrency | varchar(3) | Home currency |
| multiCurrencyEnabledAt | timestamp | When enabled |
| invoiceTemplate | text | Default invoice template |
| transactionLockDate | timestamp | Lock date |
| updatedAt | timestamp | Updated date |

#### invoice_activities
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| invoiceId | integer | FK to transactions |
| activityType | enum | created, sent, viewed, paid, edited, overdue, reminder_sent, cancelled |
| timestamp | timestamp | Activity time |
| userId | integer | FK to users |
| metadata | jsonb | Additional context |
| createdAt | timestamp | Created date |

#### activity_logs
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| userId | integer | FK to users |
| action | text | Action performed |
| entityType | text | Entity type |
| entityId | integer | Entity ID |
| details | json | Additional details |
| ipAddress | text | IP address |
| userAgent | text | User agent |
| createdAt | timestamp | Created date |

#### reconciliations
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| accountId | integer | FK to accounts |
| statementDate | timestamp | Statement date |
| statementEndingBalance | double | Ending balance |
| clearedBalance | double | Cleared balance |
| difference | double | Difference |
| status | enum | in_progress, completed, cancelled |
| createdAt | timestamp | Created date |
| completedAt | timestamp | Completion date |
| notes | text | Notes |

#### categorization_rules
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| name | text | Rule name |
| isEnabled | boolean | Enabled status |
| priority | integer | Priority order |
| conditions | json | Match conditions |
| actions | json | Actions to apply |
| salesTaxId | integer | FK to sales_taxes |
| attachmentPath | text | Attachment path |
| createdAt | timestamp | Created date |
| updatedAt | timestamp | Updated date |

---

## Authentication

### Session-Based Authentication
- Uses Passport.js with local strategy
- Sessions stored in PostgreSQL via connect-pg-simple
- Passwords hashed using scrypt

### User Roles
| Role | Description |
|------|-------------|
| admin | Full access to all features |
| staff | Standard access |
| read_only | View-only access |
| accountant | Accounting firm access |

### Protected Routes
All `/api/*` routes (except auth endpoints) require authentication via the `requireAuth` middleware.

---

## Key Features

### Double-Entry Bookkeeping
- Automatic ledger entry generation for all transactions
- Balanced debits and credits
- Real-time account balance calculation

### Multi-Currency Support
- 80+ world currencies supported
- Automatic exchange rate fetching
- Realized and unrealized FX gain/loss tracking
- User-editable exchange rates

### Invoice Management
- Create, edit, send invoices
- Public invoice viewing via secure tokens
- Invoice activity tracking
- Quotation to invoice conversion
- Payment application tracking

### Bank Integration
- Plaid integration for automatic transaction import
- CSV upload for manual import
- Rule-based transaction categorization
- Bank reconciliation

### Recurring Invoices
- Flexible scheduling (daily, weekly, monthly, quarterly, yearly)
- Auto-email and auto-charge options
- Full history tracking

### Financial Reports
- Income Statement (P&L)
- Balance Sheet
- Trial Balance
- General Ledger
- Cash Flow Statement

### Transaction Lock Dates
- Prevent modifications to transactions on or before lock date
- Audit trail protection

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| DATABASE_URL | PostgreSQL connection string |
| SESSION_SECRET | Session encryption secret |
| PLAID_CLIENT_ID | Plaid API client ID |
| PLAID_SECRET | Plaid API secret |
| PLAID_ENV | Plaid environment (sandbox/development/production) |
| EXCHANGERATE_API_KEY | ExchangeRate-API.com API key |
| RADAR_API_KEY | Radar.io API key for address autocomplete |
| STRIPE_SECRET_KEY | Stripe secret key |
| RESEND_API_KEY | Resend email API key |

---

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables
4. Create database: Use the provided SQL files
5. Push schema: `npm run db:push`
6. Seed data: `npm run seed` (optional)
7. Start development server: `npm run dev`

---

## Database Files

- `vedo_schema.sql` - Database structure (tables, indexes, constraints)
- `vedo_database_export.sql` - Sample data with INSERT statements

To restore:
```bash
psql your_database_url < vedo_schema.sql
psql your_database_url < vedo_database_export.sql
```

---

*Documentation generated for Vedo Bookkeeping Application*
