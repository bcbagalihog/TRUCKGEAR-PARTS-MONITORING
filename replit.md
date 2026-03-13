# Truckgear Truck Parts Store — Inventory Management System

## Overview
A professional inventory management system for Truckgear Truck Parts Store (auto supply business).
- **Address**: 1032 A. Bonifacio St. Brgy Balingasa Q.C,
- **Telephone**: (02)85513863 | **CP**: 09285066385

Includes inventory tracking with OEM cross-referencing, sales orders, purchase orders, customer/vendor management, and dashboard reporting.

## Architecture
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui components
- **Backend**: Express.js (Node.js)
- **Database**: PostgreSQL via Drizzle ORM
- **Auth**: Custom username/password auth with bcrypt + express-session

## Key Features
- **Inventory**: Product catalog with SKU, OEM cross-references, car model compatibility, stock tracking
- **Sales**: Sales orders with status tracking (Draft → Shipped → Invoiced). Invoicing decreases stock.
- **Purchases**: Purchase orders with status tracking (Draft → Ordered → Received). Receiving increases stock.
- **Custom Items**: Sales and purchase orders support non-inventory line items (labor, freight, etc.)
- **Dashboard**: 8 live KPI cards (today revenue, 30-day revenue, unpaid AR, low stock, products, pending SO/PO, customers), 7-day revenue AreaChart (recharts), Low Stock Alerts panel, Recent POS Invoices panel with payment method/status badges, Quick Action links
- **Reports**: Activity reports with bar/line charts for sales & purchases (7-day, 30-day, monthly, quarterly, yearly)
- **Currency**: Philippine Pesos (₱)
- **Auth**: Custom username/password registration and login with bcrypt password hashing and session-based authentication
- **Shopify Integration**: Connect to Shopify store to import/export products, view orders, compare inventory levels
- **Product Images**: Upload product images with preview, stored in /uploads directory
- **POS Payment Methods**: Cash, GCash (ref#), Check (bank/checkNo/maturityDate), NET Days (days/PO# → saves as UNPAID → links to Billing Collection)
- **Accounting Module** (PIN: 8888): Four tabs:
  - Accounts Payable: daily invoice log with PENDING_COUNTER/COUNTERED statuses, quick-add form, AI scan, vendor/status filters
  - Billing Collection: customer dropdown (auto-fills TIN/address), select UNPAID invoices, generate PDF (logo/table/yellow total), saves billing collection to DB with payment tracking + archive toggle; Billing Collection Vault shows active/archived collections with balance tracking
  - Supplier Counter Receipt: vendor dropdown (auto-fills TIN/address), fetch AP invoices, Installment Generator (split total into N weekly checks), save & mark COUNTERED, PDF export; Counter Receipt Vault shows active/archived receipts with Paid/Balance columns, payment recording, archive toggle
  - Check Summary: registry of all CHECK payment invoices from POS (bank, check no., maturity date, amount)
- **PDF Generation**: jsPDF + jspdf-autotable; Billing Collection PDF has company logo, BILLING COLLECTION title, Date/Invoice/DR/PO/Amount table, yellow total box. Counter Receipt PDF has check details table and yellow total box.
- **Purchase Orders**: soldTo and remarks fields in PO form (hidden from PDF print output)

## Project Structure
```
shared/
  schema.ts          - Drizzle tables, Zod schemas, TypeScript types
  routes.ts          - API contract definitions
  models/auth.ts     - Auth-related schemas (users, sessions)
server/
  index.ts           - Server entry point
  build.ts           - Production build script (esbuild + vite)
  db.ts              - Database connection
  storage.ts         - DatabaseStorage class (all CRUD)
  routes.ts          - Express API route handlers + seed data
  replit_integrations/auth/ - Custom auth module (register/login/logout)
client/src/
  App.tsx            - Router + layout with sidebar
  pages/             - Dashboard, Inventory, Sales, Purchases, Customers, Vendors, Reports, Shopify, Login, POS, Accounting
  components/        - Layout, Sidebar, StatusBadge, ui/
  hooks/             - use-auth, use-products, use-orders, use-parties, use-stats
  lib/               - queryClient, utils, auth-utils
```

## Stock Logic
- When a Purchase Order status → "received": stock increases for each line item (inventory items only)
- When a Sales Order status → "invoiced": stock decreases for each line item (inventory items only)
- Custom/non-inventory items are skipped during stock adjustments
- All changes are logged in `inventory_transactions` table

## salesInvoices Status Flow
- PAID: Cash / GCash / Check payments (paid at point of sale)
- UNPAID: NET Days payments (awaiting collection)
- BILLED: After Billing Collection PDF is generated and saved
- DRAFT: Legacy/unused

## Database Tables
- products, product_oem_numbers, product_compatibility
- customers, vendors
- sales_orders, sales_order_items
- purchase_orders, purchase_order_items
- inventory_transactions
- users, sessions (auth)
- drawer_sessions, drawer_expenses
- sales_invoices (VAT invoices with payment method fields), sales_invoice_items
- accounts_payable
- counter_receipts, counter_receipt_checks

## salesInvoices Payment Method Fields
- paymentMethod: CASH | GCASH | CHECK | NET_DAYS
- gcashRef: GCash reference number (GCASH only)
- checkBankName, checkNumber, checkMaturityDate (CHECK only)
- netDays, poNumber (NET_DAYS only)

## API Endpoints
- `/api/products` (GET, POST), `/api/products/:id` (GET, PUT, DELETE)
- `/api/customers` (GET, POST), `/api/vendors` (GET, POST)
- `/api/sales-orders` (GET, POST), `/api/sales-orders/:id` (GET, PUT, DELETE), `/api/sales-orders/:id/status` (PATCH)
- `/api/purchase-orders` (GET, POST), `/api/purchase-orders/:id` (GET, PUT, DELETE), `/api/purchase-orders/:id/status` (PATCH)
- `/api/stats/dashboard` (GET)
- `/api/reports/activity?period=` (GET) - periods: daily, 7day, 30day, monthly, quarterly, yearly
- `/api/auth/register` (POST), `/api/auth/login` (POST), `/api/auth/user` (GET), `/api/auth/logout` (POST)
- `/api/vat-invoices` (POST) - create VAT invoice with payment method data
- `/api/sales-invoices` (GET, ?status=, ?paymentMethod=, ?registeredName=) - list invoices with filters
- `/api/sales-invoices/:id` (GET) - get single invoice with line items
- `/api/sales-invoices/:id` (PUT) - update invoice header + replace line items
- `/api/sales-invoices/bulk-status` (PATCH) - bulk update invoice status (e.g. mark as BILLED)
- `/api/accounts-payable` (GET, POST), `/api/accounts-payable/:id` (PUT), `/api/accounts-payable/:id/receive` (POST)
- `/api/counter-receipts` (GET, POST), `/api/counter-receipts/:id` (GET)
- `/api/admin/users` (GET, POST), `/api/admin/users/:id/toggle-status` (PATCH)
- `/api/pos/drawer-open` (POST), `/api/pos/drawer-close` (POST), `/api/pos/drawer-status` (GET), `/api/pos/expense` (POST)

## Docker Deployment
- **Dockerfile**: Multi-stage build (build stage + production stage), runs on port 8080 (configurable via PORT env var)
- **server/build.ts**: Build script that runs vite build (frontend) + esbuild (backend) → outputs to dist/
- **docker-compose.yml**: Local development with app + PostgreSQL containers
- **DEPLOY.md**: Step-by-step Google Cloud Run deployment guide
- Container auto-runs `drizzle-kit push --force` on startup to create/sync database tables
- Target region: asia-southeast1 (closest to Philippines)
