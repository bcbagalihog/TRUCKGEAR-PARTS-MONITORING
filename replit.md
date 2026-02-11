# Auto Supply Inventory Management System

## Overview
A professional inventory management system for an auto supply business. Includes inventory tracking with OEM cross-referencing, sales orders, purchase orders, customer/vendor management, and dashboard reporting.

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
- **Dashboard**: Low stock alerts, pending orders, recent sales activity
- **Reports**: Activity reports with bar/line charts for sales & purchases (7-day, 30-day, monthly, quarterly, yearly)
- **Currency**: Philippine Pesos (₱)
- **Auth**: Custom username/password registration and login with bcrypt password hashing and session-based authentication

## Project Structure
```
shared/
  schema.ts          - Drizzle tables, Zod schemas, TypeScript types
  routes.ts          - API contract definitions
  models/auth.ts     - Auth-related schemas (users, sessions)
server/
  index.ts           - Server entry point
  db.ts              - Database connection
  storage.ts         - DatabaseStorage class (all CRUD)
  routes.ts          - Express API route handlers + seed data
  replit_integrations/auth/ - Custom auth module (register/login/logout)
client/src/
  App.tsx            - Router + layout with sidebar
  pages/             - Dashboard, Inventory, Sales, Purchases, Customers, Vendors, Reports, Login
  components/        - Layout, Sidebar, StatusBadge, ui/
  hooks/             - use-auth, use-products, use-orders, use-parties, use-stats
  lib/               - queryClient, utils, auth-utils
```

## Stock Logic
- When a Purchase Order status → "received": stock increases for each line item (inventory items only)
- When a Sales Order status → "invoiced": stock decreases for each line item (inventory items only)
- Custom/non-inventory items are skipped during stock adjustments
- All changes are logged in `inventory_transactions` table

## Database Tables
- products, product_oem_numbers, product_compatibility
- customers, vendors
- sales_orders, sales_order_items
- purchase_orders, purchase_order_items
- inventory_transactions
- users, sessions (auth)

## API Endpoints
- `/api/products` (GET, POST), `/api/products/:id` (GET, PUT, DELETE)
- `/api/customers` (GET, POST), `/api/vendors` (GET, POST)
- `/api/sales-orders` (GET, POST), `/api/sales-orders/:id` (GET), `/api/sales-orders/:id/status` (PATCH)
- `/api/purchase-orders` (GET, POST), `/api/purchase-orders/:id` (GET), `/api/purchase-orders/:id/status` (PATCH)
- `/api/stats/dashboard` (GET)
- `/api/reports/activity?period=` (GET) - periods: daily, 7day, 30day, monthly, quarterly, yearly
- `/api/auth/register` (POST), `/api/auth/login` (POST), `/api/auth/user` (GET), `/api/auth/logout` (POST)
