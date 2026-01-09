-- Add billing_type enum
DO $$ BEGIN
  CREATE TYPE billing_type AS ENUM ('firm_pays', 'client_pays');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to firm_client_access table
ALTER TABLE firm_client_access
ADD COLUMN IF NOT EXISTS is_own_company BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE firm_client_access
ADD COLUMN IF NOT EXISTS billing_type billing_type NOT NULL DEFAULT 'client_pays';

-- Create index for quick lookup of firm's own company
CREATE INDEX IF NOT EXISTS idx_firm_client_access_own_company
ON firm_client_access(firm_id) WHERE is_own_company = true;
