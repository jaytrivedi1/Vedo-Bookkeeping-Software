# FinLedger - Bookkeeping Application

## Overview

FinLedger is a comprehensive full-stack bookkeeping application built with a React frontend and Express.js backend. It provides professional accounting features including double-entry bookkeeping, invoicing, expense tracking, payment processing, and financial reporting. The application supports multi-user environments with role-based permissions and integrates with external services like Shopify and Stripe.

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
- **Payment Processing**: Support for multiple payment methods with credit tracking
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


### Development Tools
- **Build System**: Vite with hot module replacement
- **Code Quality**: TypeScript for type safety and ESLint for code standards
- **Database Tools**: Drizzle Kit for migrations and schema management

### Third-Party Libraries
- **PDF Generation**: jsPDF for financial reports and invoice PDFs
- **CSV Processing**: PapaParse for data import/export functionality
- **Date Handling**: date-fns for consistent date manipulation
- **Validation**: Zod for runtime type validation and schema enforcement