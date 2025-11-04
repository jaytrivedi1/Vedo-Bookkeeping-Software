import { neon } from "@neondatabase/serverless";
import { CURRENCIES } from "@shared/currencies";

const sql = neon(process.env.DATABASE_URL!);

export async function addMultiCurrencySupport() {
  console.log("Starting migration to add multi-currency support...");

  try {
    // Create currencies table
    await sql`
      CREATE TABLE IF NOT EXISTS currencies (
        id SERIAL PRIMARY KEY,
        code VARCHAR(3) NOT NULL UNIQUE,
        name TEXT NOT NULL,
        symbol VARCHAR(10) NOT NULL,
        decimals INTEGER NOT NULL DEFAULT 2,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    console.log("Created currencies table");

    // Create exchange_rates table
    await sql`
      CREATE TABLE IF NOT EXISTS exchange_rates (
        id SERIAL PRIMARY KEY,
        from_currency VARCHAR(3) NOT NULL,
        to_currency VARCHAR(3) NOT NULL,
        rate DECIMAL(18, 6) NOT NULL,
        effective_date DATE NOT NULL,
        is_manual BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    console.log("Created exchange_rates table");

    // Create fx_realizations table
    await sql`
      CREATE TABLE IF NOT EXISTS fx_realizations (
        id SERIAL PRIMARY KEY,
        transaction_id INTEGER REFERENCES transactions(id),
        payment_id INTEGER REFERENCES transactions(id),
        original_rate DECIMAL(18, 6) NOT NULL,
        payment_rate DECIMAL(18, 6) NOT NULL,
        foreign_amount DECIMAL(15, 2) NOT NULL,
        gain_loss_amount DECIMAL(15, 2) NOT NULL,
        realized_date DATE NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    console.log("Created fx_realizations table");

    // Create fx_revaluations table
    await sql`
      CREATE TABLE IF NOT EXISTS fx_revaluations (
        id SERIAL PRIMARY KEY,
        revaluation_date DATE NOT NULL,
        account_type VARCHAR(50) NOT NULL,
        currency VARCHAR(3) NOT NULL,
        foreign_balance DECIMAL(15, 2) NOT NULL,
        original_rate DECIMAL(18, 6) NOT NULL,
        revaluation_rate DECIMAL(18, 6) NOT NULL,
        unrealized_gain_loss DECIMAL(15, 2) NOT NULL,
        journal_entry_id INTEGER REFERENCES transactions(id),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `;
    console.log("Created fx_revaluations table");

    // Create currency_locks table
    await sql`
      CREATE TABLE IF NOT EXISTS currency_locks (
        id SERIAL PRIMARY KEY,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INTEGER NOT NULL,
        locked_at TIMESTAMP NOT NULL DEFAULT NOW(),
        first_transaction_id INTEGER REFERENCES transactions(id)
      );
    `;
    console.log("Created currency_locks table");

    // Add multi-currency columns to preferences table
    await sql`
      ALTER TABLE preferences 
      ADD COLUMN IF NOT EXISTS multi_currency_enabled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS home_currency VARCHAR(3) DEFAULT 'USD',
      ADD COLUMN IF NOT EXISTS multi_currency_enabled_at TIMESTAMP;
    `;
    console.log("Added multi-currency columns to preferences table");

    // Add multi-currency columns to transactions table
    await sql`
      ALTER TABLE transactions
      ADD COLUMN IF NOT EXISTS currency VARCHAR(3),
      ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(18, 6),
      ADD COLUMN IF NOT EXISTS foreign_amount DECIMAL(15, 2);
    `;
    console.log("Added multi-currency columns to transactions table");

    // Seed currencies table with all currencies
    const checkCurrencies = await sql`SELECT COUNT(*) as count FROM currencies`;
    const count = (checkCurrencies[0] as any).count;

    if (parseInt(count) === 0) {
      // Insert currencies in smaller batches to avoid SQL length limits
      const batchSize = 20;
      for (let i = 0; i < CURRENCIES.length; i += batchSize) {
        const batch = CURRENCIES.slice(i, i + batchSize);
        const currencyValues = batch.map((c) => 
          `('${c.code}', '${c.name.replace(/'/g, "''")}', '${c.symbol.replace(/'/g, "''")}', ${c.decimals})`
        ).join(',');
        
        const query = `INSERT INTO currencies (code, name, symbol, decimals) VALUES ${currencyValues} ON CONFLICT (code) DO NOTHING`;
        await sql([query] as any);
      }
      console.log(`Seeded ${CURRENCIES.length} currencies`);
    } else {
      console.log("Currencies already seeded, skipping");
    }

    console.log("Multi-currency migration completed successfully!");
  } catch (error) {
    console.error("Error during multi-currency migration:", error);
    throw error;
  }
}
