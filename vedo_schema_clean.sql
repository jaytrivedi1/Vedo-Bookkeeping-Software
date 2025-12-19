--
-- PostgreSQL database dump
--


-- Dumped from database version 16.11 (b740647)
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: neondb_owner
--

CREATE SCHEMA drizzle;


ALTER SCHEMA drizzle OWNER TO neondb_owner;

--
-- Name: account_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.account_type AS ENUM (
    'accounts_receivable',
    'current_assets',
    'bank',
    'property_plant_equipment',
    'long_term_assets',
    'accounts_payable',
    'credit_card',
    'other_current_liabilities',
    'long_term_liabilities',
    'equity',
    'income',
    'other_income',
    'cost_of_goods_sold',
    'expenses',
    'other_expense'
);


ALTER TYPE public.account_type OWNER TO neondb_owner;

--
-- Name: cash_flow_category; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.cash_flow_category AS ENUM (
    'operating',
    'investing',
    'financing',
    'none'
);


ALTER TYPE public.cash_flow_category OWNER TO neondb_owner;

--
-- Name: payment_method; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.payment_method AS ENUM (
    'cash',
    'check',
    'credit_card',
    'bank_transfer',
    'other'
);


ALTER TYPE public.payment_method OWNER TO neondb_owner;

--
-- Name: reconciliation_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.reconciliation_status AS ENUM (
    'in_progress',
    'completed',
    'cancelled'
);


ALTER TYPE public.reconciliation_status OWNER TO neondb_owner;

--
-- Name: recurring_frequency; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.recurring_frequency AS ENUM (
    'daily',
    'weekly',
    'biweekly',
    'monthly',
    'quarterly',
    'yearly',
    'custom'
);


ALTER TYPE public.recurring_frequency OWNER TO neondb_owner;

--
-- Name: recurring_status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.recurring_status AS ENUM (
    'active',
    'paused',
    'cancelled',
    'completed'
);


ALTER TYPE public.recurring_status OWNER TO neondb_owner;

--
-- Name: status; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.status AS ENUM (
    'draft',
    'pending',
    'completed',
    'cancelled',
    'paid',
    'overdue',
    'partial',
    'unapplied_credit',
    'open',
    'quotation',
    'approved'
);


ALTER TYPE public.status OWNER TO neondb_owner;

--
-- Name: transaction_type; Type: TYPE; Schema: public; Owner: neondb_owner
--

CREATE TYPE public.transaction_type AS ENUM (
    'invoice',
    'expense',
    'journal_entry',
    'deposit',
    'payment',
    'bill',
    'cheque',
    'sales_receipt',
    'transfer',
    'customer_credit',
    'vendor_credit'
);


ALTER TYPE public.transaction_type OWNER TO neondb_owner;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: neondb_owner
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


ALTER TABLE drizzle.__drizzle_migrations OWNER TO neondb_owner;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: neondb_owner
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNER TO neondb_owner;

--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: neondb_owner
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: accounting_firms; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.accounting_firms (
    id integer NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    address text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.accounting_firms OWNER TO neondb_owner;

--
-- Name: accounting_firms_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.accounting_firms_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.accounting_firms_id_seq OWNER TO neondb_owner;

--
-- Name: accounting_firms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.accounting_firms_id_seq OWNED BY public.accounting_firms.id;


--
-- Name: accounts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.accounts (
    id integer NOT NULL,
    code text,
    name text NOT NULL,
    type public.account_type NOT NULL,
    currency text DEFAULT 'USD'::text,
    sales_tax_type text,
    balance double precision DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    cash_flow_category public.cash_flow_category DEFAULT 'none'::public.cash_flow_category
);


ALTER TABLE public.accounts OWNER TO neondb_owner;

--
-- Name: accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.accounts_id_seq OWNER TO neondb_owner;

--
-- Name: accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.accounts_id_seq OWNED BY public.accounts.id;


--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.activity_logs (
    id integer NOT NULL,
    user_id integer,
    action text NOT NULL,
    entity_type text,
    entity_id integer,
    details json,
    ip_address text,
    user_agent text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.activity_logs OWNER TO neondb_owner;

--
-- Name: activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.activity_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activity_logs_id_seq OWNER TO neondb_owner;

--
-- Name: activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.activity_logs_id_seq OWNED BY public.activity_logs.id;


--
-- Name: bank_accounts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.bank_accounts (
    id integer NOT NULL,
    connection_id integer NOT NULL,
    plaid_account_id text NOT NULL,
    name text NOT NULL,
    mask text,
    official_name text,
    type text NOT NULL,
    subtype text,
    current_balance double precision,
    available_balance double precision,
    linked_account_id integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    last_synced_at timestamp without time zone
);


ALTER TABLE public.bank_accounts OWNER TO neondb_owner;

--
-- Name: bank_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.bank_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bank_accounts_id_seq OWNER TO neondb_owner;

--
-- Name: bank_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.bank_accounts_id_seq OWNED BY public.bank_accounts.id;


--
-- Name: bank_connections; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.bank_connections (
    id integer NOT NULL,
    item_id text NOT NULL,
    access_token text NOT NULL,
    institution_id text NOT NULL,
    institution_name text NOT NULL,
    account_ids text[] NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    last_sync timestamp without time zone,
    error text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.bank_connections OWNER TO neondb_owner;

--
-- Name: bank_connections_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.bank_connections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bank_connections_id_seq OWNER TO neondb_owner;

--
-- Name: bank_connections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.bank_connections_id_seq OWNED BY public.bank_connections.id;


--
-- Name: bank_transaction_matches; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.bank_transaction_matches (
    id integer NOT NULL,
    imported_transaction_id integer NOT NULL,
    matched_transaction_id integer NOT NULL,
    amount_applied double precision NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.bank_transaction_matches OWNER TO neondb_owner;

--
-- Name: bank_transaction_matches_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.bank_transaction_matches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bank_transaction_matches_id_seq OWNER TO neondb_owner;

--
-- Name: bank_transaction_matches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.bank_transaction_matches_id_seq OWNED BY public.bank_transaction_matches.id;


--
-- Name: categorization_rules; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.categorization_rules (
    id integer NOT NULL,
    name text NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    conditions json NOT NULL,
    actions json NOT NULL,
    sales_tax_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    attachment_path text
);


ALTER TABLE public.categorization_rules OWNER TO neondb_owner;

--
-- Name: categorization_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.categorization_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categorization_rules_id_seq OWNER TO neondb_owner;

--
-- Name: categorization_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.categorization_rules_id_seq OWNED BY public.categorization_rules.id;


--
-- Name: companies; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.companies (
    id integer NOT NULL,
    name text NOT NULL,
    address text,
    phone text,
    email text,
    website text,
    tax_id text,
    logo_url text,
    is_active boolean DEFAULT true,
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    fiscal_year_start_month integer DEFAULT 1,
    street1 text,
    street2 text,
    city text,
    state text,
    postal_code text,
    country text,
    company_code text,
    industry text,
    company_type text,
    previous_software text,
    referral_source text
);


ALTER TABLE public.companies OWNER TO neondb_owner;

--
-- Name: companies_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.companies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.companies_id_seq OWNER TO neondb_owner;

--
-- Name: companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.companies_id_seq OWNED BY public.companies.id;


--
-- Name: company_settings; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.company_settings (
    id integer NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    address text,
    website text,
    tax_id text,
    logo_url text,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fiscal_year_start_month integer DEFAULT 1,
    street1 text,
    street2 text,
    city text,
    state text,
    postal_code text,
    country text
);


ALTER TABLE public.company_settings OWNER TO neondb_owner;

--
-- Name: company_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.company_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.company_settings_id_seq OWNER TO neondb_owner;

--
-- Name: company_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.company_settings_id_seq OWNED BY public.company_settings.id;


--
-- Name: contacts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.contacts (
    id integer NOT NULL,
    name text NOT NULL,
    contact_name text,
    email text,
    phone text,
    address text,
    type text NOT NULL,
    currency text DEFAULT 'USD'::text,
    default_tax_rate double precision DEFAULT 0,
    document_ids text[],
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.contacts OWNER TO neondb_owner;

--
-- Name: contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.contacts_id_seq OWNER TO neondb_owner;

--
-- Name: contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.contacts_id_seq OWNED BY public.contacts.id;


--
-- Name: csv_mapping_preferences; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.csv_mapping_preferences (
    id integer NOT NULL,
    user_id integer NOT NULL,
    account_id integer NOT NULL,
    date_column text NOT NULL,
    description_column text NOT NULL,
    amount_column text,
    credit_column text,
    debit_column text,
    date_format text DEFAULT 'MM/DD/YYYY'::text NOT NULL,
    has_header_row boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.csv_mapping_preferences OWNER TO neondb_owner;

--
-- Name: csv_mapping_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.csv_mapping_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.csv_mapping_preferences_id_seq OWNER TO neondb_owner;

--
-- Name: csv_mapping_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.csv_mapping_preferences_id_seq OWNED BY public.csv_mapping_preferences.id;


--
-- Name: currencies; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.currencies (
    id integer NOT NULL,
    code character varying(3) NOT NULL,
    name text NOT NULL,
    symbol character varying(10) NOT NULL,
    decimals integer DEFAULT 2 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.currencies OWNER TO neondb_owner;

--
-- Name: currencies_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.currencies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.currencies_id_seq OWNER TO neondb_owner;

--
-- Name: currencies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.currencies_id_seq OWNED BY public.currencies.id;


--
-- Name: currency_locks; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.currency_locks (
    id integer NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id integer NOT NULL,
    locked_at timestamp without time zone DEFAULT now() NOT NULL,
    first_transaction_id integer
);


ALTER TABLE public.currency_locks OWNER TO neondb_owner;

--
-- Name: currency_locks_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.currency_locks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.currency_locks_id_seq OWNER TO neondb_owner;

--
-- Name: currency_locks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.currency_locks_id_seq OWNED BY public.currency_locks.id;


--
-- Name: exchange_rates; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.exchange_rates (
    id integer NOT NULL,
    from_currency character varying(3) NOT NULL,
    to_currency character varying(3) NOT NULL,
    rate numeric(18,6) NOT NULL,
    effective_date date NOT NULL,
    is_manual boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.exchange_rates OWNER TO neondb_owner;

--
-- Name: exchange_rates_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.exchange_rates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.exchange_rates_id_seq OWNER TO neondb_owner;

--
-- Name: exchange_rates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.exchange_rates_id_seq OWNED BY public.exchange_rates.id;


--
-- Name: firm_client_access; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.firm_client_access (
    id integer NOT NULL,
    firm_id integer NOT NULL,
    company_id integer NOT NULL,
    granted_by integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.firm_client_access OWNER TO neondb_owner;

--
-- Name: firm_client_access_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.firm_client_access_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.firm_client_access_id_seq OWNER TO neondb_owner;

--
-- Name: firm_client_access_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.firm_client_access_id_seq OWNED BY public.firm_client_access.id;


--
-- Name: fx_realizations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.fx_realizations (
    id integer NOT NULL,
    transaction_id integer,
    payment_id integer,
    original_rate numeric(18,6) NOT NULL,
    payment_rate numeric(18,6) NOT NULL,
    foreign_amount numeric(15,2) NOT NULL,
    gain_loss_amount numeric(15,2) NOT NULL,
    realized_date date NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.fx_realizations OWNER TO neondb_owner;

--
-- Name: fx_realizations_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.fx_realizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fx_realizations_id_seq OWNER TO neondb_owner;

--
-- Name: fx_realizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.fx_realizations_id_seq OWNED BY public.fx_realizations.id;


--
-- Name: fx_revaluations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.fx_revaluations (
    id integer NOT NULL,
    revaluation_date date NOT NULL,
    account_type character varying(50) NOT NULL,
    currency character varying(3) NOT NULL,
    foreign_balance numeric(15,2) NOT NULL,
    original_rate numeric(18,6) NOT NULL,
    revaluation_rate numeric(18,6) NOT NULL,
    unrealized_gain_loss numeric(15,2) NOT NULL,
    journal_entry_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.fx_revaluations OWNER TO neondb_owner;

--
-- Name: fx_revaluations_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.fx_revaluations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.fx_revaluations_id_seq OWNER TO neondb_owner;

--
-- Name: fx_revaluations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.fx_revaluations_id_seq OWNED BY public.fx_revaluations.id;


--
-- Name: imported_transactions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.imported_transactions (
    id integer NOT NULL,
    bank_account_id integer,
    plaid_transaction_id text,
    date timestamp without time zone NOT NULL,
    authorized_date timestamp without time zone,
    name text NOT NULL,
    merchant_name text,
    amount double precision NOT NULL,
    iso_currency_code text,
    category text[],
    pending boolean DEFAULT false NOT NULL,
    payment_channel text,
    matched_transaction_id integer,
    status text DEFAULT 'unmatched'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    source text DEFAULT 'plaid'::text NOT NULL,
    account_id integer,
    matched_transaction_type text,
    match_confidence double precision,
    is_manual_match boolean DEFAULT false,
    is_multi_match boolean DEFAULT false,
    suggested_account_id integer,
    suggested_sales_tax_id integer,
    suggested_contact_name text,
    suggested_memo text
);


ALTER TABLE public.imported_transactions OWNER TO neondb_owner;

--
-- Name: imported_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.imported_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.imported_transactions_id_seq OWNER TO neondb_owner;

--
-- Name: imported_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.imported_transactions_id_seq OWNED BY public.imported_transactions.id;


--
-- Name: invoice_activities; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.invoice_activities (
    id integer NOT NULL,
    invoice_id integer NOT NULL,
    activity_type text NOT NULL,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT invoice_activities_activity_type_check CHECK ((activity_type = ANY (ARRAY['created'::text, 'sent'::text, 'viewed'::text, 'paid'::text, 'edited'::text, 'overdue'::text, 'reminder_sent'::text, 'cancelled'::text])))
);


ALTER TABLE public.invoice_activities OWNER TO neondb_owner;

--
-- Name: invoice_activities_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.invoice_activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.invoice_activities_id_seq OWNER TO neondb_owner;

--
-- Name: invoice_activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.invoice_activities_id_seq OWNED BY public.invoice_activities.id;


--
-- Name: ledger_entries; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.ledger_entries (
    id integer NOT NULL,
    transaction_id integer NOT NULL,
    account_id integer NOT NULL,
    description text,
    debit double precision DEFAULT 0 NOT NULL,
    credit double precision DEFAULT 0 NOT NULL,
    date timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    currency character varying(3),
    exchange_rate numeric(18,6),
    foreign_amount numeric(15,2)
);


ALTER TABLE public.ledger_entries OWNER TO neondb_owner;

--
-- Name: ledger_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.ledger_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ledger_entries_id_seq OWNER TO neondb_owner;

--
-- Name: ledger_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.ledger_entries_id_seq OWNED BY public.ledger_entries.id;


--
-- Name: line_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.line_items (
    id integer NOT NULL,
    transaction_id integer NOT NULL,
    description text NOT NULL,
    quantity double precision DEFAULT 1 NOT NULL,
    unit_price double precision NOT NULL,
    amount double precision NOT NULL,
    sales_tax_id integer,
    account_id integer,
    product_id integer
);


ALTER TABLE public.line_items OWNER TO neondb_owner;

--
-- Name: line_items_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.line_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.line_items_id_seq OWNER TO neondb_owner;

--
-- Name: line_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.line_items_id_seq OWNED BY public.line_items.id;


--
-- Name: payment_applications; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.payment_applications (
    id integer NOT NULL,
    payment_id integer NOT NULL,
    invoice_id integer NOT NULL,
    amount_applied double precision NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.payment_applications OWNER TO neondb_owner;

--
-- Name: payment_applications_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.payment_applications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_applications_id_seq OWNER TO neondb_owner;

--
-- Name: payment_applications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.payment_applications_id_seq OWNED BY public.payment_applications.id;


--
-- Name: preferences; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.preferences (
    id integer NOT NULL,
    dark_mode boolean,
    foreign_currency boolean,
    default_currency text,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    multi_currency_enabled boolean DEFAULT false,
    home_currency character varying(3) DEFAULT 'USD'::character varying,
    multi_currency_enabled_at timestamp without time zone,
    invoice_template text DEFAULT 'classic'::text,
    transaction_lock_date timestamp without time zone
);


ALTER TABLE public.preferences OWNER TO neondb_owner;

--
-- Name: preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.preferences_id_seq OWNER TO neondb_owner;

--
-- Name: preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.preferences_id_seq OWNED BY public.preferences.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.products (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    sku text,
    type text DEFAULT 'product'::text NOT NULL,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    cost numeric(10,2) DEFAULT 0,
    account_id integer NOT NULL,
    sales_tax_id integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.products OWNER TO neondb_owner;

--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.products_id_seq OWNER TO neondb_owner;

--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: reconciliation_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.reconciliation_items (
    id integer NOT NULL,
    reconciliation_id integer NOT NULL,
    ledger_entry_id integer NOT NULL,
    is_cleared boolean DEFAULT false NOT NULL
);


ALTER TABLE public.reconciliation_items OWNER TO neondb_owner;

--
-- Name: reconciliation_items_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.reconciliation_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reconciliation_items_id_seq OWNER TO neondb_owner;

--
-- Name: reconciliation_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.reconciliation_items_id_seq OWNED BY public.reconciliation_items.id;


--
-- Name: reconciliations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.reconciliations (
    id integer NOT NULL,
    account_id integer NOT NULL,
    statement_date timestamp without time zone NOT NULL,
    statement_ending_balance double precision NOT NULL,
    cleared_balance double precision DEFAULT 0 NOT NULL,
    difference double precision DEFAULT 0 NOT NULL,
    status public.reconciliation_status DEFAULT 'in_progress'::public.reconciliation_status NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    completed_at timestamp without time zone,
    notes text
);


ALTER TABLE public.reconciliations OWNER TO neondb_owner;

--
-- Name: reconciliations_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.reconciliations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reconciliations_id_seq OWNER TO neondb_owner;

--
-- Name: reconciliations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.reconciliations_id_seq OWNED BY public.reconciliations.id;


--
-- Name: recurring_history; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.recurring_history (
    id integer NOT NULL,
    template_id integer NOT NULL,
    invoice_id integer,
    scheduled_at timestamp without time zone NOT NULL,
    generated_at timestamp without time zone,
    sent_at timestamp without time zone,
    paid_at timestamp without time zone,
    status text NOT NULL,
    error_message text,
    retry_count integer DEFAULT 0,
    metadata json,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.recurring_history OWNER TO neondb_owner;

--
-- Name: recurring_history_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.recurring_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.recurring_history_id_seq OWNER TO neondb_owner;

--
-- Name: recurring_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.recurring_history_id_seq OWNED BY public.recurring_history.id;


--
-- Name: recurring_lines; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.recurring_lines (
    id integer NOT NULL,
    template_id integer NOT NULL,
    description text NOT NULL,
    quantity double precision DEFAULT 1 NOT NULL,
    unit_price double precision NOT NULL,
    amount double precision NOT NULL,
    account_id integer,
    sales_tax_id integer,
    product_id integer,
    order_index integer DEFAULT 0
);


ALTER TABLE public.recurring_lines OWNER TO neondb_owner;

--
-- Name: recurring_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.recurring_lines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.recurring_lines_id_seq OWNER TO neondb_owner;

--
-- Name: recurring_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.recurring_lines_id_seq OWNED BY public.recurring_lines.id;


--
-- Name: recurring_templates; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.recurring_templates (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    template_name text NOT NULL,
    currency character varying(3) DEFAULT 'USD'::character varying,
    frequency public.recurring_frequency NOT NULL,
    frequency_value integer DEFAULT 1,
    frequency_unit text,
    start_date date NOT NULL,
    end_date date,
    max_occurrences integer,
    current_occurrences integer DEFAULT 0,
    day_of_month integer,
    timezone text DEFAULT 'UTC'::text,
    next_run_at timestamp without time zone NOT NULL,
    last_run_at timestamp without time zone,
    status public.recurring_status DEFAULT 'active'::public.recurring_status NOT NULL,
    auto_email boolean DEFAULT false,
    auto_charge boolean DEFAULT false,
    preview_before_send boolean DEFAULT false,
    payment_terms text,
    memo text,
    attachments text[],
    sub_total double precision DEFAULT 0 NOT NULL,
    tax_amount double precision DEFAULT 0 NOT NULL,
    total_amount double precision DEFAULT 0 NOT NULL,
    exchange_rate numeric(18,6),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.recurring_templates OWNER TO neondb_owner;

--
-- Name: recurring_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.recurring_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.recurring_templates_id_seq OWNER TO neondb_owner;

--
-- Name: recurring_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.recurring_templates_id_seq OWNED BY public.recurring_templates.id;


--
-- Name: sales_taxes; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sales_taxes (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    rate double precision DEFAULT 0 NOT NULL,
    account_id integer,
    is_active boolean DEFAULT true,
    is_composite boolean DEFAULT false,
    parent_id integer,
    display_order integer DEFAULT 0
);


ALTER TABLE public.sales_taxes OWNER TO neondb_owner;

--
-- Name: sales_taxes_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.sales_taxes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sales_taxes_id_seq OWNER TO neondb_owner;

--
-- Name: sales_taxes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.sales_taxes_id_seq OWNED BY public.sales_taxes.id;


--
-- Name: session; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.session OWNER TO neondb_owner;

--
-- Name: transaction_attachments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.transaction_attachments (
    id integer NOT NULL,
    imported_transaction_id integer NOT NULL,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_size integer NOT NULL,
    mime_type text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.transaction_attachments OWNER TO neondb_owner;

--
-- Name: transaction_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.transaction_attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transaction_attachments_id_seq OWNER TO neondb_owner;

--
-- Name: transaction_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.transaction_attachments_id_seq OWNED BY public.transaction_attachments.id;


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.transactions (
    id integer NOT NULL,
    reference text,
    type public.transaction_type NOT NULL,
    date timestamp without time zone DEFAULT now() NOT NULL,
    description text,
    amount double precision NOT NULL,
    contact_id integer,
    status public.status DEFAULT 'pending'::public.status NOT NULL,
    balance double precision,
    sub_total double precision,
    tax_amount double precision,
    payment_method public.payment_method,
    payment_account_id integer,
    payment_date timestamp without time zone,
    memo text,
    attachments text[],
    due_date timestamp without time zone,
    payment_terms text,
    currency character varying(3),
    exchange_rate numeric(18,6),
    foreign_amount numeric(15,2),
    secure_token character varying(64)
);


ALTER TABLE public.transactions OWNER TO neondb_owner;

--
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transactions_id_seq OWNER TO neondb_owner;

--
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;


--
-- Name: user_companies; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_companies (
    id integer NOT NULL,
    user_id integer NOT NULL,
    company_id integer NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    is_primary boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.user_companies OWNER TO neondb_owner;

--
-- Name: user_companies_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.user_companies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_companies_id_seq OWNER TO neondb_owner;

--
-- Name: user_companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.user_companies_id_seq OWNED BY public.user_companies.id;


--
-- Name: user_invitations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.user_invitations (
    id integer NOT NULL,
    email text NOT NULL,
    token text NOT NULL,
    role text NOT NULL,
    company_id integer,
    firm_id integer,
    invited_by integer NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    accepted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_invitations OWNER TO neondb_owner;

--
-- Name: user_invitations_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.user_invitations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_invitations_id_seq OWNER TO neondb_owner;

--
-- Name: user_invitations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.user_invitations_id_seq OWNED BY public.user_invitations.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    first_name text,
    last_name text,
    role text DEFAULT 'viewer'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    company_id integer,
    firm_id integer,
    current_company_id integer
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO neondb_owner;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: neondb_owner
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Name: accounting_firms id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.accounting_firms ALTER COLUMN id SET DEFAULT nextval('public.accounting_firms_id_seq'::regclass);


--
-- Name: accounts id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.accounts ALTER COLUMN id SET DEFAULT nextval('public.accounts_id_seq'::regclass);


--
-- Name: activity_logs id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.activity_logs ALTER COLUMN id SET DEFAULT nextval('public.activity_logs_id_seq'::regclass);


--
-- Name: bank_accounts id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bank_accounts ALTER COLUMN id SET DEFAULT nextval('public.bank_accounts_id_seq'::regclass);


--
-- Name: bank_connections id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bank_connections ALTER COLUMN id SET DEFAULT nextval('public.bank_connections_id_seq'::regclass);


--
-- Name: bank_transaction_matches id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bank_transaction_matches ALTER COLUMN id SET DEFAULT nextval('public.bank_transaction_matches_id_seq'::regclass);


--
-- Name: categorization_rules id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.categorization_rules ALTER COLUMN id SET DEFAULT nextval('public.categorization_rules_id_seq'::regclass);


--
-- Name: companies id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.companies ALTER COLUMN id SET DEFAULT nextval('public.companies_id_seq'::regclass);


--
-- Name: company_settings id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.company_settings ALTER COLUMN id SET DEFAULT nextval('public.company_settings_id_seq'::regclass);


--
-- Name: contacts id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contacts ALTER COLUMN id SET DEFAULT nextval('public.contacts_id_seq'::regclass);


--
-- Name: csv_mapping_preferences id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.csv_mapping_preferences ALTER COLUMN id SET DEFAULT nextval('public.csv_mapping_preferences_id_seq'::regclass);


--
-- Name: currencies id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.currencies ALTER COLUMN id SET DEFAULT nextval('public.currencies_id_seq'::regclass);


--
-- Name: currency_locks id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.currency_locks ALTER COLUMN id SET DEFAULT nextval('public.currency_locks_id_seq'::regclass);


--
-- Name: exchange_rates id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.exchange_rates ALTER COLUMN id SET DEFAULT nextval('public.exchange_rates_id_seq'::regclass);


--
-- Name: firm_client_access id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.firm_client_access ALTER COLUMN id SET DEFAULT nextval('public.firm_client_access_id_seq'::regclass);


--
-- Name: fx_realizations id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.fx_realizations ALTER COLUMN id SET DEFAULT nextval('public.fx_realizations_id_seq'::regclass);


--
-- Name: fx_revaluations id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.fx_revaluations ALTER COLUMN id SET DEFAULT nextval('public.fx_revaluations_id_seq'::regclass);


--
-- Name: imported_transactions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.imported_transactions ALTER COLUMN id SET DEFAULT nextval('public.imported_transactions_id_seq'::regclass);


--
-- Name: invoice_activities id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoice_activities ALTER COLUMN id SET DEFAULT nextval('public.invoice_activities_id_seq'::regclass);


--
-- Name: ledger_entries id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ledger_entries ALTER COLUMN id SET DEFAULT nextval('public.ledger_entries_id_seq'::regclass);


--
-- Name: line_items id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.line_items ALTER COLUMN id SET DEFAULT nextval('public.line_items_id_seq'::regclass);


--
-- Name: payment_applications id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payment_applications ALTER COLUMN id SET DEFAULT nextval('public.payment_applications_id_seq'::regclass);


--
-- Name: preferences id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.preferences ALTER COLUMN id SET DEFAULT nextval('public.preferences_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: reconciliation_items id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reconciliation_items ALTER COLUMN id SET DEFAULT nextval('public.reconciliation_items_id_seq'::regclass);


--
-- Name: reconciliations id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reconciliations ALTER COLUMN id SET DEFAULT nextval('public.reconciliations_id_seq'::regclass);


--
-- Name: recurring_history id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.recurring_history ALTER COLUMN id SET DEFAULT nextval('public.recurring_history_id_seq'::regclass);


--
-- Name: recurring_lines id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.recurring_lines ALTER COLUMN id SET DEFAULT nextval('public.recurring_lines_id_seq'::regclass);


--
-- Name: recurring_templates id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.recurring_templates ALTER COLUMN id SET DEFAULT nextval('public.recurring_templates_id_seq'::regclass);


--
-- Name: sales_taxes id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_taxes ALTER COLUMN id SET DEFAULT nextval('public.sales_taxes_id_seq'::regclass);


--
-- Name: transaction_attachments id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.transaction_attachments ALTER COLUMN id SET DEFAULT nextval('public.transaction_attachments_id_seq'::regclass);


--
-- Name: transactions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);


--
-- Name: user_companies id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_companies ALTER COLUMN id SET DEFAULT nextval('public.user_companies_id_seq'::regclass);


--
-- Name: user_invitations id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_invitations ALTER COLUMN id SET DEFAULT nextval('public.user_invitations_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: neondb_owner
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: accounting_firms accounting_firms_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.accounting_firms
    ADD CONSTRAINT accounting_firms_pkey PRIMARY KEY (id);


--
-- Name: accounts accounts_code_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_code_key UNIQUE (code);


--
-- Name: accounts accounts_code_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_code_unique UNIQUE (code);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: bank_accounts bank_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_pkey PRIMARY KEY (id);


--
-- Name: bank_accounts bank_accounts_plaid_account_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_plaid_account_id_key UNIQUE (plaid_account_id);


--
-- Name: bank_connections bank_connections_item_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bank_connections
    ADD CONSTRAINT bank_connections_item_id_key UNIQUE (item_id);


--
-- Name: bank_connections bank_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bank_connections
    ADD CONSTRAINT bank_connections_pkey PRIMARY KEY (id);


--
-- Name: bank_transaction_matches bank_transaction_matches_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bank_transaction_matches
    ADD CONSTRAINT bank_transaction_matches_pkey PRIMARY KEY (id);


--
-- Name: categorization_rules categorization_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.categorization_rules
    ADD CONSTRAINT categorization_rules_pkey PRIMARY KEY (id);


--
-- Name: companies companies_company_code_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_company_code_key UNIQUE (company_code);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: company_settings company_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.company_settings
    ADD CONSTRAINT company_settings_pkey PRIMARY KEY (id);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- Name: csv_mapping_preferences csv_mapping_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.csv_mapping_preferences
    ADD CONSTRAINT csv_mapping_preferences_pkey PRIMARY KEY (id);


--
-- Name: currencies currencies_code_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.currencies
    ADD CONSTRAINT currencies_code_key UNIQUE (code);


--
-- Name: currencies currencies_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.currencies
    ADD CONSTRAINT currencies_pkey PRIMARY KEY (id);


--
-- Name: currency_locks currency_locks_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.currency_locks
    ADD CONSTRAINT currency_locks_pkey PRIMARY KEY (id);


--
-- Name: exchange_rates exchange_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_pkey PRIMARY KEY (id);


--
-- Name: firm_client_access firm_client_access_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.firm_client_access
    ADD CONSTRAINT firm_client_access_pkey PRIMARY KEY (id);


--
-- Name: fx_realizations fx_realizations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.fx_realizations
    ADD CONSTRAINT fx_realizations_pkey PRIMARY KEY (id);


--
-- Name: fx_revaluations fx_revaluations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.fx_revaluations
    ADD CONSTRAINT fx_revaluations_pkey PRIMARY KEY (id);


--
-- Name: imported_transactions imported_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.imported_transactions
    ADD CONSTRAINT imported_transactions_pkey PRIMARY KEY (id);


--
-- Name: imported_transactions imported_transactions_plaid_transaction_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.imported_transactions
    ADD CONSTRAINT imported_transactions_plaid_transaction_id_key UNIQUE (plaid_transaction_id);


--
-- Name: invoice_activities invoice_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoice_activities
    ADD CONSTRAINT invoice_activities_pkey PRIMARY KEY (id);


--
-- Name: ledger_entries ledger_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_pkey PRIMARY KEY (id);


--
-- Name: line_items line_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.line_items
    ADD CONSTRAINT line_items_pkey PRIMARY KEY (id);


--
-- Name: payment_applications payment_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payment_applications
    ADD CONSTRAINT payment_applications_pkey PRIMARY KEY (id);


--
-- Name: preferences preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.preferences
    ADD CONSTRAINT preferences_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: reconciliation_items reconciliation_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reconciliation_items
    ADD CONSTRAINT reconciliation_items_pkey PRIMARY KEY (id);


--
-- Name: reconciliations reconciliations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reconciliations
    ADD CONSTRAINT reconciliations_pkey PRIMARY KEY (id);


--
-- Name: recurring_history recurring_history_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.recurring_history
    ADD CONSTRAINT recurring_history_pkey PRIMARY KEY (id);


--
-- Name: recurring_lines recurring_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.recurring_lines
    ADD CONSTRAINT recurring_lines_pkey PRIMARY KEY (id);


--
-- Name: recurring_templates recurring_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.recurring_templates
    ADD CONSTRAINT recurring_templates_pkey PRIMARY KEY (id);


--
-- Name: sales_taxes sales_taxes_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_taxes
    ADD CONSTRAINT sales_taxes_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- Name: transaction_attachments transaction_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.transaction_attachments
    ADD CONSTRAINT transaction_attachments_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_secure_token_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_secure_token_key UNIQUE (secure_token);


--
-- Name: user_companies user_companies_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_companies
    ADD CONSTRAINT user_companies_pkey PRIMARY KEY (id);


--
-- Name: user_companies user_companies_user_id_company_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_companies
    ADD CONSTRAINT user_companies_user_id_company_id_key UNIQUE (user_id, company_id);


--
-- Name: user_invitations user_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_invitations
    ADD CONSTRAINT user_invitations_pkey PRIMARY KEY (id);


--
-- Name: user_invitations user_invitations_token_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_invitations
    ADD CONSTRAINT user_invitations_token_key UNIQUE (token);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "IDX_session_expire" ON public.session USING btree (expire);


--
-- Name: unique_rate_per_day; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX unique_rate_per_day ON public.exchange_rates USING btree (from_currency, to_currency, effective_date);


--
-- Name: activity_logs activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: bank_accounts bank_accounts_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.bank_connections(id);


--
-- Name: bank_accounts bank_accounts_linked_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_linked_account_id_fkey FOREIGN KEY (linked_account_id) REFERENCES public.accounts(id);


--
-- Name: bank_transaction_matches bank_transaction_matches_imported_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bank_transaction_matches
    ADD CONSTRAINT bank_transaction_matches_imported_transaction_id_fkey FOREIGN KEY (imported_transaction_id) REFERENCES public.imported_transactions(id);


--
-- Name: bank_transaction_matches bank_transaction_matches_matched_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bank_transaction_matches
    ADD CONSTRAINT bank_transaction_matches_matched_transaction_id_fkey FOREIGN KEY (matched_transaction_id) REFERENCES public.transactions(id);


--
-- Name: categorization_rules categorization_rules_sales_tax_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.categorization_rules
    ADD CONSTRAINT categorization_rules_sales_tax_id_fkey FOREIGN KEY (sales_tax_id) REFERENCES public.sales_taxes(id);


--
-- Name: csv_mapping_preferences csv_mapping_preferences_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.csv_mapping_preferences
    ADD CONSTRAINT csv_mapping_preferences_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: csv_mapping_preferences csv_mapping_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.csv_mapping_preferences
    ADD CONSTRAINT csv_mapping_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: currency_locks currency_locks_first_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.currency_locks
    ADD CONSTRAINT currency_locks_first_transaction_id_fkey FOREIGN KEY (first_transaction_id) REFERENCES public.transactions(id);


--
-- Name: firm_client_access firm_client_access_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.firm_client_access
    ADD CONSTRAINT firm_client_access_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: firm_client_access firm_client_access_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.firm_client_access
    ADD CONSTRAINT firm_client_access_firm_id_fkey FOREIGN KEY (firm_id) REFERENCES public.accounting_firms(id);


--
-- Name: firm_client_access firm_client_access_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.firm_client_access
    ADD CONSTRAINT firm_client_access_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.users(id);


--
-- Name: fx_realizations fx_realizations_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.fx_realizations
    ADD CONSTRAINT fx_realizations_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.transactions(id);


--
-- Name: fx_realizations fx_realizations_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.fx_realizations
    ADD CONSTRAINT fx_realizations_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id);


--
-- Name: fx_revaluations fx_revaluations_journal_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.fx_revaluations
    ADD CONSTRAINT fx_revaluations_journal_entry_id_fkey FOREIGN KEY (journal_entry_id) REFERENCES public.transactions(id);


--
-- Name: imported_transactions imported_transactions_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.imported_transactions
    ADD CONSTRAINT imported_transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: imported_transactions imported_transactions_bank_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.imported_transactions
    ADD CONSTRAINT imported_transactions_bank_account_id_fkey FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id);


--
-- Name: imported_transactions imported_transactions_matched_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.imported_transactions
    ADD CONSTRAINT imported_transactions_matched_transaction_id_fkey FOREIGN KEY (matched_transaction_id) REFERENCES public.transactions(id);


--
-- Name: imported_transactions imported_transactions_suggested_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.imported_transactions
    ADD CONSTRAINT imported_transactions_suggested_account_id_fkey FOREIGN KEY (suggested_account_id) REFERENCES public.accounts(id);


--
-- Name: imported_transactions imported_transactions_suggested_sales_tax_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.imported_transactions
    ADD CONSTRAINT imported_transactions_suggested_sales_tax_id_fkey FOREIGN KEY (suggested_sales_tax_id) REFERENCES public.sales_taxes(id);


--
-- Name: invoice_activities invoice_activities_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoice_activities
    ADD CONSTRAINT invoice_activities_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.transactions(id);


--
-- Name: invoice_activities invoice_activities_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.invoice_activities
    ADD CONSTRAINT invoice_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: ledger_entries ledger_entries_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: ledger_entries ledger_entries_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.ledger_entries
    ADD CONSTRAINT ledger_entries_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id);


--
-- Name: line_items line_items_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.line_items
    ADD CONSTRAINT line_items_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: line_items line_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.line_items
    ADD CONSTRAINT line_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: line_items line_items_sales_tax_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.line_items
    ADD CONSTRAINT line_items_sales_tax_id_fkey FOREIGN KEY (sales_tax_id) REFERENCES public.sales_taxes(id);


--
-- Name: line_items line_items_transaction_id_transactions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.line_items
    ADD CONSTRAINT line_items_transaction_id_transactions_id_fk FOREIGN KEY (transaction_id) REFERENCES public.transactions(id);


--
-- Name: payment_applications payment_applications_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payment_applications
    ADD CONSTRAINT payment_applications_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.transactions(id);


--
-- Name: payment_applications payment_applications_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.payment_applications
    ADD CONSTRAINT payment_applications_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.transactions(id);


--
-- Name: products products_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: products products_sales_tax_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_sales_tax_id_fkey FOREIGN KEY (sales_tax_id) REFERENCES public.sales_taxes(id);


--
-- Name: reconciliation_items reconciliation_items_ledger_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reconciliation_items
    ADD CONSTRAINT reconciliation_items_ledger_entry_id_fkey FOREIGN KEY (ledger_entry_id) REFERENCES public.ledger_entries(id);


--
-- Name: reconciliation_items reconciliation_items_reconciliation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reconciliation_items
    ADD CONSTRAINT reconciliation_items_reconciliation_id_fkey FOREIGN KEY (reconciliation_id) REFERENCES public.reconciliations(id);


--
-- Name: reconciliations reconciliations_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reconciliations
    ADD CONSTRAINT reconciliations_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: recurring_history recurring_history_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.recurring_history
    ADD CONSTRAINT recurring_history_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.transactions(id);


--
-- Name: recurring_history recurring_history_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.recurring_history
    ADD CONSTRAINT recurring_history_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.recurring_templates(id);


--
-- Name: recurring_lines recurring_lines_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.recurring_lines
    ADD CONSTRAINT recurring_lines_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: recurring_lines recurring_lines_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.recurring_lines
    ADD CONSTRAINT recurring_lines_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: recurring_lines recurring_lines_sales_tax_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.recurring_lines
    ADD CONSTRAINT recurring_lines_sales_tax_id_fkey FOREIGN KEY (sales_tax_id) REFERENCES public.sales_taxes(id);


--
-- Name: recurring_lines recurring_lines_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.recurring_lines
    ADD CONSTRAINT recurring_lines_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.recurring_templates(id) ON DELETE CASCADE;


--
-- Name: recurring_templates recurring_templates_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.recurring_templates
    ADD CONSTRAINT recurring_templates_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.contacts(id);


--
-- Name: sales_taxes sales_taxes_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_taxes
    ADD CONSTRAINT sales_taxes_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id);


--
-- Name: sales_taxes sales_taxes_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_taxes
    ADD CONSTRAINT sales_taxes_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.sales_taxes(id);


--
-- Name: transaction_attachments transaction_attachments_imported_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.transaction_attachments
    ADD CONSTRAINT transaction_attachments_imported_transaction_id_fkey FOREIGN KEY (imported_transaction_id) REFERENCES public.imported_transactions(id);


--
-- Name: transactions transactions_contact_id_contacts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_contact_id_contacts_id_fk FOREIGN KEY (contact_id) REFERENCES public.contacts(id);


--
-- Name: transactions transactions_payment_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_payment_account_id_fkey FOREIGN KEY (payment_account_id) REFERENCES public.accounts(id);


--
-- Name: user_companies user_companies_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_companies
    ADD CONSTRAINT user_companies_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: user_companies user_companies_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_companies
    ADD CONSTRAINT user_companies_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_invitations user_invitations_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_invitations
    ADD CONSTRAINT user_invitations_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: user_invitations user_invitations_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_invitations
    ADD CONSTRAINT user_invitations_firm_id_fkey FOREIGN KEY (firm_id) REFERENCES public.accounting_firms(id);


--
-- Name: user_invitations user_invitations_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.user_invitations
    ADD CONSTRAINT user_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id);


--
-- Name: users users_current_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_current_company_id_fkey FOREIGN KEY (current_company_id) REFERENCES public.companies(id);


--
-- Name: users users_firm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_firm_id_fkey FOREIGN KEY (firm_id) REFERENCES public.accounting_firms(id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--


