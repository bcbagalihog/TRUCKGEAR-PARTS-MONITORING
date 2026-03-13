import {
  products,
  productOemNumbers,
  productCompatibility,
  customers,
  vendors,
  salesOrders,
  salesOrderItems,
  purchaseOrders,
  purchaseOrderItems,
  inventoryTransactions,
  salesInvoices,
  salesInvoiceItems,
  drawerSessions,
  type Product,
  type InsertProduct,
  type ProductWithDetails,
  type Customer,
  type InsertCustomer,
  type Vendor,
  type InsertVendor,
  type SalesOrder,
  type InsertSalesOrder,
  type SalesOrderWithDetails,
  type PurchaseOrder,
  type InsertPurchaseOrder,
  type PurchaseOrderWithDetails,
  type InsertSalesOrderItem,
  type InsertPurchaseOrderItem,
  type SalesInvoice,
  type InsertSalesInvoice,
  type SalesInvoiceItem,
  type InsertSalesInvoiceItem,
  type DrawerSession,
  type InsertDrawerSession,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, ilike, or } from "drizzle-orm";
import {
  authStorage,
  type IAuthStorage,
} from "./replit_integrations/auth/storage";

export interface IStorage extends IAuthStorage {
  // Products
  getProducts(search?: string): Promise<ProductWithDetails[]>;
  getProduct(id: number): Promise<ProductWithDetails | undefined>;
  createProduct(
    product: InsertProduct,
    oemNumbers?: string[],
    compatibility?: any[],
  ): Promise<ProductWithDetails>;

  // VAT Invoices & POS
  createSalesInvoice(invoice: InsertSalesInvoice): Promise<SalesInvoice>;
  createSalesInvoiceItem(
    item: InsertSalesInvoiceItem,
  ): Promise<SalesInvoiceItem>;

  // Drawer Management
  getActiveDrawerSession(userId: string): Promise<DrawerSession | undefined>;
  createDrawerSession(session: InsertDrawerSession): Promise<DrawerSession>;
  closeDrawerSession(id: number, closingBalance: string): Promise<void>;

  // Customers & Vendors
  getCustomers(): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  getVendors(): Promise<Vendor[]>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;

  // Dashboard & Stats
  getDashboardStats(): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  getUser = authStorage.getUser.bind(authStorage);
  getUserByUsername = authStorage.getUserByUsername.bind(authStorage);
  createUser = authStorage.createUser.bind(authStorage);

  // --- PRODUCTS ---
  async getProducts(search?: string): Promise<ProductWithDetails[]> {
    const filters = search
      ? or(
          ilike(products.name, `%${search}%`),
          ilike(products.sku, `%${search}%`),
        )
      : undefined;

    return (await db.query.products.findMany({
      where: filters,
      with: { oemNumbers: true, compatibility: true },
      orderBy: [desc(products.id)],
    })) as ProductWithDetails[];
  }

  async getProduct(id: number): Promise<ProductWithDetails | undefined> {
    return (await db.query.products.findFirst({
      where: eq(products.id, id),
      with: { oemNumbers: true, compatibility: true },
    })) as ProductWithDetails;
  }

  async createProduct(
    insertProduct: InsertProduct,
    oemNumbers: string[] = [],
    compatibility: any[] = [],
  ): Promise<ProductWithDetails> {
    return await db.transaction(async (tx) => {
      const [product] = await tx
        .insert(products)
        .values(insertProduct)
        .returning();
      if (oemNumbers.length > 0) {
        await tx.insert(productOemNumbers).values(
          oemNumbers.map((num) => ({
            productId: product.id,
            oemNumber: num,
          })),
        );
      }
      if (compatibility.length > 0) {
        await tx
          .insert(productCompatibility)
          .values(compatibility.map((c) => ({ ...c, productId: product.id })));
      }
      return (await tx.query.products.findFirst({
        where: eq(products.id, product.id),
        with: { oemNumbers: true, compatibility: true },
      })) as ProductWithDetails;
    });
  }

  // --- VAT INVOICES ---
  async createSalesInvoice(data: InsertSalesInvoice): Promise<SalesInvoice> {
    const [invoice] = await db.insert(salesInvoices).values(data).returning();
    return invoice;
  }

  async createSalesInvoiceItem(
    data: InsertSalesInvoiceItem,
  ): Promise<SalesInvoiceItem> {
    const [item] = await db.insert(salesInvoiceItems).values(data).returning();
    return item;
  }

  // --- DRAWER SESSIONS ---
  async getActiveDrawerSession(
    userId: string,
  ): Promise<DrawerSession | undefined> {
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
    await db
      .update(drawerSessions)
      .set({ closingBalance, status: "CLOSED", endTime: new Date() })
      .where(eq(drawerSessions.id, id));
  }

  // --- PARTIES ---
  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers);
  }

  async createCustomer(data: InsertCustomer): Promise<Customer> {
    const [c] = await db.insert(customers).values(data).returning();
    return c;
  }

  async getVendors(): Promise<Vendor[]> {
    return await db.select().from(vendors);
  }

  async createVendor(data: InsertVendor): Promise<Vendor> {
    const [v] = await db.insert(vendors).values(data).returning();
    return v;
  }

  // --- DASHBOARD ---
  async getDashboardStats(): Promise<any> {
    const [productsCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(products);
    const [ordersCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(salesOrders)
      .where(eq(salesOrders.status, "draft"));
    const [lowStock] = await db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(sql`stock_quantity <= reorder_point`);

    return {
      totalProducts: Number(productsCount.count),
      pendingOrders: Number(ordersCount.count),
      lowStockCount: Number(lowStock.count),
      recentSales: await db.query.salesOrders.findMany({
        limit: 5,
        orderBy: [desc(salesOrders.orderDate)],
        with: { customer: true },
      }),
    };
  }
}

export const storage = new DatabaseStorage();
