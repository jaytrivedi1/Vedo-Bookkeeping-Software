/**
 * Run database migrations
 *
 * Usage: npm run db:migrate
 *
 * This script should be run before deploying to Vercel to ensure
 * all database migrations are applied.
 */

import migrateLineItems from "../server/migrate-line-items";
import { migrateCompanyTable } from "../server/migrate-company";
import migrateSalesTaxComponents from "../server/migrate-sales-tax-components";
import migrateTransactions from "../server/migrate-transactions";
import migrateChequeTransactionType from "../server/migrate-cheque-transaction-type";
import migrateStatusEnum from "../server/migrate-status-enum";
import { migrateStatusEnum as migrateOpenStatus } from "../server/migrate-enum";
import migrateInvoiceBalance from "../server/migrate-invoice-balance";
import migrateDueDates from "../server/migrate-due-dates";
import migrateDepositCredits from "../server/migrate-deposit-credits";
import batchUpdateInvoiceStatuses from "../server/batch-update-invoice-statuses";
import { fixAllBalances } from "../server/fix-all-balances";
import { migratePaymentApplications } from "../server/migrate-payment-applications";
import { cleanupOrphanedCredits } from "../server/migrate-cleanup-orphaned-credits";
import { recalculateBillBalances } from "../server/recalculate-bill-balances";
import { seedAdminUser } from "../server/migrations/seed-admin-user";
import { addCsvSupport } from "../server/migrations/add-csv-support";
import migrateAddSalesReceiptTransfer from "../server/migrate-add-sales-receipt-transfer";
import { migrateImportedTransactionsAccountId } from "../server/migrate-imported-transactions-account-id";
import { migrateBankMultiMatch } from "../server/migrate-bank-multi-match";
import { addMultiCurrencySupport } from "../server/migrations/add-multi-currency";
import { migrateInvoiceActivities } from "../server/migrations/add-invoice-activities";
import { addUserCompaniesTable } from "../server/migrations/add-user-companies";
import { addCompanyCodeMigration } from "../server/migrations/add-company-code";

function log(message: string) {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [migration] ${message}`);
}

async function runMigrations() {
  log("Starting database migrations...");

  try {
    // Run the line items migration to add sales_tax_id column
    log("Running line items migration...");
    await migrateLineItems();

    // Run company table migration to create companies and set up default company
    log("Running company table migration...");
    await migrateCompanyTable();

    // Add unique company codes (VED-XXXXXXXX format)
    log("Running company code migration...");
    await addCompanyCodeMigration();

    // Run user_companies table migration
    log("Running user_companies table migration...");
    await addUserCompaniesTable();

    // Run sales tax components migration
    log("Running sales tax components migration...");
    await migrateSalesTaxComponents();

    // Run transactions migration to add balance field
    log("Running transactions migration...");
    await migrateTransactions();

    // Add multi-currency support
    log("Running multi-currency support migration...");
    await addMultiCurrencySupport();

    // Run migration to add 'cheque' to transaction_type enum
    log("Running cheque transaction type migration...");
    await migrateChequeTransactionType();

    // Run status enum migration
    log("Running status enum migration...");
    await migrateStatusEnum();

    // Run migration to add 'open' status
    log("Running open status migration...");
    await migrateOpenStatus();

    // Run migration to fix invoice balance issues
    log("Running invoice balance migration...");
    await migrateInvoiceBalance();

    // Run migration to populate missing due dates
    log("Running due dates migration...");
    await migrateDueDates();

    // Run migration to fix deposit credit balances
    log("Running deposit credits migration...");
    await migrateDepositCredits();

    // Run batch update to fix invoice statuses
    log("Running batch invoice status update...");
    await batchUpdateInvoiceStatuses();

    // Run comprehensive balance fixer
    log("Running balance fix...");
    await fixAllBalances();

    // Run migration to populate payment_applications table
    log("Running payment applications migration...");
    await migratePaymentApplications();

    // Run migration to clean up orphaned credits
    log("Running orphaned credits cleanup...");
    await cleanupOrphanedCredits();

    // Recalculate all bill balances
    log("Running bill balances recalculation...");
    await recalculateBillBalances();

    // Seed admin user
    log("Running admin user seed...");
    await seedAdminUser();

    // Add CSV upload support
    log("Running CSV support migration...");
    await addCsvSupport();

    // Add 'sales_receipt' and 'transfer' transaction types
    log("Running sales receipt/transfer migration...");
    await migrateAddSalesReceiptTransfer();

    // Fix imported transactions
    log("Running imported transactions migration...");
    await migrateImportedTransactionsAccountId();

    // Add multi-match support for bank feeds
    log("Running bank multi-match migration...");
    await migrateBankMultiMatch();

    // Add invoice activities
    log("Running invoice activities migration...");
    await migrateInvoiceActivities();

    log("All migrations completed successfully!");
    process.exit(0);
  } catch (error) {
    log(`Migration error: ${error}`);
    process.exit(1);
  }
}

runMigrations();
