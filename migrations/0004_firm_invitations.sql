-- Add firm invitation status enum
DO $$ BEGIN
  CREATE TYPE firm_invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create firm_invitations table for companies to invite accounting firms
CREATE TABLE IF NOT EXISTS firm_invitations (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  firm_email TEXT NOT NULL,
  firm_id INTEGER REFERENCES accounting_firms(id),
  token TEXT NOT NULL UNIQUE,
  status firm_invitation_status NOT NULL DEFAULT 'pending',
  billing_type billing_type NOT NULL DEFAULT 'client_pays',
  invited_by INTEGER NOT NULL REFERENCES users(id),
  expires_at TIMESTAMP NOT NULL,
  responded_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_firm_invitations_company ON firm_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_firm_invitations_firm ON firm_invitations(firm_id);
CREATE INDEX IF NOT EXISTS idx_firm_invitations_token ON firm_invitations(token);
CREATE INDEX IF NOT EXISTS idx_firm_invitations_status ON firm_invitations(status);
CREATE INDEX IF NOT EXISTS idx_firm_invitations_email ON firm_invitations(firm_email);
