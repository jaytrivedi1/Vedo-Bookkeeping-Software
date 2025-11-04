# Vedo - Bookkeeping Application

## Overview
Vedo is a comprehensive full-stack bookkeeping application offering professional accounting features such as double-entry bookkeeping, invoicing, expense tracking, payment processing, and financial reporting. It supports multi-user environments with role-based permissions and integrates with external services like Shopify and Stripe. The project aims to provide a robust and scalable solution for managing business finances.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React with TypeScript using Vite
- **Routing**: wouter
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS
- **State Management**: TanStack React Query
- **Forms**: React Hook Form with Zod validation

### Backend
- **Framework**: Express.js with TypeScript
- **API Design**: RESTful API
- **Authentication**: Passport.js (local strategy, session-based)
- **Database Layer**: Drizzle ORM with PostgreSQL
- **File Structure**: Modular, with route handlers and storage abstraction

### Database Design
- **Primary Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM
- **Schema**: Double-entry accounting structure (accounts, transactions, ledger entries)
- **Migrations**: Automated system
- **Session Storage**: PostgreSQL-backed using `connect-pg-simple` for persistence
- **Reconciliation**: Tables `reconciliations` and `reconciliation_items` to track sessions and cleared transactions.

### Authentication & Authorization
- **Session Management**: Express sessions
- **User Roles**: Multi-company support with role-based permissions
- **Security**: Password hashing (scrypt)
- **Access Control**: Route-level authentication

### Key Business Logic
- **Double-Entry Accounting**: Automatic ledger entry generation.
- **Invoice Management**: Full lifecycle with balance and payment application.
- **Payment Processing**: Multiple methods, unified credit tracking, and `payment_applications` as a source of truth.
- **Financial Reporting**: Real-time balance calculations and account books, including detailed, categorized Balance Sheets.
- **Tax Management**: Configurable sales tax rates.
- **Account Balance Calculation**: Real-time calculation based on ledger entries, differentiating between account types.
- **Bank Transaction Matching**: Rule-based matching (amount, date, description, reference) with confidence scoring. Supports matching to single/multiple invoices/bills and allocating differences.
  - **Match Types**: Invoice/Bill Match (creates payment), Manual Entry Link (links to existing), Manual Override (user categorization).
  - **Multi-Match with Difference**: Allows splitting a bank transaction across multiple invoices/bills and allocating remaining amounts to specific income/expense accounts.
- **Transaction Categorization Rules**: Automated rule-based categorization for imported bank transactions.
  - Rules define conditions (description matching, amount ranges) and actions (assign account, contact, memo).
  - Priority-based execution: rules are evaluated in order until first match.
  - Auto-apply on import: rules automatically categorize transactions when synced via Plaid or uploaded via CSV.
  - Manual application: "Apply Rules" button to categorize existing uncategorized transactions.
  - Full CRUD: create, edit, enable/disable, delete, and reorder rules via UI.
- **Inline Contact Creation**: All major forms (Invoice, Bill, Expense, Sales Receipt, Journal Entry) support creating customers and vendors on-the-fly through inline dialogs.
  - **AddCustomerDialog** and **AddVendorDialog** components reuse existing form validation.
  - New contacts are automatically selected after creation.
  - Journal Entry forms show both customer and vendor creation options since the Name field can be either type.
- **Inline Product Creation**: Invoice and Sales Receipt forms support creating products on-the-fly with automatic field population.
  - Product dialog returns full product object to avoid stale closure issues.
  - Newly created products are automatically selected in the form.
- **Multi-Currency Support** (Foundation Complete - Tasks 1-10):
  - **Database Schema**: 5 dedicated tables (currencies with 80 world currencies seeded, exchange_rates with unique daily rate constraint, fx_realizations, fx_revaluations, currency_locks)
  - **Preferences**: One-time multi-currency enablement with locked home currency selection and timestamp tracking
  - **Contacts**: Currency field on customers/vendors, automatically locked after first transaction to prevent changes
  - **Transactions**: Currency, exchange_rate, and foreign_amount fields to support multi-currency transactions
  - **Backend API**: Complete CRUD endpoints for currencies and exchange rates with Zod validation
  - **Currency Settings UI**: SearchableSelect for home currency, one-time enablement enforcement, proper state management
  - **Exchange Rates Manager**: Full CRUD interface with date-based rates, currency filtering, sorted listing, unique constraint preventing duplicate same-day pairs
  - **Contact Forms**: Currency selectors in all customer/vendor creation/edit forms with automatic locking when transactions exist
  - **Lock Prevention**: ContactEditForm queries `/api/contacts/:id/transactions` and disables currency field for both customers and vendors with existing transactions
  - **Status**: Foundation complete and production-ready. Remaining: invoice/bill form integration, FX gain/loss calculations, month-end revaluation, reporting updates

## External Dependencies

### Core Infrastructure
- **Database**: Neon PostgreSQL
- **File Storage**: Local file system

### Payment Processing
- **Stripe**: Payment processing via React Stripe.js.

### Bank Integration
- **Plaid Integration**: Secure bank account connection, transaction import, and real-time balance updates.
- **CSV Upload Support**: Manual bank statement import with flexible column mapping and validation.

### Development Tools
- **Build System**: Vite
- **Code Quality**: TypeScript, ESLint
- **Database Tools**: Drizzle Kit

### Third-Party Libraries
- **PDF Generation**: jsPDF
- **CSV Processing**: PapaParse
- **Date Handling**: date-fns
- **Validation**: Zod