import migrateEnum from './migrate-enum';

// Run the migration immediately
migrateEnum()
  .then(() => {
    console.log("Enum migration completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Enum migration failed:", error);
    process.exit(1);
  });