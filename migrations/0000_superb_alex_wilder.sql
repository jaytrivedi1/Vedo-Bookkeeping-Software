CREATE TYPE "public"."account_type" AS ENUM('accounts_receivable', 'current_assets', 'bank', 'property_plant_equipment', 'long_term_assets', 'accounts_payable', 'credit_card', 'other_current_liabilities', 'long_term_liabilities', 'equity', 'income', 'other_income', 'cost_of_goods_sold', 'expenses', 'other_expense');--> statement-breakpoint
CREATE TYPE "public"."activity_type" AS ENUM('created', 'sent', 'viewed', 'paid', 'edited', 'overdue', 'reminder_sent', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."cash_flow_category" AS ENUM('operating', 'investing', 'financing', 'none');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'check', 'credit_card', 'bank_transfer', 'other');--> statement-breakpoint
CREATE TYPE "public"."reconciliation_status" AS ENUM('in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."recurring_frequency" AS ENUM('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'custom');--> statement-breakpoint
CREATE TYPE "public"."recurring_status" AS ENUM('active', 'paused', 'cancelled', 'completed');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'staff', 'read_only', 'accountant');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('completed', 'cancelled', 'paid', 'overdue', 'partial', 'unapplied_credit', 'open', 'quotation', 'draft', 'approved');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('invoice', 'expense', 'journal_entry', 'deposit', 'payment', 'bill', 'cheque', 'sales_receipt', 'transfer', 'customer_credit', 'vendor_credit');--> statement-breakpoint
CREATE TABLE "accounting_firms" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"type" "account_type" NOT NULL,
	"currency" text DEFAULT 'USD',
	"sales_tax_type" text,
	"balance" double precision DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"cash_flow_category" "cash_flow_category" DEFAULT 'none',
	CONSTRAINT "accounts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" integer,
	"details" json,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"connection_id" integer NOT NULL,
	"plaid_account_id" text NOT NULL,
	"name" text NOT NULL,
	"mask" text,
	"official_name" text,
	"type" text NOT NULL,
	"subtype" text,
	"current_balance" double precision,
	"available_balance" double precision,
	"linked_account_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bank_accounts_plaid_account_id_unique" UNIQUE("plaid_account_id")
);
--> statement-breakpoint
CREATE TABLE "bank_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"access_token" text NOT NULL,
	"institution_id" text NOT NULL,
	"institution_name" text NOT NULL,
	"account_ids" text[] NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_sync" timestamp,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bank_connections_item_id_unique" UNIQUE("item_id")
);
--> statement-breakpoint
CREATE TABLE "bank_transaction_matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"imported_transaction_id" integer NOT NULL,
	"matched_transaction_id" integer NOT NULL,
	"amount_applied" double precision NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categorization_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"conditions" json NOT NULL,
	"actions" json NOT NULL,
	"sales_tax_id" integer,
	"attachment_path" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"street1" text,
	"street2" text,
	"city" text,
	"state" text,
	"postal_code" text,
	"country" text,
	"phone" text,
	"email" text,
	"website" text,
	"tax_id" text,
	"logo_url" text,
	"fiscal_year_start_month" integer DEFAULT 1,
	"is_active" boolean DEFAULT true,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "company_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"street1" text,
	"street2" text,
	"city" text,
	"state" text,
	"postal_code" text,
	"country" text,
	"phone" text,
	"email" text,
	"website" text,
	"tax_id" text,
	"logo_url" text,
	"fiscal_year_start_month" integer DEFAULT 1,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"contact_name" text,
	"email" text,
	"phone" text,
	"address" text,
	"type" text NOT NULL,
	"currency" text DEFAULT 'USD',
	"default_tax_rate" double precision DEFAULT 0,
	"document_ids" text[],
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "csv_mapping_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"date_column" text NOT NULL,
	"description_column" text NOT NULL,
	"amount_column" text,
	"credit_column" text,
	"debit_column" text,
	"date_format" text DEFAULT 'MM/DD/YYYY' NOT NULL,
	"has_header_row" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "currencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(3) NOT NULL,
	"name" text NOT NULL,
	"symbol" varchar(10) NOT NULL,
	"decimals" integer DEFAULT 2 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "currencies_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "currency_locks" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" integer NOT NULL,
	"locked_at" timestamp DEFAULT now() NOT NULL,
	"first_transaction_id" integer
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_currency" varchar(3) NOT NULL,
	"to_currency" varchar(3) NOT NULL,
	"rate" numeric(18, 6) NOT NULL,
	"effective_date" date NOT NULL,
	"is_manual" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "firm_client_access" (
	"id" serial PRIMARY KEY NOT NULL,
	"firm_id" integer NOT NULL,
	"company_id" integer NOT NULL,
	"granted_by" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fx_realizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"transaction_id" integer,
	"payment_id" integer,
	"original_rate" numeric(18, 6) NOT NULL,
	"payment_rate" numeric(18, 6) NOT NULL,
	"foreign_amount" numeric(15, 2) NOT NULL,
	"gain_loss_amount" numeric(15, 2) NOT NULL,
	"realized_date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fx_revaluations" (
	"id" serial PRIMARY KEY NOT NULL,
	"revaluation_date" date NOT NULL,
	"account_type" varchar(50) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"foreign_balance" numeric(15, 2) NOT NULL,
	"original_rate" numeric(18, 6) NOT NULL,
	"revaluation_rate" numeric(18, 6) NOT NULL,
	"unrealized_gain_loss" numeric(15, 2) NOT NULL,
	"journal_entry_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imported_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text DEFAULT 'plaid' NOT NULL,
	"bank_account_id" integer,
	"account_id" integer,
	"plaid_transaction_id" text,
	"date" timestamp NOT NULL,
	"authorized_date" timestamp,
	"name" text NOT NULL,
	"merchant_name" text,
	"amount" double precision NOT NULL,
	"iso_currency_code" text,
	"category" text[],
	"pending" boolean DEFAULT false NOT NULL,
	"payment_channel" text,
	"matched_transaction_id" integer,
	"matched_transaction_type" text,
	"match_confidence" double precision,
	"is_manual_match" boolean DEFAULT false,
	"is_multi_match" boolean DEFAULT false,
	"status" text DEFAULT 'unmatched' NOT NULL,
	"suggested_account_id" integer,
	"suggested_sales_tax_id" integer,
	"suggested_contact_name" text,
	"suggested_memo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "imported_transactions_plaid_transaction_id_unique" UNIQUE("plaid_transaction_id")
);
--> statement-breakpoint
CREATE TABLE "invoice_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"activity_type" "activity_type" NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"user_id" integer,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"transaction_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"description" text,
	"debit" double precision DEFAULT 0 NOT NULL,
	"credit" double precision DEFAULT 0 NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"currency" varchar(3),
	"exchange_rate" numeric(18, 6),
	"foreign_amount" numeric(15, 2)
);
--> statement-breakpoint
CREATE TABLE "line_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"transaction_id" integer NOT NULL,
	"description" text NOT NULL,
	"quantity" double precision DEFAULT 1 NOT NULL,
	"unit_price" double precision NOT NULL,
	"amount" double precision NOT NULL,
	"account_id" integer,
	"sales_tax_id" integer,
	"product_id" integer
);
--> statement-breakpoint
CREATE TABLE "payment_applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"payment_id" integer NOT NULL,
	"invoice_id" integer NOT NULL,
	"amount_applied" double precision NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"dark_mode" boolean DEFAULT false,
	"foreign_currency" boolean DEFAULT false,
	"default_currency" text DEFAULT 'USD',
	"multi_currency_enabled" boolean DEFAULT false,
	"home_currency" varchar(3) DEFAULT 'USD',
	"multi_currency_enabled_at" timestamp,
	"invoice_template" text DEFAULT 'classic',
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sku" text,
	"type" text DEFAULT 'product' NOT NULL,
	"price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"cost" numeric(10, 2) DEFAULT '0',
	"account_id" integer NOT NULL,
	"sales_tax_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reconciliation_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"reconciliation_id" integer NOT NULL,
	"ledger_entry_id" integer NOT NULL,
	"is_cleared" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reconciliations" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"statement_date" timestamp NOT NULL,
	"statement_ending_balance" double precision NOT NULL,
	"cleared_balance" double precision DEFAULT 0 NOT NULL,
	"difference" double precision DEFAULT 0 NOT NULL,
	"status" "reconciliation_status" DEFAULT 'in_progress' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "recurring_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"invoice_id" integer,
	"scheduled_at" timestamp NOT NULL,
	"generated_at" timestamp,
	"sent_at" timestamp,
	"paid_at" timestamp,
	"status" text NOT NULL,
	"error_message" text,
	"retry_count" integer DEFAULT 0,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"description" text NOT NULL,
	"quantity" double precision DEFAULT 1 NOT NULL,
	"unit_price" double precision NOT NULL,
	"amount" double precision NOT NULL,
	"account_id" integer,
	"sales_tax_id" integer,
	"product_id" integer,
	"order_index" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "recurring_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"template_name" text NOT NULL,
	"currency" varchar(3) DEFAULT 'USD',
	"frequency" "recurring_frequency" NOT NULL,
	"frequency_value" integer DEFAULT 1,
	"frequency_unit" text,
	"start_date" date NOT NULL,
	"end_date" date,
	"max_occurrences" integer,
	"current_occurrences" integer DEFAULT 0,
	"day_of_month" integer,
	"timezone" text DEFAULT 'UTC',
	"next_run_at" timestamp NOT NULL,
	"last_run_at" timestamp,
	"status" "recurring_status" DEFAULT 'active' NOT NULL,
	"auto_email" boolean DEFAULT false,
	"auto_charge" boolean DEFAULT false,
	"preview_before_send" boolean DEFAULT false,
	"payment_terms" text,
	"memo" text,
	"attachments" text[],
	"sub_total" double precision DEFAULT 0 NOT NULL,
	"tax_amount" double precision DEFAULT 0 NOT NULL,
	"total_amount" double precision DEFAULT 0 NOT NULL,
	"exchange_rate" numeric(18, 6),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"role" "role" NOT NULL,
	"permission_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_tax_components" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"rate" double precision DEFAULT 0 NOT NULL,
	"account_id" integer,
	"parent_tax_id" integer NOT NULL,
	"display_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "sales_taxes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"rate" double precision DEFAULT 0 NOT NULL,
	"account_id" integer,
	"is_active" boolean DEFAULT true,
	"is_composite" boolean DEFAULT false,
	"parent_id" integer,
	"display_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "transaction_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"imported_transaction_id" integer NOT NULL,
	"file_name" text NOT NULL,
	"file_path" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"reference" text,
	"type" "transaction_type" NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"description" text,
	"amount" double precision NOT NULL,
	"sub_total" double precision,
	"tax_amount" double precision,
	"balance" double precision,
	"contact_id" integer,
	"status" "status" DEFAULT 'open' NOT NULL,
	"payment_method" "payment_method",
	"payment_account_id" integer,
	"payment_date" timestamp,
	"memo" text,
	"attachments" text[],
	"due_date" timestamp,
	"payment_terms" text,
	"currency" varchar(3),
	"exchange_rate" numeric(18, 6),
	"foreign_amount" numeric(15, 2),
	"secure_token" varchar(64),
	CONSTRAINT "transactions_secure_token_unique" UNIQUE("secure_token")
);
--> statement-breakpoint
CREATE TABLE "user_companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"company_id" integer NOT NULL,
	"role" "role" DEFAULT 'read_only' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"token" text NOT NULL,
	"role" "role" NOT NULL,
	"company_id" integer,
	"firm_id" integer,
	"invited_by" integer NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"role" "role" DEFAULT 'read_only' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"company_id" integer,
	"firm_id" integer,
	"current_company_id" integer,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_connection_id_bank_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."bank_connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_linked_account_id_accounts_id_fk" FOREIGN KEY ("linked_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transaction_matches" ADD CONSTRAINT "bank_transaction_matches_imported_transaction_id_imported_transactions_id_fk" FOREIGN KEY ("imported_transaction_id") REFERENCES "public"."imported_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_transaction_matches" ADD CONSTRAINT "bank_transaction_matches_matched_transaction_id_transactions_id_fk" FOREIGN KEY ("matched_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categorization_rules" ADD CONSTRAINT "categorization_rules_sales_tax_id_sales_taxes_id_fk" FOREIGN KEY ("sales_tax_id") REFERENCES "public"."sales_taxes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "csv_mapping_preferences" ADD CONSTRAINT "csv_mapping_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "csv_mapping_preferences" ADD CONSTRAINT "csv_mapping_preferences_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "currency_locks" ADD CONSTRAINT "currency_locks_first_transaction_id_transactions_id_fk" FOREIGN KEY ("first_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "firm_client_access" ADD CONSTRAINT "firm_client_access_firm_id_accounting_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."accounting_firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "firm_client_access" ADD CONSTRAINT "firm_client_access_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "firm_client_access" ADD CONSTRAINT "firm_client_access_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_realizations" ADD CONSTRAINT "fx_realizations_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_realizations" ADD CONSTRAINT "fx_realizations_payment_id_transactions_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_revaluations" ADD CONSTRAINT "fx_revaluations_journal_entry_id_transactions_id_fk" FOREIGN KEY ("journal_entry_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imported_transactions" ADD CONSTRAINT "imported_transactions_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imported_transactions" ADD CONSTRAINT "imported_transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imported_transactions" ADD CONSTRAINT "imported_transactions_matched_transaction_id_transactions_id_fk" FOREIGN KEY ("matched_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imported_transactions" ADD CONSTRAINT "imported_transactions_suggested_account_id_accounts_id_fk" FOREIGN KEY ("suggested_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imported_transactions" ADD CONSTRAINT "imported_transactions_suggested_sales_tax_id_sales_taxes_id_fk" FOREIGN KEY ("suggested_sales_tax_id") REFERENCES "public"."sales_taxes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_activities" ADD CONSTRAINT "invoice_activities_invoice_id_transactions_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_activities" ADD CONSTRAINT "invoice_activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "line_items" ADD CONSTRAINT "line_items_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "line_items" ADD CONSTRAINT "line_items_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "line_items" ADD CONSTRAINT "line_items_sales_tax_id_sales_taxes_id_fk" FOREIGN KEY ("sales_tax_id") REFERENCES "public"."sales_taxes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "line_items" ADD CONSTRAINT "line_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_applications" ADD CONSTRAINT "payment_applications_payment_id_transactions_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_applications" ADD CONSTRAINT "payment_applications_invoice_id_transactions_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_sales_tax_id_sales_taxes_id_fk" FOREIGN KEY ("sales_tax_id") REFERENCES "public"."sales_taxes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_items" ADD CONSTRAINT "reconciliation_items_reconciliation_id_reconciliations_id_fk" FOREIGN KEY ("reconciliation_id") REFERENCES "public"."reconciliations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_items" ADD CONSTRAINT "reconciliation_items_ledger_entry_id_ledger_entries_id_fk" FOREIGN KEY ("ledger_entry_id") REFERENCES "public"."ledger_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliations" ADD CONSTRAINT "reconciliations_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_history" ADD CONSTRAINT "recurring_history_template_id_recurring_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."recurring_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_history" ADD CONSTRAINT "recurring_history_invoice_id_transactions_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_lines" ADD CONSTRAINT "recurring_lines_template_id_recurring_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."recurring_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_lines" ADD CONSTRAINT "recurring_lines_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_lines" ADD CONSTRAINT "recurring_lines_sales_tax_id_sales_taxes_id_fk" FOREIGN KEY ("sales_tax_id") REFERENCES "public"."sales_taxes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_lines" ADD CONSTRAINT "recurring_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_templates" ADD CONSTRAINT "recurring_templates_customer_id_contacts_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_tax_components" ADD CONSTRAINT "sales_tax_components_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_tax_components" ADD CONSTRAINT "sales_tax_components_parent_tax_id_sales_taxes_id_fk" FOREIGN KEY ("parent_tax_id") REFERENCES "public"."sales_taxes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_taxes" ADD CONSTRAINT "sales_taxes_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_taxes" ADD CONSTRAINT "sales_taxes_parent_id_sales_taxes_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."sales_taxes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_attachments" ADD CONSTRAINT "transaction_attachments_imported_transaction_id_imported_transactions_id_fk" FOREIGN KEY ("imported_transaction_id") REFERENCES "public"."imported_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_payment_account_id_accounts_id_fk" FOREIGN KEY ("payment_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_companies" ADD CONSTRAINT "user_companies_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_firm_id_accounting_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."accounting_firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_firm_id_accounting_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."accounting_firms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_current_company_id_companies_id_fk" FOREIGN KEY ("current_company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_rate_per_day" ON "exchange_rates" USING btree ("from_currency","to_currency","effective_date");