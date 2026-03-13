import { 
  products, productOemNumbers, productCompatibility,
  customers, vendors, salesOrders, salesOrderItems, purchaseOrders, purchaseOrderItems,
  inventoryTransactions, salesInvoices, salesInvoiceItems, drawerSessions, accountsPayable,
  counterReceipts, counterReceiptChecks, counterReceiptPayments,
  billingCollections, billingCollectionItems, billingCollectionPayments,
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
  type CounterReceiptPayment,
  type BillingCollection, type InsertBillingCollection,
  type BillingCollectionItem, type BillingCollectionPayment,
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
  getCounterReceipts(includeArchived?: boolean): Promise<(CounterReceipt & { checks: CounterReceiptCheck[] })[]>;
  getCounterReceiptById(id: number): Promise<(CounterReceipt & { checks: CounterReceiptCheck[]; apInvoices: AccountsPayable[] }) | null>;
  addCounterReceiptPayment(counterReceiptId: number, data: { paymentDate: string; refNo?: string; amount: string }): Promise<CounterReceiptPayment>;
  getCounterReceiptPayments(counterReceiptId: number): Promise<CounterReceiptPayment[]>;
  updateCounterReceiptStatus(id: number, status: string): Promise<void>;
  deleteCounterReceipt(id: number): Promise<void>;
  updateCounterReceipt(id: number, data: any, checks: any[]): Promise<any>;
  deleteAccountsPayable(id: number): Promise<void>;

  // Billing Collections
  createBillingCollection(data: InsertBillingCollection, items: { salesInvoiceId: number; drNo?: string; poNo?: string; amount: string }[]): Promise<BillingCollection & { items: BillingCollectionItem[] }>;
  getBillingCollections(includeArchived?: boolean): Promise<(BillingCollection & { items: BillingCollectionItem[]; payments: BillingCollectionPayment[] })[]>;
  getBillingCollectionById(id: number): Promise<(BillingCollection & { items: BillingCollectionItem[]; payments: BillingCollectionPayment[] }) | null>;
  addBillingCollectionPayment(billingCollectionId: number, data: { paymentDate: string; refNo?: string; amount: string }): Promise<BillingCollectionPayment>;
  updateBillingCollectionStatus(id: number, status: string): Promise<void>;
  getSupplierChecksReport(startDate?: string, endDate?: string): Promise<{ checkId: number; counterReceiptId: number; vendorName: string; checkNo: string | null; bank: string | null; checkDate: string | null; amount: string }[]>;

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

  async updateCustomer(id: number, data: Partial<InsertCustomer>): Promise<Customer> {
    const [c] = await db.update(customers).set(data).where(eq(customers.id, id)).returning();
    return c;
  }

  async deleteCustomer(id: number): Promise<void> {
    await db.delete(customers).where(eq(customers.id, id));
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

  async updateVendor(id: number, data: Partial<InsertVendor>): Promise<Vendor> {
    const [v] = await db.update(vendors).set(data).where(eq(vendors.id, id)).returning();
    return v;
  }

  async deleteVendor(id: number): Promise<void> {
    await db.delete(vendors).where(eq(vendors.id, id));
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
    const [pendingSO] = await db.select({ count: sql<number>`count(*)` }).from(salesOrders).where(eq(salesOrders.status, 'draft'));
    const [pendingPO] = await db.select({ count: sql<number>`count(*)` }).from(purchaseOrders).where(eq(purchaseOrders.status, 'draft'));
    const [lowStockRow] = await db.select({ count: sql<number>`count(*)` }).from(products).where(sql`stock_quantity <= reorder_point`);
    const [totalCustomers] = await db.select({ count: sql<number>`count(*)` }).from(customers);
    const [totalVendors] = await db.select({ count: sql<number>`count(*)` }).from(vendors);

    // Today's invoices from sales_invoices table
    const todayInvoices = await db.execute(sql.raw(`
      SELECT COUNT(*)::int as count, COALESCE(SUM(total_amount_due::numeric), 0) as revenue
      FROM sales_invoices
      WHERE DATE(created_at) = CURRENT_DATE
    `));
    const todayRow = (todayInvoices as any).rows?.[0] ?? todayInvoices[0] ?? {};

    // Monthly revenue (last 30 days from invoices)
    const monthlyInvoices = await db.execute(sql.raw(`
      SELECT COALESCE(SUM(total_amount_due::numeric), 0) as revenue, COUNT(*)::int as count
      FROM sales_invoices
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `));
    const monthlyRow = (monthlyInvoices as any).rows?.[0] ?? monthlyInvoices[0] ?? {};

    // Unpaid AR total
    const unpaidAR = await db.execute(sql.raw(`
      SELECT COALESCE(SUM(total_amount_due::numeric), 0) as total
      FROM sales_invoices WHERE status = 'UNPAID'
    `));
    const unpaidARRow = (unpaidAR as any).rows?.[0] ?? unpaidAR[0] ?? {};

    // 7-day daily revenue for mini chart
    const weeklyChart = await db.execute(sql.raw(`
      SELECT to_char(created_at::date, 'Mon DD') as day,
             COALESCE(SUM(total_amount_due::numeric), 0) as revenue,
             COUNT(*)::int as count
      FROM sales_invoices
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY created_at::date, to_char(created_at::date, 'Mon DD')
      ORDER BY created_at::date ASC
    `));
    const weeklyData = ((weeklyChart as any).rows ?? weeklyChart ?? []).map((r: any) => ({
      day: r.day,
      revenue: Number(r.revenue),
      count: Number(r.count),
    }));

    // Low stock items with product details
    const lowStockItems = await db.select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      stockQuantity: products.stockQuantity,
      reorderPoint: products.reorderPoint,
    }).from(products).where(sql`stock_quantity <= reorder_point`).limit(10);

    // Recent invoices from POS
    const recentInvoices = await db.execute(sql.raw(`
      SELECT id, invoice_number, registered_name, payment_method, status,
             total_amount_due, created_at
      FROM sales_invoices
      ORDER BY created_at DESC LIMIT 8
    `));
    const recentInvoiceRows = ((recentInvoices as any).rows ?? recentInvoices ?? []).map((r: any) => ({
      id: r.id,
      invoiceNumber: r.invoice_number,
      registeredName: r.registered_name,
      paymentMethod: r.payment_method,
      status: r.status,
      totalAmount: Number(r.total_amount_due ?? 0),
      createdAt: r.created_at,
    }));

    // Recent sales orders
    const recentSales = await db.query.salesOrders.findMany({
      limit: 5,
      orderBy: [desc(salesOrders.orderDate)],
      with: { customer: true },
    });

    return {
      totalProducts: Number(productsCount.count),
      pendingOrders: Number(pendingSO.count),
      pendingPurchaseOrders: Number(pendingPO.count),
      lowStockCount: Number(lowStockRow.count),
      lowStockItems,
      totalCustomers: Number(totalCustomers.count),
      totalVendors: Number(totalVendors.count),
      todayRevenue: Number(todayRow.revenue ?? 0),
      todayInvoiceCount: Number(todayRow.count ?? 0),
      monthlyRevenue: Number(monthlyRow.revenue ?? 0),
      monthlyInvoiceCount: Number(monthlyRow.count ?? 0),
      unpaidAR: Number(unpaidARRow.total ?? 0),
      weeklyChart: weeklyData,
      recentInvoices: recentInvoiceRows,
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

    // Sales come from sales_invoices (POS), using created_at and total_amount_due
    const buildSalesQuery = () => {
      const dateFmt = dateFormat === 'YYYY-MM-DD' ? `to_char(created_at, 'YYYY-MM-DD')`
        : dateFormat === 'YYYY-MM'    ? `to_char(created_at, 'YYYY-MM')`
        : dateFormat === 'YYYY-"Q"Q' ? `to_char(created_at, 'YYYY-"Q"Q')`
        : `to_char(created_at, 'YYYY')`;
      return `SELECT ${dateFmt} as period, COUNT(*)::int as order_count, COALESCE(SUM(CAST(total_amount_due AS numeric)), 0) as total_amount FROM sales_invoices WHERE created_at >= NOW() - INTERVAL '${intervalDays} days' GROUP BY ${dateFmt} ORDER BY period ASC`;
    };

    // Purchases come from purchase_orders, using order_date and total_amount
    const buildPurchaseQuery = () => {
      const dateFmt = dateFormat === 'YYYY-MM-DD' ? `to_char(order_date, 'YYYY-MM-DD')`
        : dateFormat === 'YYYY-MM'    ? `to_char(order_date, 'YYYY-MM')`
        : dateFormat === 'YYYY-"Q"Q' ? `to_char(order_date, 'YYYY-"Q"Q')`
        : `to_char(order_date, 'YYYY')`;
      return `SELECT ${dateFmt} as period, COUNT(*)::int as order_count, COALESCE(SUM(CAST(total_amount AS numeric)), 0) as total_amount FROM purchase_orders WHERE order_date >= NOW() - INTERVAL '${intervalDays} days' GROUP BY ${dateFmt} ORDER BY period ASC`;
    };

    const salesData     = await db.execute(sql.raw(buildSalesQuery()));
    const purchaseData  = await db.execute(sql.raw(buildPurchaseQuery()));
    const salesSummary  = await db.execute(sql.raw(
      `SELECT COUNT(*)::int as total_orders, COALESCE(SUM(CAST(total_amount_due AS numeric)), 0) as total_revenue FROM sales_invoices WHERE created_at >= NOW() - INTERVAL '${intervalDays} days'`
    ));
    const purchaseSummary = await db.execute(sql.raw(
      `SELECT COUNT(*)::int as total_orders, COALESCE(SUM(CAST(total_amount AS numeric)), 0) as total_cost FROM purchase_orders WHERE order_date >= NOW() - INTERVAL '${intervalDays} days'`
    ));

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

  async deleteAccountsPayable(id: number): Promise<void> {
    await db.delete(accountsPayable).where(eq(accountsPayable.id, id));
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

  async getCounterReceipts(includeArchived = false): Promise<(CounterReceipt & { checks: CounterReceiptCheck[] })[]> {
    let query = db.select().from(counterReceipts).$dynamic();
    if (!includeArchived) query = query.where(eq(counterReceipts.status, "ACTIVE"));
    const receipts = await query.orderBy(desc(counterReceipts.createdAt));
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

  async updateCounterReceipt(
    id: number,
    data: Partial<InsertCounterReceipt>,
    checks: InsertCounterReceiptCheck[]
  ): Promise<CounterReceipt & { checks: CounterReceiptCheck[] }> {
    const [receipt] = await db.update(counterReceipts).set(data).where(eq(counterReceipts.id, id)).returning();
    await db.delete(counterReceiptChecks).where(eq(counterReceiptChecks.counterReceiptId, id));
    const insertedChecks = checks.length > 0
      ? await db.insert(counterReceiptChecks)
          .values(checks.map(c => ({ checkNo: c.checkNo, bank: c.bank, checkDate: c.checkDate, amount: c.amount, counterReceiptId: id })))
          .returning()
      : [];
    return { ...receipt, checks: insertedChecks };
  }

  async deleteCounterReceipt(id: number): Promise<void> {
    await db.delete(counterReceiptPayments).where(eq(counterReceiptPayments.counterReceiptId, id));
    await db.delete(counterReceiptChecks).where(eq(counterReceiptChecks.counterReceiptId, id));
    await db.delete(counterReceipts).where(eq(counterReceipts.id, id));
  }

  async addCounterReceiptPayment(counterReceiptId: number, data: { paymentDate: string; refNo?: string; amount: string }): Promise<CounterReceiptPayment> {
    const [payment] = await db.insert(counterReceiptPayments)
      .values({ counterReceiptId, paymentDate: data.paymentDate, refNo: data.refNo || null, amount: data.amount })
      .returning();
    // Update amountPaid on the receipt and auto-archive if fully paid
    const [receipt] = await db.select().from(counterReceipts).where(eq(counterReceipts.id, counterReceiptId));
    if (receipt) {
      const payments = await db.select().from(counterReceiptPayments).where(eq(counterReceiptPayments.counterReceiptId, counterReceiptId));
      const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
      const newStatus = totalPaid >= Number(receipt.totalAmount) ? "ARCHIVED" : receipt.status;
      await db.update(counterReceipts)
        .set({ amountPaid: String(totalPaid), status: newStatus })
        .where(eq(counterReceipts.id, counterReceiptId));
    }
    return payment;
  }

  async getCounterReceiptPayments(counterReceiptId: number): Promise<CounterReceiptPayment[]> {
    return await db.select().from(counterReceiptPayments)
      .where(eq(counterReceiptPayments.counterReceiptId, counterReceiptId))
      .orderBy(desc(counterReceiptPayments.createdAt));
  }

  async updateCounterReceiptStatus(id: number, status: string): Promise<void> {
    await db.update(counterReceipts).set({ status }).where(eq(counterReceipts.id, id));
  }

  // --- BILLING COLLECTIONS ---
  async createBillingCollection(
    data: InsertBillingCollection,
    items: { salesInvoiceId: number; drNo?: string; poNo?: string; amount: string }[]
  ): Promise<BillingCollection & { items: BillingCollectionItem[] }> {
    const [coll] = await db.insert(billingCollections).values(data).returning();
    const insertedItems = items.length > 0
      ? await db.insert(billingCollectionItems)
          .values(items.map(i => ({ billingCollectionId: coll.id, salesInvoiceId: i.salesInvoiceId, drNo: i.drNo || null, poNo: i.poNo || null, amount: i.amount })))
          .returning()
      : [];
    return { ...coll, items: insertedItems };
  }

  async getBillingCollections(includeArchived = false): Promise<(BillingCollection & { items: BillingCollectionItem[]; payments: BillingCollectionPayment[] })[]> {
    let query = db.select().from(billingCollections).$dynamic();
    if (!includeArchived) query = query.where(eq(billingCollections.status, "ACTIVE"));
    const colls = await query.orderBy(desc(billingCollections.createdAt));
    const allItems = await db.select().from(billingCollectionItems);
    const allPayments = await db.select().from(billingCollectionPayments);
    return colls.map(c => ({
      ...c,
      items: allItems.filter(i => i.billingCollectionId === c.id),
      payments: allPayments.filter(p => p.billingCollectionId === c.id),
    }));
  }

  async getBillingCollectionById(id: number): Promise<(BillingCollection & { items: BillingCollectionItem[]; payments: BillingCollectionPayment[] }) | null> {
    const [coll] = await db.select().from(billingCollections).where(eq(billingCollections.id, id));
    if (!coll) return null;
    const items = await db.select().from(billingCollectionItems).where(eq(billingCollectionItems.billingCollectionId, id));
    const payments = await db.select().from(billingCollectionPayments).where(eq(billingCollectionPayments.billingCollectionId, id));
    return { ...coll, items, payments };
  }

  async addBillingCollectionPayment(billingCollectionId: number, data: { paymentDate: string; refNo?: string; amount: string }): Promise<BillingCollectionPayment> {
    const [payment] = await db.insert(billingCollectionPayments)
      .values({ billingCollectionId, paymentDate: data.paymentDate, refNo: data.refNo || null, amount: data.amount })
      .returning();
    // Update amountPaid and auto-archive if fully paid
    const [coll] = await db.select().from(billingCollections).where(eq(billingCollections.id, billingCollectionId));
    if (coll) {
      const payments = await db.select().from(billingCollectionPayments).where(eq(billingCollectionPayments.billingCollectionId, billingCollectionId));
      const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
      const newStatus = totalPaid >= Number(coll.totalAmount) ? "ARCHIVED" : coll.status;
      await db.update(billingCollections)
        .set({ amountPaid: String(totalPaid), status: newStatus })
        .where(eq(billingCollections.id, billingCollectionId));
    }
    return payment;
  }

  async updateBillingCollectionStatus(id: number, status: string): Promise<void> {
    await db.update(billingCollections).set({ status }).where(eq(billingCollections.id, id));
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

  async getSupplierChecksReport(startDate?: string, endDate?: string): Promise<{ checkId: number; counterReceiptId: number; vendorName: string; checkNo: string | null; bank: string | null; checkDate: string | null; amount: string }[]> {
    const checks = await db.select().from(counterReceiptChecks);
    const receipts = await db.select().from(counterReceipts);
    const receiptMap = new Map(receipts.map(r => [r.id, r.vendorName]));
    let rows = checks.map(c => ({
      checkId: c.id,
      counterReceiptId: c.counterReceiptId,
      vendorName: receiptMap.get(c.counterReceiptId) || "Unknown",
      checkNo: c.checkNo,
      bank: c.bank,
      checkDate: c.checkDate,
      amount: c.amount,
    }));
    if (startDate) rows = rows.filter(r => r.checkDate && r.checkDate >= startDate);
    if (endDate) rows = rows.filter(r => r.checkDate && r.checkDate <= endDate);
    return rows.sort((a, b) => (b.checkDate || "").localeCompare(a.checkDate || ""));
  }
}

export const storage = new DatabaseStorage();
