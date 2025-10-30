# Vedo - Bookkeeping Application

## Overview

Vedo is a comprehensive full-stack bookkeeping application built with a React frontend and Express.js backend. It provides professional accounting features including double-entry bookkeeping, invoicing, expense tracking, payment processing, and financial reporting. The application supports multi-user environments with role-based permissions and integrates with external services like Shopify and Stripe.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: wouter for client-side routing
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom theme configuration
- **State Management**: TanStack React Query for server state management
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Design**: RESTful API with structured route organization
- **Authentication**: Passport.js with local strategy and session-based authentication
- **Database Layer**: Drizzle ORM with PostgreSQL dialect
- **File Structure**: Modular approach with separate route handlers and storage abstraction

### Database Design
- **Primary Database**: PostgreSQL with Neon serverless hosting
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema**: Double-entry accounting structure with accounts, transactions, ledger entries, and line items
- **Migrations**: Automated migration system with versioned schema updates
- **Data Integrity**: Foreign key constraints and proper normalization

### Authentication & Authorization
- **Session Management**: Express sessions with memory store
- **User Roles**: Multi-company support with role-based permissions
- **Security**: Password hashing with scrypt and timing-safe comparison
- **Access Control**: Route-level authentication middleware with permission checks

### Key Business Logic
- **Double-Entry Accounting**: Automatic ledger entry generation for all transactions
- **Invoice Management**: Complete invoice lifecycle with balance tracking and payment application
- **Payment Processing**: Support for multiple payment methods with unified credit tracking
  - Unapplied credits stored in payment transaction's balance field (not separate transactions)
  - Payment status changes to 'unapplied_credit' when balance > 0
  - Payment/deposit deletion automatically restores invoice balances via payment_applications table
  - payment_applications table is the single source of truth for tracking credit applications
  - When credits are applied during invoice creation or editing, records are created in payment_applications
  - Deletion handlers query payment_applications to find and restore affected invoices
- **Financial Reporting**: Real-time balance calculations and account books
- **Tax Management**: Configurable sales tax rates with component support

## External Dependencies

### Core Infrastructure
- **Database**: Neon PostgreSQL serverless database
- **File Storage**: Local file system for attachments and exports
- **Session Storage**: In-memory session store (MemoryStore)

### Payment Processing
- **Stripe**: Payment processing with React Stripe.js integration
- **Payment Methods**: Credit card processing and payment intent management

### Bank Integration
- **Bank Feed Setup**: Account-first approach where users select a Chart of Accounts bank/cash account first, then choose connection method
- **Plaid Integration**: Secure bank account connection and transaction import
  - Bank account linking via OAuth through Plaid Link
  - Automatic transaction syncing (last 30 days)
  - Real-time balance updates
  - Support for checking, savings, and credit card accounts
  - One-to-one mapping: Each GL account can link to one Plaid account (only first account linked if multiple authorized)
- **CSV Upload Support**: Manual bank statement import as alternative to Plaid
  - Flexible column mapping with user preferences saved per GL account
  - Support for multiple date formats (YYYY-MM-DD, MM/DD/YYYY, DD/MM/YYYY, DD-MM-YYYY)
  - Handles both single amount column and separate debit/credit columns
  - Comprehensive validation with row-level error reporting
  - CSV mapping preferences stored in csv_mapping_preferences table
- **Database Schema**:
  - bank_connections: Stores Plaid item_id, access_token, and institution details
  - bank_accounts: Individual Plaid account details with balances and linkedAccountId to Chart of Accounts
  - imported_transactions: Raw transaction data from both Plaid and CSV with source tracking (accountId links to GL account)
  - csv_mapping_preferences: Stores user's column mapping preferences per GL account
- **Transaction Workflow**:
  - Set up bank feed from Chart of Accounts page (select account → choose Plaid or CSV)
  - Connect via Plaid Link (Sandbox/Development/Production) or upload CSV statement
  - Sync/import transactions on demand or automatically
  - Imported transactions stored with status: unmatched, matched, or ignored
  - Future: Transaction matching UI to categorize and create bookkeeping entries

### Development Tools
- **Build System**: Vite with hot module replacement
- **Code Quality**: TypeScript for type safety and ESLint for code standards
- **Database Tools**: Drizzle Kit for migrations and schema management

### Third-Party Libraries
- **PDF Generation**: jsPDF for financial reports and invoice PDFs
- **CSV Processing**: PapaParse for data import/export functionality
- **Date Handling**: date-fns for consistent date manipulation
- **Validation**: Zod for runtime type validation and schema enforcement

## Recent Updates (October 28, 2025)

### Session Persistence Fix
- **Problem**: Sessions were stored in-memory and lost on server restart, making "Remember me" ineffective
- **Solution**: Replaced MemoryStore with PostgreSQL-backed session storage using connect-pg-simple
- **Impact**: Login sessions now persist across server restarts when "Remember me" is checked
- **Configuration**: Sessions stored in PostgreSQL 'session' table with automatic table creation

### Account Balance Calculation Fix
- **Problem**: /api/accounts endpoint returned raw account data without calculated balances
- **Solution**: Updated endpoint to use getAccountBalances() which calculates balances from ledger entries
- **Balance Logic**: 
  - Asset/Expense accounts: Balance = Σ(debits - credits)
  - Liability/Equity/Income accounts: Balance = Σ(credits - debits)
- **Account Types Covered**: All account types properly classified for correct balance calculations
- **Impact**: Bank account tiles and other components now show correct books balance

### Reconciliation Feature
- **Database Schema**: Added `reconciliations` and `reconciliation_items` tables to track account reconciliation sessions
- **Backend API**: Implemented complete reconciliation workflow endpoints
  - POST /api/reconciliations - Start new reconciliation
  - GET /api/reconciliations/:id/ledger-entries - Fetch transactions for reconciliation
  - PATCH /api/reconciliations/:id/items - Mark transactions as cleared
  - PATCH /api/reconciliations/:id/complete - Complete reconciliation (validates difference = $0)
- **Frontend UI**: Built reconciliation interface in Banking > Reconciliation tab
  - Account selector for bank/credit card/cash accounts
  - Statement date and ending balance inputs
  - Transaction list with checkboxes to mark as cleared
  - Real-time balance calculation (statement balance vs cleared balance)
  - Save and Complete buttons with validation
- **Business Logic**: Cleared balance calculated as sum of (debit - credit) for marked transactions

### Enhanced Balance Sheet Report
- **Detailed Breakdown**: Replaced simple 3-row summary with comprehensive account-level detail
- **Account Categorization**: Organized accounts into proper QuickBooks-style categories
  - Current Assets: Bank, Accounts Receivable, Other Current Assets
  - Fixed Assets: Property/Plant/Equipment, Long-term Assets
  - Current Liabilities: Accounts Payable, Credit Cards, Sales Tax Payable, Other
  - Long-term Liabilities: Loans
  - Equity: Retained Earnings, Current Year Net Income, Other Equity accounts
- **Collapsible Sections**: Each category can be expanded/collapsed for easier viewing
- **Professional Design**: Proper indentation, borders, font weights, and right-aligned numbers
- **Subtotals**: Shows subtotal for each category plus grand totals (Total Assets, Total Liabilities, Total Equity)
- **Export Support**: CSV and PDF export maintained with updated format