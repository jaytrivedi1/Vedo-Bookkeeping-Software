import { db } from "../db";
import { sql } from "drizzle-orm";

export async function addAiConversationsTables() {
  console.log("Starting migration to add AI conversations support...");

  try {
    // Create ai_conversations table if it doesn't exist
    const hasConversationsTable = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'ai_conversations'
    `);

    if (hasConversationsTable.rows.length === 0) {
      console.log("Creating ai_conversations table...");
      await db.execute(sql`
        CREATE TABLE ai_conversations (
          id SERIAL PRIMARY KEY,
          company_id INTEGER REFERENCES companies(id),
          user_id INTEGER REFERENCES users(id),
          title TEXT NOT NULL DEFAULT 'New Conversation',
          is_archived BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);

      // Create indexes for faster lookups
      await db.execute(sql`
        CREATE INDEX idx_ai_conversations_user_id
        ON ai_conversations(user_id)
      `);

      await db.execute(sql`
        CREATE INDEX idx_ai_conversations_company_id
        ON ai_conversations(company_id)
      `);

      await db.execute(sql`
        CREATE INDEX idx_ai_conversations_updated_at
        ON ai_conversations(updated_at DESC)
      `);

      console.log("ai_conversations table created successfully");
    } else {
      console.log("ai_conversations table already exists. Skipping.");
    }

    // Create ai_messages table if it doesn't exist
    const hasMessagesTable = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'ai_messages'
    `);

    if (hasMessagesTable.rows.length === 0) {
      console.log("Creating ai_messages table...");
      await db.execute(sql`
        CREATE TABLE ai_messages (
          id SERIAL PRIMARY KEY,
          conversation_id INTEGER NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          data JSONB,
          actions JSONB,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);

      // Create index for faster lookups
      await db.execute(sql`
        CREATE INDEX idx_ai_messages_conversation_id
        ON ai_messages(conversation_id)
      `);

      await db.execute(sql`
        CREATE INDEX idx_ai_messages_created_at
        ON ai_messages(created_at)
      `);

      console.log("ai_messages table created successfully");
    } else {
      console.log("ai_messages table already exists. Skipping.");
    }

    console.log("AI conversations migration completed successfully!");
  } catch (error) {
    console.error("AI conversations migration error:", error);
    throw error;
  }
}
