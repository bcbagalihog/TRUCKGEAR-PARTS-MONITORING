-- ============================================================
-- Truckgear Cloud SQL — Full Schema Migration
-- Safe to run multiple times (IF NOT EXISTS / DO NOTHING).
-- Paste the ENTIRE file into Cloud SQL Studio and click Run.
-- ============================================================

-- ── USERS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          VARCHAR PRIMARY KEY,
  username    VARCHAR UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  name        TEXT,
  role        VARCHAR NOT NULL DEFAULT 'staff',
  company_id  INTEGER NOT NULL DEFAULT 1,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS role       VARCHAR NOT NULL DEFAULT 'staff';
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active  BOOLEAN NOT NULL DEFAULT TRUE;

-- ── SESSIONS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  sid     VARCHAR PRIMARY KEY,
  sess    JSONB NOT NULL,
  expire  TIMESTAMP NOT NULL
);

-- ── COMPANIES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id       SERIAL PRIMARY KEY,
  name     TEXT NOT NULL,
  address  TEXT,
  phone    TEXT,
  tin      TEXT,
  logo_url TEXT
);

INSERT INTO companies (id, name, address, phone, tin, logo_url)
VALUES
  (1, 'Truckgear', '1032 A. Bonifacio St. Brgy Balingasa Q.C', '(02)85513863', '', ''),
  (2, 'Sister Company', '', '', '', '')
ON CONFLICT (id) DO NOTHING;

SELECT setval('companies_id_seq', COALESCE((SELECT MAX(id) FROM companies), 1));

-- ── PRODUCTS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id             SERIAL PRIMARY KEY,
  sku            TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  description    TEXT,
  category       TEXT NOT NULL,
  brand          TEXT,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  reorder_point  INTEGER NOT NULL DEFAULT 5,
  cost_price     NUMERIC(10,2) NOT NULL DEFAULT 0,
  selling_price  NUMERIC(10,2) NOT NULL DEFAULT 0,
  location       TEXT,
  company_id     INTEGER NOT NULL DEFAULT 1
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS company_id INTEGER NOT NULL DEFAULT 1;

-- ── PRODUCT OEM NUMBERS (CRITICAL — required by inventory queries) ──
CREATE TABLE IF NOT EXISTS product_oem_numbers (
  id          SERIAL PRIMARY KEY,
  product_id  INTEGER NOT NULL REFERENCES products(id),
  oem_number  TEXT NOT NULL
);

-- ── PRODUCT COMPATIBILITY (CRITICAL — required by inventory queries) ──
CREATE TABLE IF NOT EXISTS product_compatibility (
  id          SERIAL PRIMARY KEY,
  product_id  INTEGER NOT NULL REFERENCES products(id),
  make        TEXT NOT NULL,
  model       TEXT NOT NULL,
  year_start  INTEGER,
  year_end    INTEGER
);

-- ── CUSTOMERS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id               SERIAL PRIMARY KEY,
  name             TEXT NOT NULL,
  email            TEXT,
  phone            TEXT,
  address          TEXT,
  tin              TEXT,
  branch_area      TEXT,
  internal_remarks TEXT
);

ALTER TABLE customers ADD COLUMN IF NOT EXISTS tin              TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS branch_area      TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS internal_remarks TEXT;

-- ── VENDORS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendors (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  email          TEXT,
  phone          TEXT,
  address        TEXT,
  lead_time_days INTEGER DEFAULT 0,
  tin            TEXT
);

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS tin TEXT;

-- ── SALES ORDERS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_orders (
  id             SERIAL PRIMARY KEY,
  customer_id    INTEGER NOT NULL REFERENCES customers(id),
  status         TEXT NOT NULL DEFAULT 'draft',
  order_date     TIMESTAMP DEFAULT NOW(),
  total_amount   NUMERIC(10,2) DEFAULT 0,
  payment_status TEXT DEFAULT 'unpaid',
  company_id     INTEGER NOT NULL DEFAULT 1
);

ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS company_id     INTEGER NOT NULL DEFAULT 1;
ALTER TABLE sales_orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';

-- ── SALES ORDER ITEMS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_order_items (
  id             SERIAL PRIMARY KEY,
  sales_order_id INTEGER NOT NULL REFERENCES sales_orders(id),
  product_id     INTEGER REFERENCES products(id),
  description    TEXT,
  quantity       INTEGER NOT NULL,
  unit_price     NUMERIC(10,2) NOT NULL
);

-- ── PURCHASE ORDERS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_orders (
  id           SERIAL PRIMARY KEY,
  vendor_id    INTEGER NOT NULL REFERENCES vendors(id),
  status       TEXT NOT NULL DEFAULT 'draft',
  order_date   TIMESTAMP DEFAULT NOW(),
  total_amount NUMERIC(10,2) DEFAULT 0,
  remarks      TEXT,
  sold_to      TEXT
);

ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS remarks  TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS sold_to  TEXT;

-- ── PURCHASE ORDER ITEMS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                  SERIAL PRIMARY KEY,
  purchase_order_id   INTEGER NOT NULL REFERENCES purchase_orders(id),
  product_id          INTEGER REFERENCES products(id),
  description         TEXT,
  quantity            INTEGER NOT NULL,
  unit_cost           NUMERIC(10,2) NOT NULL
);

-- ── INVENTORY TRANSACTIONS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id             SERIAL PRIMARY KEY,
  product_id     INTEGER NOT NULL REFERENCES products(id),
  type           TEXT NOT NULL,
  quantity       INTEGER NOT NULL,
  reference_type TEXT,
  reference_id   INTEGER,
  date           TIMESTAMP DEFAULT NOW()
);

-- ── DRAWER SESSIONS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS drawer_sessions (
  id               SERIAL PRIMARY KEY,
  user_id          VARCHAR NOT NULL REFERENCES users(id),
  start_time       TIMESTAMP DEFAULT NOW() NOT NULL,
  end_time         TIMESTAMP,
  opening_balance  NUMERIC(12,2) NOT NULL DEFAULT 0,
  closing_balance  NUMERIC(12,2),
  status           VARCHAR(20) DEFAULT 'OPEN',
  company_id       INTEGER NOT NULL DEFAULT 1
);

ALTER TABLE drawer_sessions ADD COLUMN IF NOT EXISTS company_id INTEGER NOT NULL DEFAULT 1;

-- ── SALES INVOICES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_invoices (
  id                  SERIAL PRIMARY KEY,
  invoice_number      TEXT NOT NULL,
  date                TIMESTAMP DEFAULT NOW() NOT NULL,
  registered_name     TEXT NOT NULL,
  tin                 TEXT,
  business_address    TEXT,
  total_amount_due    NUMERIC NOT NULL DEFAULT 0,
  vatable_sales       NUMERIC,
  vat_amount          NUMERIC,
  withholding_tax     NUMERIC,
  status              TEXT DEFAULT 'PAID',
  payment_method      TEXT DEFAULT 'CASH',
  gcash_ref           TEXT,
  check_bank_name     TEXT,
  check_number        TEXT,
  check_maturity_date DATE,
  net_days            INTEGER,
  po_number           TEXT,
  drawer_session_id   INTEGER REFERENCES drawer_sessions(id),
  company_id          INTEGER NOT NULL DEFAULT 1,
  created_at          TIMESTAMP DEFAULT NOW(),
  customer_id         INTEGER REFERENCES customers(id),
  branch_area         TEXT,
  internal_remarks    TEXT
);

ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS business_address    TEXT;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS vatable_sales       NUMERIC;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS vat_amount          NUMERIC;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS withholding_tax     NUMERIC;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS payment_method      TEXT DEFAULT 'CASH';
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS gcash_ref           TEXT;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS check_bank_name     TEXT;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS check_number        TEXT;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS check_maturity_date DATE;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS net_days            INTEGER;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS po_number           TEXT;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS drawer_session_id   INTEGER;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS company_id          INTEGER NOT NULL DEFAULT 1;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS created_at          TIMESTAMP DEFAULT NOW();
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS customer_id         INTEGER;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS branch_area         TEXT;
ALTER TABLE sales_invoices ADD COLUMN IF NOT EXISTS internal_remarks    TEXT;

-- ── SALES INVOICE ITEMS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_invoice_items (
  id               SERIAL PRIMARY KEY,
  sales_invoice_id INTEGER NOT NULL REFERENCES sales_invoices(id),
  item_description TEXT NOT NULL,
  quantity         INTEGER NOT NULL,
  unit_price       NUMERIC NOT NULL,
  amount           NUMERIC NOT NULL
);

-- ── ACCOUNTS PAYABLE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts_payable (
  id                 SERIAL PRIMARY KEY,
  invoice_number     TEXT NOT NULL,
  vendor_name        TEXT NOT NULL,
  amount_due         NUMERIC NOT NULL DEFAULT 0,
  invoice_date       DATE,
  due_date           DATE,
  status             TEXT NOT NULL DEFAULT 'PENDING_COUNTER',
  vendor_dr_number   TEXT,
  counter_receipt_id INTEGER,
  company_id         INTEGER NOT NULL DEFAULT 1,
  created_at         TIMESTAMP DEFAULT NOW()
);

ALTER TABLE accounts_payable ADD COLUMN IF NOT EXISTS invoice_date       DATE;
ALTER TABLE accounts_payable ADD COLUMN IF NOT EXISTS counter_receipt_id INTEGER;
ALTER TABLE accounts_payable ADD COLUMN IF NOT EXISTS company_id         INTEGER NOT NULL DEFAULT 1;

-- ── COUNTER RECEIPTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS counter_receipts (
  id               SERIAL PRIMARY KEY,
  vendor_name      TEXT NOT NULL,
  vendor_tin       TEXT,
  vendor_address   TEXT,
  receipt_date     DATE NOT NULL,
  ref_no           TEXT,
  total_amount     NUMERIC NOT NULL DEFAULT 0,
  amount_paid      NUMERIC NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'ACTIVE',
  number_of_checks INTEGER NOT NULL DEFAULT 1,
  start_date       DATE,
  company_id       INTEGER NOT NULL DEFAULT 1,
  created_at       TIMESTAMP DEFAULT NOW()
);

ALTER TABLE counter_receipts ADD COLUMN IF NOT EXISTS vendor_tin    TEXT;
ALTER TABLE counter_receipts ADD COLUMN IF NOT EXISTS vendor_address TEXT;
ALTER TABLE counter_receipts ADD COLUMN IF NOT EXISTS amount_paid   NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE counter_receipts ADD COLUMN IF NOT EXISTS status        TEXT NOT NULL DEFAULT 'ACTIVE';

-- ── COUNTER RECEIPT CHECKS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS counter_receipt_checks (
  id                  SERIAL PRIMARY KEY,
  counter_receipt_id  INTEGER NOT NULL REFERENCES counter_receipts(id),
  check_no            TEXT,
  bank                TEXT,
  check_date          DATE,
  amount              NUMERIC NOT NULL DEFAULT 0
);

-- ── COUNTER RECEIPT PAYMENTS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS counter_receipt_payments (
  id                  SERIAL PRIMARY KEY,
  counter_receipt_id  INTEGER NOT NULL REFERENCES counter_receipts(id),
  payment_date        DATE NOT NULL,
  ref_no              TEXT,
  amount              NUMERIC NOT NULL DEFAULT 0,
  created_at          TIMESTAMP DEFAULT NOW()
);

-- ── BILLING COLLECTIONS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing_collections (
  id               SERIAL PRIMARY KEY,
  customer_name    TEXT NOT NULL,
  customer_tin     TEXT,
  customer_address TEXT,
  collection_date  DATE NOT NULL,
  total_amount     NUMERIC NOT NULL DEFAULT 0,
  amount_paid      NUMERIC NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'ACTIVE',
  company_id       INTEGER NOT NULL DEFAULT 1,
  created_at       TIMESTAMP DEFAULT NOW()
);

-- ── BILLING COLLECTION ITEMS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS billing_collection_items (
  id                    SERIAL PRIMARY KEY,
  billing_collection_id INTEGER NOT NULL REFERENCES billing_collections(id),
  sales_invoice_id      INTEGER NOT NULL,
  dr_no                 TEXT,
  po_no                 TEXT,
  amount                NUMERIC NOT NULL DEFAULT 0
);

-- ── BILLING COLLECTION PAYMENTS ──────────────────────────────
CREATE TABLE IF NOT EXISTS billing_collection_payments (
  id                    SERIAL PRIMARY KEY,
  billing_collection_id INTEGER NOT NULL REFERENCES billing_collections(id),
  payment_date          DATE NOT NULL,
  ref_no                TEXT,
  amount                NUMERIC NOT NULL DEFAULT 0,
  created_at            TIMESTAMP DEFAULT NOW()
);

-- ── FIX ALL SEQUENCES ────────────────────────────────────────
SELECT setval('companies_id_seq',      COALESCE((SELECT MAX(id) FROM companies), 1));
SELECT setval('products_id_seq',       COALESCE((SELECT MAX(id) FROM products), 1));
SELECT setval('customers_id_seq',      COALESCE((SELECT MAX(id) FROM customers), 1));
SELECT setval('vendors_id_seq',        COALESCE((SELECT MAX(id) FROM vendors), 1));

-- ── DONE ─────────────────────────────────────────────────────
-- All tables and columns are now in sync with the application code.
-- No existing data was modified.
