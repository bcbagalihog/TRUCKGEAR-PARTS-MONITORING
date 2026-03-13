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

// === SALES ORDERS (RESTORED) ===
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

// === PURCHASE ORDERS (RESTORED) ===
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

// === ACCOUNTS PAYABLE ===
export const accountsPayable = pgTable("accounts_payable", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull(),
  vendorName: text("vendor_name").notNull(),
  amountDue: numeric("amount_due").notNull().default("0"),
  invoiceDate: date("invoice_date"),
  dueDate: date("due_date"),
  status: text("status").notNull().default("PENDING_COUNTER"),
  vendorDrNumber: text("vendor_dr_number"),
  counterReceiptId: integer("counter_receipt_id"),
  companyId: integer("company_id").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

// === COUNTER RECEIPTS ===
export const counterReceipts = pgTable("counter_receipts", {
  id: serial("id").primaryKey(),
  vendorName: text("vendor_name").notNull(),
  receiptDate: date("receipt_date").notNull(),
  refNo: text("ref_no"),
  totalAmount: numeric("total_amount").notNull(),
  numberOfChecks: integer("number_of_checks").notNull().default(1),
  startDate: date("start_date"),
  companyId: integer("company_id").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

export const counterReceiptChecks = pgTable("counter_receipt_checks", {
  id: serial("id").primaryKey(),
  counterReceiptId: integer("counter_receipt_id").notNull().references(() => counterReceipts.id),
  checkNo: text("check_no"),
  bank: text("bank"),
  checkDate: date("check_date"),
  amount: numeric("amount").notNull(),
});

// === SALES INVOICES (VAT OUTPUT) ===
// paymentMethod: CASH | GCASH | CHECK | NET_DAYS
// status: DRAFT | PAID | UNPAID | BILLED | COUNTERED
export const salesInvoices = pgTable("sales_invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull(),
  date: timestamp("date").defaultNow().notNull(),
  registeredName: text("registered_name").notNull(),
  tin: text("tin"),
  businessAddress: text("business_address"),
  totalAmount_Due: numeric("total_amount_due").notNull(),
  vatableSales: numeric("vatable_sales"),
  vatAmount: numeric("vat_amount"),
  withholdingTax: numeric("withholding_tax"),
  status: text("status").default("PAID"),
  paymentMethod: text("payment_method").default("CASH"),
  // GCash fields
  gcashRef: text("gcash_ref"),
  // Check fields
  checkBankName: text("check_bank_name"),
  checkNumber: text("check_number"),
  checkMaturityDate: date("check_maturity_date"),
  // NET Days fields
  netDays: integer("net_days"),
  poNumber: text("po_number"),
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

// === RELATIONS (CRITICAL FOR DRIZZLE) ===
export const usersRelations = relations(users, ({ many }) => ({
  drawerSessions: many(drawerSessions),
}));

export const productsRelations = relations(products, ({ many }) => ({
  oemNumbers: many(productOemNumbers),
  compatibility: many(productCompatibility),
  inventoryTransactions: many(inventoryTransactions),
}));

export const productOemNumbersRelations = relations(productOemNumbers, ({ one }) => ({
  product: one(products, {
    fields: [productOemNumbers.productId],
    references: [products.id],
  }),
}));

export const productCompatibilityRelations = relations(productCompatibility, ({ one }) => ({
  product: one(products, {
    fields: [productCompatibility.productId],
    references: [products.id],
  }),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  salesOrders: many(salesOrders),
}));

export const vendorsRelations = relations(vendors, ({ many }) => ({
  purchaseOrders: many(purchaseOrders),
}));

export const salesOrdersRelations = relations(salesOrders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [salesOrders.customerId],
    references: [customers.id],
  }),
  items: many(salesOrderItems),
}));

export const salesOrderItemsRelations = relations(salesOrderItems, ({ one }) => ({
  salesOrder: one(salesOrders, {
    fields: [salesOrderItems.salesOrderId],
    references: [salesOrders.id],
  }),
  product: one(products, {
    fields: [salesOrderItems.productId],
    references: [products.id],
  }),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
  vendor: one(vendors, {
    fields: [purchaseOrders.vendorId],
    references: [vendors.id],
  }),
  items: many(purchaseOrderItems),
}));

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({ one }) => ({
  purchaseOrder: one(purchaseOrders, {
    fields: [purchaseOrderItems.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
  product: one(products, {
    fields: [purchaseOrderItems.productId],
    references: [products.id],
  }),
}));

export const inventoryTransactionsRelations = relations(inventoryTransactions, ({ one }) => ({
  product: one(products, {
    fields: [inventoryTransactions.productId],
    references: [products.id],
  }),
}));

export const drawerSessionsRelations = relations(
  drawerSessions,
  ({ one, many }) => ({
    user: one(users, {
      fields: [drawerSessions.userId],
      references: [users.id],
    }),
    salesInvoices: many(salesInvoices),
  }),
);

export const salesInvoicesRelations = relations(
  salesInvoices,
  ({ one, many }) => ({
    drawerSession: one(drawerSessions, {
      fields: [salesInvoices.drawerSessionId],
      references: [drawerSessions.id],
    }),
    items: many(salesInvoiceItems),
  }),
);

export const salesInvoiceItemsRelations = relations(
  salesInvoiceItems,
  ({ one }) => ({
    invoice: one(salesInvoices, {
      fields: [salesInvoiceItems.salesInvoiceId],
      references: [salesInvoices.id],
    }),
  }),
);

// === ZOD SCHEMAS ===
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
export type SalesInvoice = typeof salesInvoices.$inferSelect;
export type SalesInvoiceItem = typeof salesInvoiceItems.$inferSelect;
export type DrawerSession = typeof drawerSessions.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Vendor = typeof vendors.$inferSelect;
export type SalesOrder = typeof salesOrders.$inferSelect;
export type SalesOrderItem = typeof salesOrderItems.$inferSelect;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type AccountsPayable = typeof accountsPayable.$inferSelect;
export type InsertAccountsPayable = typeof accountsPayable.$inferInsert;
export type CounterReceipt = typeof counterReceipts.$inferSelect;
export type InsertCounterReceipt = typeof counterReceipts.$inferInsert;
export type CounterReceiptCheck = typeof counterReceiptChecks.$inferSelect;
export type InsertCounterReceiptCheck = typeof counterReceiptChecks.$inferInsert;
