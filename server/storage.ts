import { 
  products, productOemNumbers, productCompatibility,
  customers, vendors, salesOrders, salesOrderItems, purchaseOrders, purchaseOrderItems,
  inventoryTransactions, salesInvoices, salesInvoiceItems, drawerSessions, accountsPayable,
  counterReceipts, counterReceiptChecks,
  type Product, type InsertProduct, type ProductWithDetails,
  type Customer, type InsertCustomer,
  type Vendor, type InsertVendor,
  type SalesOrder, type InsertSalesOrder, type SalesOrderWithDetails,
  type PurchaseOrder, type InsertPurchaseOrder, type PurchaseOrderWithDetails,
  type InsertSalesOrderItem, type InsertPurchaseOrderItem,
  type SalesInvoice, type InsertSalesInvoice,
  type SalesInvoiceItem, type InsertSalesInvoiceItem,
  type DrawerSession, type InsertDrawerSession,
  type AccountsPayable, type InsertAccountsPayable,
  type CounterReceipt, type InsertCounterReceipt,
  type CounterReceiptCheck, type InsertCounterReceiptCheck,
} from "@shared/schema";
import { users } from "@shared/models/auth";
import { db } from "./db";
import { eq, desc, sql, ilike, or, inArray, and } from "drizzle-orm";
import { authStorage, type IAuthStorage } from "./replit_integrations/auth/storage";

export interface IStorage extends IAuthStorage {
  // Products
  getProducts(search?: string): Promise<ProductWithDetails[]>;
  getProduct(id: number): Promise<ProductWithDetails | undefined>;
  getProductBySku(sku: string): Promise<ProductWithDetails | undefined>;
  createProduct(product: InsertProduct, oemNumbers?: string[], compatibility?: any[]): Promise<ProductWithDetails>;
  updateProduct(id: number, product: Partial<InsertProduct>, oemNumbers?: string[], compatibility?: any[]): Promise<ProductWithDetails>;
  deleteProduct(id: number): Promise<void>;
  
  // Customers & Vendors
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  getVendors(): Promise<Vendor[]>;
  getVendor(id: number): Promise<Vendor | undefined>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;

  // Sales Orders
  getSalesOrders(): Promise<SalesOrderWithDetails[]>;
  getSalesOrder(id: number): Promise<SalesOrderWithDetails | undefined>;
  createSalesOrder(order: InsertSalesOrder, items: InsertSalesOrderItem[]): Promise<SalesOrderWithDetails>;
  updateSalesOrderStatus(id: number, status: string): Promise<SalesOrderWithDetails>;
  updateSalesOrder(id: number, order: Partial<InsertSalesOrder>, items: InsertSalesOrderItem[]): Promise<SalesOrderWithDetails>;
  deleteSalesOrder(id: number): Promise<void>;

  // Purchase Orders
  getPurchaseOrders(): Promise<PurchaseOrderWithDetails[]>;
  getPurchaseOrder(id: number): Promise<PurchaseOrderWithDetails | undefined>;
  createPurchaseOrder(order: InsertPurchaseOrder, items: InsertPurchaseOrderItem[]): Promise<PurchaseOrderWithDetails>;
  updatePurchaseOrderStatus(id: number, status: string): Promise<PurchaseOrderWithDetails>;
  updatePurchaseOrder(id: number, order: Partial<InsertPurchaseOrder>, items: InsertPurchaseOrderItem[]): Promise<PurchaseOrderWithDetails>;
  deletePurchaseOrder(id: number): Promise<void>;

  // VAT Invoices & POS
  createSalesInvoice(invoice: InsertSalesInvoice): Promise<SalesInvoice>;
  createSalesInvoiceItem(item: InsertSalesInvoiceItem): Promise<SalesInvoiceItem>;

  // Drawer Management
  getActiveDrawerSession(userId: string): Promise<DrawerSession | undefined>;
  createDrawerSession(session: InsertDrawerSession): Promise<DrawerSession>;
  closeDrawerSession(id: number, closingBalance: string): Promise<void>;

  // Dashboard Stats
  getDashboardStats(): Promise<any>;

  // Activity Report
  getActivityReport(period: string): Promise<any>;

  // Accounts Payable
  getAccountsPayable(vendorName?: string, status?: string): Promise<AccountsPayable[]>;
  createAccountsPayable(data: InsertAccountsPayable): Promise<AccountsPayable>;
  updateAccountsPayable(id: number, data: Partial<InsertAccountsPayable>): Promise<AccountsPayable>;
  receiveAccountsPayable(id: number, vendorDrNumber: string): Promise<AccountsPayable>;
  bulkMarkCountered(ids: number[], counterReceiptId: number): Promise<void>;

  // Counter Receipts
  createCounterReceipt(data: InsertCounterReceipt, checks: InsertCounterReceiptCheck[]): Promise<CounterReceipt & { checks: CounterReceiptCheck[] }>;
  getCounterReceipts(): Promise<(CounterReceipt & { checks: CounterReceiptCheck[] })[]>;
  getCounterReceiptById(id: number): Promise<(CounterReceipt & { checks: CounterReceiptCheck[]; apInvoices: AccountsPayable[] }) | null>;

  // Admin Users
  getAllUsers(): Promise<any[]>;
  createAdminUser(data: any): Promise<any>;
  toggleUserStatus(id: string, isActive: boolean): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  getUser = authStorage.getUser.bind(authStorage);
  getUserByUsername = authStorage.getUserByUsername.bind(authStorage);
  createUser = authStorage.createUser.bind(authStorage);

  // --- PRODUCTS ---
  async getProducts(search?: string): Promise<ProductWithDetails[]> {
    const filters = search
      ? or(ilike(products.name, `%${search}%`), ilike(products.sku, `%${search}%`))
      : undefined;
    return (await db.query.products.findMany({
      where: filters,
      with: { oemNumbers: true, compatibility: true },
      orderBy: [desc(products.id)],
    })) as ProductWithDetails[];
  }

  async getProduct(id: number): Promise<ProductWithDetails | undefined> {
    return await db.query.products.findFirst({
      where: eq(products.id, id),
      with: { oemNumbers: true, compatibility: true },
    });
  }

  async getProductBySku(sku: string): Promise<ProductWithDetails | undefined> {
    return await db.query.products.findFirst({
      where: eq(products.sku, sku),
      with: { oemNumbers: true, compatibility: true },
    });
  }

  async createProduct(insertProduct: InsertProduct, oemNumbers: string[] = [], compatibility: any[] = []): Promise<ProductWithDetails> {
    return await db.transaction(async (tx) => {
      const [product] = await tx.insert(products).values(insertProduct).returning();
      if (oemNumbers.length > 0) {
        await tx.insert(productOemNumbers).values(
          oemNumbers.map(num => ({ productId: product.id, oemNumber: num }))
        );
      }
      if (compatibility.length > 0) {
        await tx.insert(productCompatibility).values(
          compatibility.map(c => ({ ...c, productId: product.id }))
        );
      }
      return (await tx.query.products.findFirst({
        where: eq(products.id, product.id),
        with: { oemNumbers: true, compatibility: true },
      })) as ProductWithDetails;
    });
  }

  async updateProduct(id: number, updates: Partial<InsertProduct>, oemNumbers?: string[], compatibility?: any[]): Promise<ProductWithDetails> {
    return await db.transaction(async (tx) => {
      await tx.update(products).set(updates).where(eq(products.id, id));
      if (oemNumbers !== undefined) {
        await tx.delete(productOemNumbers).where(eq(productOemNumbers.productId, id));
        if (oemNumbers.length > 0) {
          await tx.insert(productOemNumbers).values(
            oemNumbers.map(num => ({ productId: id, oemNumber: num }))
          );
        }
      }
      if (compatibility !== undefined) {
        await tx.delete(productCompatibility).where(eq(productCompatibility.productId, id));
        if (compatibility.length > 0) {
          await tx.insert(productCompatibility).values(
            compatibility.map(c => ({ ...c, productId: id }))
          );
        }
      }
      return (await tx.query.products.findFirst({
        where: eq(products.id, id),
        with: { oemNumbers: true, compatibility: true },
      })) as ProductWithDetails;
    });
  }

  async deleteProduct(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(productOemNumbers).where(eq(productOemNumbers.productId, id));
      await tx.delete(productCompatibility).where(eq(productCompatibility.productId, id));
      await tx.delete(inventoryTransactions).where(eq(inventoryTransactions.productId, id));
      await tx.delete(products).where(eq(products.id, id));
    });
  }

  // --- CUSTOMERS & VENDORS ---
  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers);
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const [c] = await db.select().from(customers).where(eq(customers.id, id));
    return c;
  }

  async createCustomer(data: InsertCustomer): Promise<Customer> {
    const [c] = await db.insert(customers).values(data).returning();
    return c;
  }

  async getVendors(): Promise<Vendor[]> {
    return await db.select().from(vendors);
  }

  async getVendor(id: number): Promise<Vendor | undefined> {
    const [v] = await db.select().from(vendors).where(eq(vendors.id, id));
    return v;
  }

  async createVendor(data: InsertVendor): Promise<Vendor> {
    const [v] = await db.insert(vendors).values(data).returning();
    return v;
  }

  // --- SALES ORDERS ---
  async getSalesOrders(): Promise<SalesOrderWithDetails[]> {
    return await db.query.salesOrders.findMany({
      with: { customer: true, items: { with: { product: true } } },
      orderBy: [desc(salesOrders.orderDate)],
    });
  }

  async getSalesOrder(id: number): Promise<SalesOrderWithDetails | undefined> {
    return await db.query.salesOrders.findFirst({
      where: eq(salesOrders.id, id),
      with: { customer: true, items: { with: { product: true } } },
    });
  }

  async createSalesOrder(order: InsertSalesOrder, items: InsertSalesOrderItem[]): Promise<SalesOrderWithDetails> {
    return await db.transaction(async (tx) => {
      const totalAmount = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
      const [newOrder] = await tx.insert(salesOrders).values({ ...order, totalAmount: String(totalAmount) }).returning();
      if (items.length > 0) {
        await tx.insert(salesOrderItems).values(items.map(item => ({ ...item, salesOrderId: newOrder.id })));
      }
      return (await tx.query.salesOrders.findFirst({
        where: eq(salesOrders.id, newOrder.id),
        with: { customer: true, items: { with: { product: true } } },
      })) as SalesOrderWithDetails;
    });
  }

  async updateSalesOrderStatus(id: number, status: string): Promise<SalesOrderWithDetails> {
    return await db.transaction(async (tx) => {
      const currentOrder = await tx.query.salesOrders.findFirst({
        where: eq(salesOrders.id, id),
        with: { items: true },
      });
      if (!currentOrder) throw new Error("Order not found");

      if (status === 'invoiced' && currentOrder.status !== 'invoiced') {
        for (const item of currentOrder.items) {
          if (!item.productId) continue;
          await tx.execute(sql`UPDATE products SET stock_quantity = stock_quantity - ${item.quantity} WHERE id = ${item.productId}`);
          await tx.insert(inventoryTransactions).values({
            productId: item.productId,
            type: 'OUT',
            quantity: item.quantity,
            referenceType: 'sales_order',
            referenceId: id,
          });
        }
      }

      await tx.update(salesOrders).set({ status }).where(eq(salesOrders.id, id));
      return (await tx.query.salesOrders.findFirst({
        where: eq(salesOrders.id, id),
        with: { customer: true, items: { with: { product: true } } },
      })) as SalesOrderWithDetails;
    });
  }

  async updateSalesOrder(id: number, order: Partial<InsertSalesOrder>, items: InsertSalesOrderItem[]): Promise<SalesOrderWithDetails> {
    return await db.transaction(async (tx) => {
      const totalAmount = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
      await tx.update(salesOrders).set({ ...order, totalAmount: String(totalAmount) }).where(eq(salesOrders.id, id));
      await tx.delete(salesOrderItems).where(eq(salesOrderItems.salesOrderId, id));
      if (items.length > 0) {
        await tx.insert(salesOrderItems).values(items.map(item => ({ ...item, salesOrderId: id })));
      }
      return (await tx.query.salesOrders.findFirst({
        where: eq(salesOrders.id, id),
        with: { customer: true, items: { with: { product: true } } },
      })) as SalesOrderWithDetails;
    });
  }

  async deleteSalesOrder(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(salesOrderItems).where(eq(salesOrderItems.salesOrderId, id));
      await tx.delete(salesOrders).where(eq(salesOrders.id, id));
    });
  }

  // --- PURCHASE ORDERS ---
  async getPurchaseOrders(): Promise<PurchaseOrderWithDetails[]> {
    return await db.query.purchaseOrders.findMany({
      with: { vendor: true, items: { with: { product: true } } },
      orderBy: [desc(purchaseOrders.orderDate)],
    });
  }

  async getPurchaseOrder(id: number): Promise<PurchaseOrderWithDetails | undefined> {
    return await db.query.purchaseOrders.findFirst({
      where: eq(purchaseOrders.id, id),
      with: { vendor: true, items: { with: { product: true } } },
    });
  }

  async createPurchaseOrder(order: InsertPurchaseOrder, items: InsertPurchaseOrderItem[]): Promise<PurchaseOrderWithDetails> {
    return await db.transaction(async (tx) => {
      const totalAmount = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitCost)), 0);
      const [newOrder] = await tx.insert(purchaseOrders).values({ ...order, totalAmount: String(totalAmount) }).returning();
      if (items.length > 0) {
        await tx.insert(purchaseOrderItems).values(items.map(item => ({ ...item, purchaseOrderId: newOrder.id })));
      }
      return (await tx.query.purchaseOrders.findFirst({
        where: eq(purchaseOrders.id, newOrder.id),
        with: { vendor: true, items: { with: { product: true } } },
      })) as PurchaseOrderWithDetails;
    });
  }

  async updatePurchaseOrderStatus(id: number, status: string): Promise<PurchaseOrderWithDetails> {
    return await db.transaction(async (tx) => {
      const currentOrder = await tx.query.purchaseOrders.findFirst({
        where: eq(purchaseOrders.id, id),
        with: { items: true },
      });
      if (!currentOrder) throw new Error("Order not found");

      if (status === 'received' && currentOrder.status !== 'received') {
        for (const item of currentOrder.items) {
          if (!item.productId) continue;
          await tx.execute(sql`UPDATE products SET stock_quantity = stock_quantity + ${item.quantity} WHERE id = ${item.productId}`);
          await tx.insert(inventoryTransactions).values({
            productId: item.productId,
            type: 'IN',
            quantity: item.quantity,
            referenceType: 'purchase_order',
            referenceId: id,
          });
        }
      }

      await tx.update(purchaseOrders).set({ status }).where(eq(purchaseOrders.id, id));
      return (await tx.query.purchaseOrders.findFirst({
        where: eq(purchaseOrders.id, id),
        with: { vendor: true, items: { with: { product: true } } },
      })) as PurchaseOrderWithDetails;
    });
  }

  async updatePurchaseOrder(id: number, order: Partial<InsertPurchaseOrder>, items: InsertPurchaseOrderItem[]): Promise<PurchaseOrderWithDetails> {
    return await db.transaction(async (tx) => {
      const totalAmount = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitCost)), 0);
      await tx.update(purchaseOrders).set({ ...order, totalAmount: String(totalAmount) }).where(eq(purchaseOrders.id, id));
      await tx.delete(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id));
      if (items.length > 0) {
        await tx.insert(purchaseOrderItems).values(items.map(item => ({ ...item, purchaseOrderId: id })));
      }
      return (await tx.query.purchaseOrders.findFirst({
        where: eq(purchaseOrders.id, id),
        with: { vendor: true, items: { with: { product: true } } },
      })) as PurchaseOrderWithDetails;
    });
  }

  async deletePurchaseOrder(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id));
      await tx.delete(purchaseOrders).where(eq(purchaseOrders.id, id));
    });
  }

  // --- VAT INVOICES ---
  async createSalesInvoice(data: InsertSalesInvoice): Promise<SalesInvoice> {
    const [invoice] = await db.insert(salesInvoices).values(data).returning();
    return invoice;
  }

  async createSalesInvoiceItem(data: InsertSalesInvoiceItem): Promise<SalesInvoiceItem> {
    const [item] = await db.insert(salesInvoiceItems).values(data).returning();
    return item;
  }

  // --- DRAWER SESSIONS ---
  async getActiveDrawerSession(userId: string): Promise<DrawerSession | undefined> {
    return await db.query.drawerSessions.findFirst({
      where: sql`${drawerSessions.userId} = ${userId} AND ${drawerSessions.status} = 'OPEN'`,
      orderBy: [desc(drawerSessions.startTime)],
    });
  }

  async createDrawerSession(data: InsertDrawerSession): Promise<DrawerSession> {
    const [session] = await db.insert(drawerSessions).values(data).returning();
    return session;
  }

  async closeDrawerSession(id: number, closingBalance: string): Promise<void> {
    await db.update(drawerSessions)
      .set({ closingBalance, status: "CLOSED", endTime: new Date() })
      .where(eq(drawerSessions.id, id));
  }

  // --- DASHBOARD ---
  async getDashboardStats(): Promise<any> {
    const [productsCount] = await db.select({ count: sql<number>`count(*)` }).from(products);
    const [ordersCount] = await db.select({ count: sql<number>`count(*)` }).from(salesOrders).where(eq(salesOrders.status, 'draft'));
    const [lowStock] = await db.select({ count: sql<number>`count(*)` })
      .from(products)
      .where(sql`stock_quantity <= reorder_point`);
    const recentSales = await db.query.salesOrders.findMany({
      limit: 5,
      orderBy: [desc(salesOrders.orderDate)],
      with: { customer: true },
    });
    return {
      totalProducts: Number(productsCount.count),
      pendingOrders: Number(ordersCount.count),
      lowStockCount: Number(lowStock.count),
      recentSales,
    };
  }

  // --- ACTIVITY REPORT ---
  async getActivityReport(period: string): Promise<any> {
    const formatMap: Record<string, { fmt: string; days: number }> = {
      'daily':     { fmt: 'YYYY-MM-DD',   days: 30 },
      '7day':      { fmt: 'YYYY-MM-DD',   days: 7 },
      '30day':     { fmt: 'YYYY-MM-DD',   days: 30 },
      'monthly':   { fmt: 'YYYY-MM',      days: 365 },
      'quarterly': { fmt: 'YYYY-"Q"Q',    days: 730 },
      'yearly':    { fmt: 'YYYY',          days: 1825 },
    };
    const config = formatMap[period] || formatMap['30day'];
    const intervalDays = config.days;
    const dateFormat = config.fmt;

    const buildQuery = (table: string) => {
      if (dateFormat === 'YYYY-MM-DD') {
        return `SELECT to_char(order_date, 'YYYY-MM-DD') as period, COUNT(*)::int as order_count, COALESCE(SUM(CAST(total_amount AS numeric)), 0) as total_amount FROM ${table} WHERE order_date >= NOW() - INTERVAL '${intervalDays} days' GROUP BY to_char(order_date, 'YYYY-MM-DD') ORDER BY period ASC`;
      } else if (dateFormat === 'YYYY-MM') {
        return `SELECT to_char(order_date, 'YYYY-MM') as period, COUNT(*)::int as order_count, COALESCE(SUM(CAST(total_amount AS numeric)), 0) as total_amount FROM ${table} WHERE order_date >= NOW() - INTERVAL '${intervalDays} days' GROUP BY to_char(order_date, 'YYYY-MM') ORDER BY period ASC`;
      } else if (dateFormat === 'YYYY-"Q"Q') {
        return `SELECT to_char(order_date, 'YYYY-"Q"Q') as period, COUNT(*)::int as order_count, COALESCE(SUM(CAST(total_amount AS numeric)), 0) as total_amount FROM ${table} WHERE order_date >= NOW() - INTERVAL '${intervalDays} days' GROUP BY to_char(order_date, 'YYYY-"Q"Q') ORDER BY period ASC`;
      } else {
        return `SELECT to_char(order_date, 'YYYY') as period, COUNT(*)::int as order_count, COALESCE(SUM(CAST(total_amount AS numeric)), 0) as total_amount FROM ${table} WHERE order_date >= NOW() - INTERVAL '${intervalDays} days' GROUP BY to_char(order_date, 'YYYY') ORDER BY period ASC`;
      }
    };

    const buildSummaryQuery = (table: string, amountAlias: string) =>
      `SELECT COUNT(*)::int as total_orders, COALESCE(SUM(CAST(total_amount AS numeric)), 0) as ${amountAlias} FROM ${table} WHERE order_date >= NOW() - INTERVAL '${intervalDays} days'`;

    const salesData = await db.execute(sql.raw(buildQuery('sales_orders')));
    const purchaseData = await db.execute(sql.raw(buildQuery('purchase_orders')));
    const salesSummary = await db.execute(sql.raw(buildSummaryQuery('sales_orders', 'total_revenue')));
    const purchaseSummary = await db.execute(sql.raw(buildSummaryQuery('purchase_orders', 'total_cost')));

    return {
      sales: salesData.rows,
      purchases: purchaseData.rows,
      salesSummary: salesSummary.rows[0],
      purchaseSummary: purchaseSummary.rows[0],
    };
  }

  // --- ACCOUNTS PAYABLE ---
  async getAccountsPayable(vendorName?: string, status?: string): Promise<AccountsPayable[]> {
    let query = db.select().from(accountsPayable).$dynamic();
    const conditions = [];
    if (vendorName) conditions.push(ilike(accountsPayable.vendorName, `%${vendorName}%`));
    if (status) conditions.push(eq(accountsPayable.status, status));
    if (conditions.length === 1) query = query.where(conditions[0]);
    else if (conditions.length > 1) query = query.where(and(...conditions));
    return await query.orderBy(desc(accountsPayable.createdAt));
  }

  async createAccountsPayable(data: InsertAccountsPayable): Promise<AccountsPayable> {
    const [bill] = await db.insert(accountsPayable).values(data).returning();
    return bill;
  }

  async updateAccountsPayable(id: number, data: Partial<InsertAccountsPayable>): Promise<AccountsPayable> {
    const [bill] = await db.update(accountsPayable).set(data).where(eq(accountsPayable.id, id)).returning();
    return bill;
  }

  async receiveAccountsPayable(id: number, vendorDrNumber: string): Promise<AccountsPayable> {
    const [bill] = await db.update(accountsPayable)
      .set({ vendorDrNumber, status: "RECEIVED" })
      .where(eq(accountsPayable.id, id))
      .returning();
    return bill;
  }

  async bulkMarkCountered(ids: number[], counterReceiptId: number): Promise<void> {
    if (ids.length === 0) return;
    await db.update(accountsPayable)
      .set({ status: "COUNTERED", counterReceiptId })
      .where(inArray(accountsPayable.id, ids));
  }

  // --- COUNTER RECEIPTS ---
  async createCounterReceipt(
    data: InsertCounterReceipt,
    checks: InsertCounterReceiptCheck[]
  ): Promise<CounterReceipt & { checks: CounterReceiptCheck[] }> {
    const [receipt] = await db.insert(counterReceipts).values(data).returning();
    const insertedChecks = checks.length > 0
      ? await db.insert(counterReceiptChecks)
          .values(checks.map(c => ({ ...c, counterReceiptId: receipt.id })))
          .returning()
      : [];
    return { ...receipt, checks: insertedChecks };
  }

  async getCounterReceipts(): Promise<(CounterReceipt & { checks: CounterReceiptCheck[] })[]> {
    const receipts = await db.select().from(counterReceipts).orderBy(desc(counterReceipts.createdAt));
    const allChecks = await db.select().from(counterReceiptChecks);
    return receipts.map(r => ({
      ...r,
      checks: allChecks.filter(c => c.counterReceiptId === r.id),
    }));
  }

  async getCounterReceiptById(
    id: number
  ): Promise<(CounterReceipt & { checks: CounterReceiptCheck[]; apInvoices: AccountsPayable[] }) | null> {
    const [receipt] = await db.select().from(counterReceipts).where(eq(counterReceipts.id, id));
    if (!receipt) return null;
    const checks = await db.select().from(counterReceiptChecks).where(eq(counterReceiptChecks.counterReceiptId, id));
    const apInvoices = await db.select().from(accountsPayable).where(eq(accountsPayable.counterReceiptId, id));
    return { ...receipt, checks, apInvoices };
  }

  // --- ADMIN USERS ---
  async getAllUsers(): Promise<any[]> {
    const allUsers = await db.select({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: users.role,
      companyId: users.companyId,
      isActive: users.isActive,
      createdAt: users.createdAt,
    }).from(users);
    return allUsers;
  }

  async createAdminUser(data: any): Promise<any> {
    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const [user] = await db.insert(users).values({
      username: data.username,
      password: hashedPassword,
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      role: data.role || "staff",
      companyId: data.companyId || 1,
    }).returning({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      companyId: users.companyId,
      isActive: users.isActive,
      createdAt: users.createdAt,
    });
    return user;
  }

  async toggleUserStatus(id: string, isActive: boolean): Promise<any> {
    const [user] = await db.update(users)
      .set({ isActive })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
        username: users.username,
        isActive: users.isActive,
      });
    return user;
  }
}

export const storage = new DatabaseStorage();
