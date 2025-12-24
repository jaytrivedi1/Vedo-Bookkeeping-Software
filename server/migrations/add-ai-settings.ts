import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function addAiSettings() {
  console.log("Starting migration to add AI categorization settings...");

  try {
    // Add aiCategorizationEnabled column
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'preferences'
          AND column_name = 'ai_categorization_enabled'
        ) THEN
          ALTER TABLE preferences
          ADD COLUMN ai_categorization_enabled BOOLEAN NOT NULL DEFAULT true;
        END IF;
      END $$;
    `;
    console.log("Added ai_categorization_enabled column");

    // Add aiAutoPostEnabled column
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'preferences'
          AND column_name = 'ai_auto_post_enabled'
        ) THEN
          ALTER TABLE preferences
          ADD COLUMN ai_auto_post_enabled BOOLEAN NOT NULL DEFAULT false;
        END IF;
      END $$;
    `;
    console.log("Added ai_auto_post_enabled column");

    // Add aiAutoPostMinConfidence column
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'preferences'
          AND column_name = 'ai_auto_post_min_confidence'
        ) THEN
          ALTER TABLE preferences
          ADD COLUMN ai_auto_post_min_confidence DECIMAL(3, 2) NOT NULL DEFAULT 0.95;
        END IF;
      END $$;
    `;
    console.log("Added ai_auto_post_min_confidence column");

    // Add aiRuleGenerationEnabled column
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'preferences'
          AND column_name = 'ai_rule_generation_enabled'
        ) THEN
          ALTER TABLE preferences
          ADD COLUMN ai_rule_generation_enabled BOOLEAN NOT NULL DEFAULT true;
        END IF;
      END $$;
    `;
    console.log("Added ai_rule_generation_enabled column");

    console.log("AI categorization settings migration completed successfully!");
  } catch (error) {
    console.error("Error in AI settings migration:", error);
    throw error;
  }
}
