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