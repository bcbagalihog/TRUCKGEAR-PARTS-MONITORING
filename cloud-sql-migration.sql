-- ============================================================
-- Truckgear Cloud SQL Migration — Run in Cloud SQL Studio
-- Adds all missing tables and columns to the production DB
-- All statements use IF NOT EXISTS / DO NOTHING so it's safe
-- to run multiple times without breaking existing data.
-- ============================================================

-- ── COMPANIES (new table) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id       SERIAL PRIMARY KEY,
  name     TEXT NOT NULL,
  address  TEXT,
  phone    TEXT,
  tin      TEXT,
  logo_url TEXT
);

-- Seed the two default companies (skip if already present)
INSERT INTO companies (id, name, address, phone, tin, logo_url)
VALUES
  (1, 'Truckgear', '1032 A. Bonifacio St. Brgy Balingasa Q.C', '(02)85513863', '', ''),
  (2, 'Sister Company', '', '', '', '')
ON CONFLICT (id) DO NOTHING;

-- ── PRODUCTS — add company_id if missing ───────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS company_id INTEGER NOT NULL DEFAULT 1;

-- ── CUSTOMERS — add missing columns ────────────────────────
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS tin TEXT,
  ADD COLUMN IF NOT EXISTS branch_area TEXT,
  ADD COLUMN IF NOT EXISTS internal_remarks TEXT;

-- ── VENDORS — add tin if missing ───────────────────────────
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS tin TEXT;

-- ── DRAWER SESSIONS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drawer_sessions (
  id              SERIAL PRIMARY KEY,
  user_id         TEXT,
  start_time      TIMESTAMP DEFAULT NOW(),
  end_time        TIMESTAMP,
  opening_balance TEXT NOT NULL DEFAULT '0',
  closing_balance TEXT,
  status          TEXT NOT NULL DEFAULT 'open',
  company_id      INTEGER NOT NULL DEFAULT 1
);

-- ── SALES INVOICES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_invoices (
  id                 SERIAL PRIMARY KEY,
  invoice_number     TEXT NOT NULL,
  date               TEXT NOT NULL,
  registered_name    TEXT NOT NULL,
  tin                TEXT,
  total_amount_due   TEXT NOT NULL DEFAULT '0',
  status             TEXT NOT NULL DEFAULT 'DRAFT',
  created_at         TIMESTAMP DEFAULT NOW(),
  company_id         INTEGER NOT NULL DEFAULT 1,
  payment_method     TEXT NOT NULL DEFAULT 'CASH',
  drawer_session_id  INTEGER,
  business_address   TEXT,
  vatable_sales      TEXT DEFAULT '0',
  vat_amount         TEXT DEFAULT '0',
  withholding_tax    TEXT DEFAULT '0',
  gcash_ref          TEXT,
  check_bank_name    TEXT,
  check_number       TEXT,
  check_maturity_date TEXT,
  net_days           INTEGER,
  po_number          TEXT,
  customer_id        INTEGER,
  branch_area        TEXT,
  internal_remarks   TEXT
);

-- sales_invoices — add any columns that might be missing on existing table
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS payment_method     TEXT NOT NULL DEFAULT 'CASH';
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS drawer_session_id  INTEGER;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS business_address   TEXT;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS vatable_sales      TEXT DEFAULT '0';
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS vat_amount         TEXT DEFAULT '0';
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS withholding_tax    TEXT DEFAULT '0';
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS gcash_ref          TEXT;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS check_bank_name    TEXT;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS check_number       TEXT;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS check_maturity_date TEXT;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS net_days           INTEGER;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS po_number          TEXT;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS customer_id        INTEGER;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS branch_area        TEXT;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS internal_remarks   TEXT;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS company_id         INTEGER NOT NULL DEFAULT 1;

-- ── SALES INVOICE ITEMS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_invoice_items (
  id                SERIAL PRIMARY KEY,
  sales_invoice_id  INTEGER NOT NULL,
  product_id        INTEGER,
  description       TEXT NOT NULL,
  quantity          TEXT NOT NULL DEFAULT '1',
  unit_price        TEXT NOT NULL DEFAULT '0',
  total_price       TEXT NOT NULL DEFAULT '0',
  is_custom_item    BOOLEAN NOT NULL DEFAULT FALSE
);

-- ── ACCOUNTS PAYABLE ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts_payable (
  id               SERIAL PRIMARY KEY,
  invoice_number   TEXT NOT NULL,
  vendor_name      TEXT NOT NULL,
  amount_due       TEXT NOT NULL DEFAULT '0',
  due_date         TEXT,
  status           TEXT NOT NULL DEFAULT 'unpaid',
  vendor_dr_number TEXT,
  company_id       INTEGER NOT NULL DEFAULT 1,
  created_at       TIMESTAMP DEFAULT NOW(),
  invoice_date     TEXT,
  counter_receipt_id INTEGER
);

ALTER TABLE accounts_payable ADD COLUMN IF NOT EXISTS invoice_date       TEXT;
ALTER TABLE accounts_payable ADD COLUMN IF NOT EXISTS counter_receipt_id INTEGER;
ALTER TABLE accounts_payable ADD COLUMN IF NOT EXISTS company_id         INTEGER NOT NULL DEFAULT 1;

-- ── COUNTER RECEIPTS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS counter_receipts (
  id               SERIAL PRIMARY KEY,
  vendor_name      TEXT NOT NULL,
  receipt_date     TEXT,
  ref_no           TEXT,
  total_amount     TEXT NOT NULL DEFAULT '0',
  number_of_checks INTEGER NOT NULL DEFAULT 1,
  start_date       TEXT,
  company_id       INTEGER NOT NULL DEFAULT 1,
  created_at       TIMESTAMP DEFAULT NOW(),
  vendor_tin       TEXT,
  vendor_address   TEXT,
  amount_paid      TEXT DEFAULT '0',
  status           TEXT NOT NULL DEFAULT 'active'
);

ALTER TABLE counter_receipts ADD COLUMN IF NOT EXISTS vendor_tin     TEXT;
ALTER TABLE counter_receipts ADD COLUMN IF NOT EXISTS vendor_address TEXT;
ALTER TABLE counter_receipts ADD COLUMN IF NOT EXISTS amount_paid    TEXT DEFAULT '0';
ALTER TABLE counter_receipts ADD COLUMN IF NOT EXISTS status         TEXT NOT NULL DEFAULT 'active';

-- ── COUNTER RECEIPT CHECKS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS counter_receipt_checks (
  id                 SERIAL PRIMARY KEY,
  counter_receipt_id INTEGER NOT NULL,
  check_no           TEXT,
  bank               TEXT,
  check_date         TEXT,
  amount             TEXT NOT NULL DEFAULT '0'
);

-- ── COUNTER RECEIPT PAYMENTS ───────────────────────────────
CREATE TABLE IF NOT EXISTS counter_receipt_payments (
  id                 SERIAL PRIMARY KEY,
  counter_receipt_id INTEGER NOT NULL,
  payment_date       TEXT NOT NULL,
  ref_no             TEXT,
  amount             TEXT NOT NULL DEFAULT '0'
);

-- ── BILLING COLLECTIONS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing_collections (
  id                SERIAL PRIMARY KEY,
  customer_name     TEXT NOT NULL,
  customer_tin      TEXT,
  customer_address  TEXT,
  collection_date   TEXT NOT NULL,
  total_amount      TEXT NOT NULL DEFAULT '0',
  amount_paid       TEXT NOT NULL DEFAULT '0',
  status            TEXT NOT NULL DEFAULT 'ACTIVE',
  company_id        INTEGER NOT NULL DEFAULT 1,
  created_at        TIMESTAMP DEFAULT NOW()
);

-- ── BILLING COLLECTION ITEMS ───────────────────────────────
CREATE TABLE IF NOT EXISTS billing_collection_items (
  id                    SERIAL PRIMARY KEY,
  billing_collection_id INTEGER NOT NULL,
  sales_invoice_id      INTEGER NOT NULL,
  invoice_number        TEXT NOT NULL,
  date                  TEXT,
  dr_number             TEXT,
  po_number             TEXT,
  amount                TEXT NOT NULL DEFAULT '0'
);

-- ── BILLING COLLECTION PAYMENTS ────────────────────────────
CREATE TABLE IF NOT EXISTS billing_collection_payments (
  id                    SERIAL PRIMARY KEY,
  billing_collection_id INTEGER NOT NULL,
  payment_date          TEXT NOT NULL,
  ref_no                TEXT,
  amount                TEXT NOT NULL DEFAULT '0'
);

-- ── USERS — add role/company/isActive if missing ───────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS role       VARCHAR NOT NULL DEFAULT 'staff';
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active  BOOLEAN NOT NULL DEFAULT TRUE;

-- ── DONE ───────────────────────────────────────────────────
-- All schema changes applied safely. No existing data was modified.
