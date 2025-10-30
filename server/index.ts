import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seed } from "./seed";
import migrateLineItems from "./migrate-line-items";
import { migrateCompanyTable } from "./migrate-company";
import migrateSalesTaxComponents from "./migrate-sales-tax-components";
import migrateTransactions from "./migrate-transactions";
import migrateChequeTransactionType from "./migrate-cheque-transaction-type";
import migrateStatusEnum from "./migrate-status-enum";
import { migrateStatusEnum as migrateOpenStatus } from "./migrate-enum";
import migrateInvoiceBalance from "./migrate-invoice-balance";
import migrateDueDates from "./migrate-due-dates";
import migrateDepositCredits from "./migrate-deposit-credits";
import batchUpdateInvoiceStatuses from "./batch-update-invoice-statuses";
import { fixAllBalances } from "./fix-all-balances";
import { fixCreditApplicationLogic } from "./fix-credit-logic";
import { migratePaymentApplications } from "./migrate-payment-applications";
import { cleanupOrphanedCredits } from "./migrate-cleanup-orphaned-credits";
import { recalculateBillBalances } from "./recalculate-bill-balances";
import { seedAdminUser } from "./migrations/seed-admin-user";
import { addCsvSupport } from "./migrations/add-csv-support";
import migrateAddSalesReceiptTransfer from "./migrate-add-sales-receipt-transfer";
import { migrateImportedTransactionsAccountId } from "./migrate-imported-transactions-account-id";
import { fixPlaidTransactionAmounts } from "./migrate-fix-plaid-amounts";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Run migrations in both development and production to ensure schema exists
  // All migrations are idempotent and skip if already applied
  try {
    // Run the line items migration to add sales_tax_id column
    await migrateLineItems();
    
    // Run company table migration to create companies and set up default company
    await migrateCompanyTable();
    
    // Run sales tax components migration for multi-component taxes (GST+QST)
    await migrateSalesTaxComponents();
    
    // Run transactions migration to add balance field
    await migrateTransactions();
    
    // Run migration to add 'cheque' to transaction_type enum
    await migrateChequeTransactionType();
    
    // Run status enum migration to add unapplied_credit status
    await migrateStatusEnum();
    
    // Run migration to add 'open' status to enum and update old 'pending' invoices
    await migrateOpenStatus();
    
    // Run migration to fix invoice balance issues
    await migrateInvoiceBalance();
    
    // Run migration to populate missing due dates for invoices
    await migrateDueDates();
    
    // Run migration to fix deposit credit balances
    await migrateDepositCredits();
    
    // Run batch update to fix invoice statuses
    await batchUpdateInvoiceStatuses();
    
    // Run comprehensive balance fixer to ensure all invoice and credit balances are correct
    await fixAllBalances();
    
    // Run migration to populate payment_applications table from existing ledger entries
    await migratePaymentApplications();
    
    // Run migration to clean up orphaned credit deposits and consolidate into parent payments
    await cleanupOrphanedCredits();
    
    // Recalculate all bill balances based on payment_applications table
    await recalculateBillBalances();
    
    // Seed admin user (idempotent - only creates if doesn't exist)
    await seedAdminUser();
    
    // Add CSV upload support to imported_transactions table
    await addCsvSupport();
    
    // Add 'sales_receipt' and 'transfer' transaction types to enum
    await migrateAddSalesReceiptTransfer();
    
    // Fix imported transactions missing account_id link to Chart of Accounts
    await migrateImportedTransactionsAccountId();
    
    // Fix Plaid transaction amount signs (Plaid uses positive for expenses, we use positive for deposits)
    await fixPlaidTransactionAmounts();
  } catch (error) {
    log(`Error in database migrations: ${error}`);
  }
  
  // Only seed test data in development mode
  if (process.env.NODE_ENV === "development") {
    try {
      log("Seeding database...");
      await seed();
      log("Database seeding completed");
    } catch (error) {
      log(`Error in database seeding: ${error}`);
    }
  }
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    console.error("Error:", err);
    res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})().catch((error) => {
  console.error("Fatal error during server startup:", error);
  process.exit(1);
});
