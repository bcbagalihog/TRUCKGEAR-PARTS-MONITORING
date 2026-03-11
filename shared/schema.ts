import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  decimal,
  jsonb,
  varchar,
  numeric,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === AUTH & USER MANAGEMENT ===
import { users } from "./models/auth";
export * from "./models/auth";

// === PRODUCTS & INVENTORY ===
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  brand: text("brand"),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  reorderPoint: integer("reorder_point").notNull().default(5),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  sellingPrice: decimal("selling_price", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  location: text("location"),
  companyId: integer("company_id").notNull().default(1),
});

export const productOemNumbers = pgTable("product_oem_numbers", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  oemNumber: text("oem_number").notNull(),
});

export const productCompatibility = pgTable("product_compatibility", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  make: text("make").notNull(),
  model: text("model").notNull(),
  yearStart: integer("year_start"),
  yearEnd: integer("year_end"),
});

// === PARTIES ===
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
});

export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  leadTimeDays: integer("lead_time_days").default(0),
});

// === CASH DRAWER MANAGEMENT ===
export const drawerSessions = pgTable("drawer_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  startTime: timestamp("start_time").defaultNow().notNull(),
  endTime: timestamp("end_time"),
  openingBalance: numeric("opening_balance", {
    precision: 12,
    scale: 2,
  }).notNull(),
  closingBalance: numeric("closing_balance", { precision: 12, scale: 2 }),
  status: varchar("status", { length: 20 }).default("OPEN"),
  companyId: integer("company_id").notNull().default(1),
});

// === SALES ORDERS ===
export const salesOrders = pgTable("sales_orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id),
  status: text("status").notNull().default("draft"),
  orderDate: timestamp("order_date").defaultNow(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).default(
    "0",
  ),
  paymentStatus: text("payment_status").default("unpaid"),
  companyId: integer("company_id").notNull().default(1),
});

export const salesOrderItems = pgTable("sales_order_items", {
  id: serial("id").primaryKey(),
  salesOrderId: integer("sales_order_id")
    .notNull()
    .references(() => salesOrders.id),
  productId: integer("product_id").references(() => products.id),
  description: text("description"),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
});

// === PURCHASE ORDERS ===
export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id")
    .notNull()
    .references(() => vendors.id),
  status: text("status").notNull().default("draft"),
  orderDate: timestamp("order_date").defaultNow(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).default(
    "0",
  ),
});

export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: serial("id").primaryKey(),
  purchaseOrderId: integer("purchase_order_id")
    .notNull()
    .references(() => purchaseOrders.id),
  productId: integer("product_id").references(() => products.id),
  description: text("description"),
  quantity: integer("quantity").notNull(),
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }).notNull(),
});

// === INVENTORY LOG ===
export const inventoryTransactions = pgTable("inventory_transactions", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id),
  type: text("type").notNull(),
  quantity: integer("quantity").notNull(),
  referenceType: text("reference_type"),
  referenceId: integer("reference_id"),
  date: timestamp("date").defaultNow(),
});

// === SALES INVOICES (VAT OUTPUT) ===
export const salesInvoices = pgTable("sales_invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull(),
  date: timestamp("date").defaultNow().notNull(),
  registeredName: text("registered_name").notNull(),
  tin: text("tin"),
  totalAmount_Due: numeric("total_amount_due").notNull(),
  status: text("status").default("DRAFT"),
  paymentMethod: text("payment_method").default("CASH"),
  drawerSessionId: integer("drawer_session_id").references(
    () => drawerSessions.id,
  ),
  companyId: integer("company_id").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const salesInvoiceItems = pgTable("sales_invoice_items", {
  id: serial("id").primaryKey(),
  salesInvoiceId: integer("sales_invoice_id")
    .notNull()
    .references(() => salesInvoices.id),
  itemDescription: text("item_description").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price").notNull(),
  amount: numeric("amount").notNull(),
});

// === ZOD SCHEMAS (RESTORED ALL) ===
export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
});
export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
});
export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
});
export const insertDrawerSessionSchema = createInsertSchema(
  drawerSessions,
).omit({ id: true, startTime: true });
export const insertSalesOrderSchema = createInsertSchema(salesOrders).omit({
  id: true,
  orderDate: true,
});
export const insertSalesOrderItemSchema = createInsertSchema(
  salesOrderItems,
).omit({ id: true });
export const insertPurchaseOrderSchema = createInsertSchema(
  purchaseOrders,
).omit({ id: true, orderDate: true });
export const insertPurchaseOrderItemSchema = createInsertSchema(
  purchaseOrderItems,
).omit({ id: true });
export const insertSalesInvoiceSchema = createInsertSchema(salesInvoices).omit({
  id: true,
  date: true,
  createdAt: true,
});
export const insertSalesInvoiceItemSchema = createInsertSchema(
  salesInvoiceItems,
).omit({ id: true });

// === TYPES ===
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;
export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = typeof vendors.$inferInsert;
export type DrawerSession = typeof drawerSessions.$inferSelect;
export type SalesInvoice = typeof salesInvoices.$inferSelect;
export type SalesInvoiceItem = typeof salesInvoiceItems.$inferSelect;
export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;
export type SalesOrder = typeof salesOrders.$inferSelect;
export type InsertSalesOrder = typeof salesOrders.$inferInsert;
export type SalesOrderItem = typeof salesOrderItems.$inferSelect;
export type InsertSalesOrderItem = typeof salesOrderItems.$inferInsert;

// === COMPLEX TYPES ===
export type ProductWithDetails = Product & {
  oemNumbers: string[];
  compatibility: Array<{
    id: number;
    productId: number;
    make: string;
    model: string;
    yearStart: number | null;
    yearEnd: number | null;
  }>;
};
export type SalesOrderWithDetails = SalesOrder & {
  items: SalesOrderItem[];
  customer?: Customer;
};
export type PurchaseOrderWithDetails = PurchaseOrder & {
  items: PurchaseOrderItem[];
  vendor?: Vendor;
};
