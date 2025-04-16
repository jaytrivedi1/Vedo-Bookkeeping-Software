import migrateTransactionTypeEnum from './migrate-transaction-type-enum';

// Run the migration immediately
migrateTransactionTypeEnum()
  .then(() => {
    console.log("Transaction type enum migration completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Transaction type enum migration failed:", error);
    process.exit(1);
  });