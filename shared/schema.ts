import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
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
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }).notNull().default("0"),
  sellingPrice: decimal("selling_price", { precision: 10, scale: 2 }).notNull().default("0"),
  location: text("location"), // Shelf/Bin
  imageUrl: text("image_url"),
});

export const productOemNumbers = pgTable("product_oem_numbers", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  oemNumber: text("oem_number").notNull(),
});

export const productCompatibility = pgTable("product_compatibility", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
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

// === SALES ===
export const salesOrders = pgTable("sales_orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customers.id),
  status: text("status").notNull().default("draft"), // draft, shipped, invoiced
  orderDate: timestamp("order_date").defaultNow(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).default("0"),
  paymentStatus: text("payment_status").default("unpaid"), // unpaid, partial, paid
});

export const salesOrderItems = pgTable("sales_order_items", {
  id: serial("id").primaryKey(),
  salesOrderId: integer("sales_order_id").notNull().references(() => salesOrders.id),
  productId: integer("product_id").references(() => products.id),
  description: text("description"),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
});

// === PURCHASING ===
export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull().references(() => vendors.id),
  status: text("status").notNull().default("draft"), // draft, ordered, received
  orderDate: timestamp("order_date").defaultNow(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).default("0"),
});

export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: serial("id").primaryKey(),
  purchaseOrderId: integer("purchase_order_id").notNull().references(() => purchaseOrders.id),
  productId: integer("product_id").references(() => products.id),
  description: text("description"),
  quantity: integer("quantity").notNull(),
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }).notNull(),
});

// === INVENTORY LOG ===
export const inventoryTransactions = pgTable("inventory_transactions", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  type: text("type").notNull(), // IN, OUT, ADJUSTMENT
  quantity: integer("quantity").notNull(), // Positive for IN, Negative for OUT usually handled by logic, but stored as delta
  referenceType: text("reference_type"), // 'purchase_order', 'sales_order', 'manual'
  referenceId: integer("reference_id"),
  date: timestamp("date").defaultNow(),
});


// === RELATIONS ===
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

export const salesOrdersRelations = relations(salesOrders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [salesOrders.customerId],
    references: [customers.id],
  }),
  items: many(salesOrderItems),
}));

export const salesOrderItemsRelations = relations(salesOrderItems, ({ one }) => ({
  order: one(salesOrders, {
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
  order: one(purchaseOrders, {
    fields: [purchaseOrderItems.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
  product: one(products, {
    fields: [purchaseOrderItems.productId],
    references: [products.id],
  }),
}));

// === ZOD SCHEMAS & TYPES ===
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertProductOemNumberSchema = createInsertSchema(productOemNumbers).omit({ id: true });
export const insertProductCompatibilitySchema = createInsertSchema(productCompatibility).omit({ id: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true });
export const insertVendorSchema = createInsertSchema(vendors).omit({ id: true });
export const insertSalesOrderSchema = createInsertSchema(salesOrders).omit({ id: true, orderDate: true });
export const insertSalesOrderItemSchema = createInsertSchema(salesOrderItems).omit({ id: true });
export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({ id: true, orderDate: true });
export const insertPurchaseOrderItemSchema = createInsertSchema(purchaseOrderItems).omit({ id: true });


export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

// Extended product type with relations for frontend
export type ProductWithDetails = Product & {
  oemNumbers: typeof productOemNumbers.$inferSelect[];
  compatibility: typeof productCompatibility.$inferSelect[];
};

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = z.infer<typeof insertVendorSchema>;

export type SalesOrder = typeof salesOrders.$inferSelect;
export type InsertSalesOrder = z.infer<typeof insertSalesOrderSchema>;

export type SalesOrderItem = typeof salesOrderItems.$inferSelect;
export type InsertSalesOrderItem = z.infer<typeof insertSalesOrderItemSchema>;

// Extended Sales Order for detailed view
export type SalesOrderWithDetails = SalesOrder & {
  customer: Customer;
  items: (SalesOrderItem & { product: Product })[];
};

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;

export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = z.infer<typeof insertPurchaseOrderItemSchema>;

// Extended PO for detailed view
export type PurchaseOrderWithDetails = PurchaseOrder & {
  vendor: Vendor;
  items: (PurchaseOrderItem & { product: Product })[];
};

export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
