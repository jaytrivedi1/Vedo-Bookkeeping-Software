-- Migration: Add auto_apply column to categorization_rules table
-- This column controls whether matching transactions are automatically categorized
-- or just shown as suggestions

ALTER TABLE categorization_rules
ADD COLUMN IF NOT EXISTS auto_apply BOOLEAN NOT NULL DEFAULT TRUE;

-- Update existing rules to have auto_apply enabled by default
UPDATE categorization_rules SET auto_apply = TRUE WHERE auto_apply IS NULL;
