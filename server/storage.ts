import { 
  products, productOemNumbers, productCompatibility,
  customers, vendors, salesOrders, salesOrderItems, purchaseOrders, purchaseOrderItems,
  inventoryTransactions,
  type Product, type InsertProduct, type ProductWithDetails,
  type Customer, type InsertCustomer,
  type Vendor, type InsertVendor,
  type SalesOrder, type InsertSalesOrder, type SalesOrderWithDetails,
  type PurchaseOrder, type InsertPurchaseOrder, type PurchaseOrderWithDetails,
  type InsertSalesOrderItem, type InsertPurchaseOrderItem
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, inArray } from "drizzle-orm";
import { authStorage, type IAuthStorage } from "./replit_integrations/auth/storage";

export interface IStorage extends IAuthStorage {
  // Products
  getProducts(search?: string): Promise<ProductWithDetails[]>;
  getProduct(id: number): Promise<ProductWithDetails | undefined>;
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

  // Dashboard Stats
  getDashboardStats(): Promise<any>;

  // Activity Report
  getActivityReport(period: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  getUser = authStorage.getUser.bind(authStorage);
  getUserByUsername = authStorage.getUserByUsername.bind(authStorage);
  createUser = authStorage.createUser.bind(authStorage);

  // Products
  async getProducts(search?: string): Promise<ProductWithDetails[]> {
    const query = db.query.products.findMany({
      with: {
        oemNumbers: true,
        compatibility: true,
      },
      orderBy: [desc(products.id)],
    });
    
    // In a real app, we'd add search filtering here
    // For now, simple fetch all
    return await query;
  }

  async getProduct(id: number): Promise<ProductWithDetails | undefined> {
    return await db.query.products.findFirst({
      where: eq(products.id, id),
      with: {
        oemNumbers: true,
        compatibility: true,
      },
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
        with: { oemNumbers: true, compatibility: true }
      })) as ProductWithDetails;
    });
  }

  async updateProduct(id: number, updates: Partial<InsertProduct>, oemNumbers?: string[], compatibility?: any[]): Promise<ProductWithDetails> {
    return await db.transaction(async (tx) => {
      await tx.update(products).set(updates).where(eq(products.id, id));

      if (oemNumbers) {
        await tx.delete(productOemNumbers).where(eq(productOemNumbers.productId, id));
        if (oemNumbers.length > 0) {
          await tx.insert(productOemNumbers).values(
            oemNumbers.map(num => ({ productId: id, oemNumber: num }))
          );
        }
      }

      if (compatibility) {
        await tx.delete(productCompatibility).where(eq(productCompatibility.productId, id));
        if (compatibility.length > 0) {
          await tx.insert(productCompatibility).values(
            compatibility.map(c => ({ ...c, productId: id }))
          );
        }
      }

      return (await tx.query.products.findFirst({
        where: eq(products.id, id),
        with: { oemNumbers: true, compatibility: true }
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

  // Customers & Vendors
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

  // Sales Orders
  async getSalesOrders(): Promise<SalesOrderWithDetails[]> {
    return await db.query.salesOrders.findMany({
      with: {
        customer: true,
        items: {
          with: { product: true }
        }
      },
      orderBy: [desc(salesOrders.orderDate)],
    });
  }

  async getSalesOrder(id: number): Promise<SalesOrderWithDetails | undefined> {
    return await db.query.salesOrders.findFirst({
      where: eq(salesOrders.id, id),
      with: {
        customer: true,
        items: {
          with: { product: true }
        }
      }
    });
  }

  async createSalesOrder(order: InsertSalesOrder, items: InsertSalesOrderItem[]): Promise<SalesOrderWithDetails> {
    return await db.transaction(async (tx) => {
      // Calculate total amount
      const totalAmount = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
      
      const [newOrder] = await tx.insert(salesOrders).values({
        ...order,
        totalAmount: String(totalAmount),
      }).returning();

      if (items.length > 0) {
        await tx.insert(salesOrderItems).values(
          items.map(item => ({ ...item, salesOrderId: newOrder.id }))
        );
      }

      return (await tx.query.salesOrders.findFirst({
        where: eq(salesOrders.id, newOrder.id),
        with: { customer: true, items: { with: { product: true } } }
      })) as SalesOrderWithDetails;
    });
  }

  async updateSalesOrderStatus(id: number, status: string): Promise<SalesOrderWithDetails> {
    return await db.transaction(async (tx) => {
      const currentOrder = await tx.query.salesOrders.findFirst({
        where: eq(salesOrders.id, id),
        with: { items: true }
      });
      
      if (!currentOrder) throw new Error("Order not found");

      // Logic: If moving to 'invoiced', deduct stock (only for inventory items)
      if (status === 'invoiced' && currentOrder.status !== 'invoiced') {
        for (const item of currentOrder.items) {
          if (!item.productId) continue; // Skip custom/non-inventory items
          await tx.execute(sql`
            UPDATE products 
            SET stock_quantity = stock_quantity - ${item.quantity} 
            WHERE id = ${item.productId}
          `);
          await tx.insert(inventoryTransactions).values({
            productId: item.productId,
            type: 'OUT',
            quantity: item.quantity,
            referenceType: 'sales_order',
            referenceId: id,
          });
        }
      }

      const [updated] = await tx.update(salesOrders)
        .set({ status })
        .where(eq(salesOrders.id, id))
        .returning();

      return (await tx.query.salesOrders.findFirst({
        where: eq(salesOrders.id, id),
        with: { customer: true, items: { with: { product: true } } }
      })) as SalesOrderWithDetails;
    });
  }

  async updateSalesOrder(id: number, order: Partial<InsertSalesOrder>, items: InsertSalesOrderItem[]): Promise<SalesOrderWithDetails> {
    return await db.transaction(async (tx) => {
      const totalAmount = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);

      await tx.update(salesOrders)
        .set({ ...order, totalAmount: String(totalAmount) })
        .where(eq(salesOrders.id, id));

      await tx.delete(salesOrderItems).where(eq(salesOrderItems.salesOrderId, id));

      if (items.length > 0) {
        await tx.insert(salesOrderItems).values(
          items.map(item => ({ ...item, salesOrderId: id }))
        );
      }

      return (await tx.query.salesOrders.findFirst({
        where: eq(salesOrders.id, id),
        with: { customer: true, items: { with: { product: true } } }
      })) as SalesOrderWithDetails;
    });
  }

  async deleteSalesOrder(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      await tx.delete(salesOrderItems).where(eq(salesOrderItems.salesOrderId, id));
      await tx.delete(salesOrders).where(eq(salesOrders.id, id));
    });
  }

  // Purchase Orders
  async getPurchaseOrders(): Promise<PurchaseOrderWithDetails[]> {
    return await db.query.purchaseOrders.findMany({
      with: {
        vendor: true,
        items: {
          with: { product: true }
        }
      },
      orderBy: [desc(purchaseOrders.orderDate)],
    });
  }

  async getPurchaseOrder(id: number): Promise<PurchaseOrderWithDetails | undefined> {
    return await db.query.purchaseOrders.findFirst({
      where: eq(purchaseOrders.id, id),
      with: {
        vendor: true,
        items: {
          with: { product: true }
        }
      }
    });
  }

  async createPurchaseOrder(order: InsertPurchaseOrder, items: InsertPurchaseOrderItem[]): Promise<PurchaseOrderWithDetails> {
    return await db.transaction(async (tx) => {
      // Calculate total
      const totalAmount = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitCost)), 0);

      const [newOrder] = await tx.insert(purchaseOrders).values({
        ...order,
        totalAmount: String(totalAmount),
      }).returning();

      if (items.length > 0) {
        await tx.insert(purchaseOrderItems).values(
          items.map(item => ({ ...item, purchaseOrderId: newOrder.id }))
        );
      }

      return (await tx.query.purchaseOrders.findFirst({
        where: eq(purchaseOrders.id, newOrder.id),
        with: { vendor: true, items: { with: { product: true } } }
      })) as PurchaseOrderWithDetails;
    });
  }

  async updatePurchaseOrderStatus(id: number, status: string): Promise<PurchaseOrderWithDetails> {
    return await db.transaction(async (tx) => {
      const currentOrder = await tx.query.purchaseOrders.findFirst({
        where: eq(purchaseOrders.id, id),
        with: { items: true }
      });
      
      if (!currentOrder) throw new Error("Order not found");

      // Logic: If moving to 'received', add stock (only for inventory items)
      if (status === 'received' && currentOrder.status !== 'received') {
        for (const item of currentOrder.items) {
          if (!item.productId) continue; // Skip custom/non-inventory items
          await tx.execute(sql`
            UPDATE products 
            SET stock_quantity = stock_quantity + ${item.quantity} 
            WHERE id = ${item.productId}
          `);
          await tx.insert(inventoryTransactions).values({
            productId: item.productId,
            type: 'IN',
            quantity: item.quantity,
            referenceType: 'purchase_order',
            referenceId: id,
          });
        }
      }

      const [updated] = await tx.update(purchaseOrders)
        .set({ status })
        .where(eq(purchaseOrders.id, id))
        .returning();

      return (await tx.query.purchaseOrders.findFirst({
        where: eq(purchaseOrders.id, id),
        with: { vendor: true, items: { with: { product: true } } }
      })) as PurchaseOrderWithDetails;
    });
  }

  // Stats
  async getDashboardStats(): Promise<any> {
    const [productsCount] = await db.select({ count: sql<number>`count(*)` }).from(products);
    const [ordersCount] = await db.select({ count: sql<number>`count(*)` }).from(salesOrders).where(eq(salesOrders.status, 'draft'));
    
    // Low stock: quantity <= reorderPoint
    const [lowStock] = await db.select({ count: sql<number>`count(*)` })
      .from(products)
      .where(sql`stock_quantity <= reorder_point`);

    const recentSales = await db.query.salesOrders.findMany({
      limit: 5,
      orderBy: [desc(salesOrders.orderDate)],
      with: { customer: true }
    });

    return {
      totalProducts: Number(productsCount.count),
      pendingOrders: Number(ordersCount.count),
      lowStockCount: Number(lowStock.count),
      recentSales
    };
  }

  async getActivityReport(period: string): Promise<any> {
    let intervalDays: number;

    const formatMap: Record<string, { fmt: string; days: number }> = {
      'daily': { fmt: 'YYYY-MM-DD', days: 30 },
      '7day': { fmt: 'YYYY-MM-DD', days: 7 },
      '30day': { fmt: 'YYYY-MM-DD', days: 30 },
      'monthly': { fmt: 'YYYY-MM', days: 365 },
      'quarterly': { fmt: 'YYYY-"Q"Q', days: 730 },
      'yearly': { fmt: 'YYYY', days: 1825 },
    };
    const config = formatMap[period] || formatMap['30day'];
    intervalDays = config.days;
    const dateFormat = config.fmt;

    const buildQuery = (table: string) => {
      if (dateFormat === 'YYYY-MM-DD') {
        return `
          SELECT 
            to_char(order_date, 'YYYY-MM-DD') as period,
            COUNT(*)::int as order_count,
            COALESCE(SUM(CAST(total_amount AS numeric)), 0) as total_amount
          FROM ${table}
          WHERE order_date >= NOW() - INTERVAL '${intervalDays} days'
          GROUP BY to_char(order_date, 'YYYY-MM-DD')
          ORDER BY period ASC
        `;
      } else if (dateFormat === 'YYYY-MM') {
        return `
          SELECT 
            to_char(order_date, 'YYYY-MM') as period,
            COUNT(*)::int as order_count,
            COALESCE(SUM(CAST(total_amount AS numeric)), 0) as total_amount
          FROM ${table}
          WHERE order_date >= NOW() - INTERVAL '${intervalDays} days'
          GROUP BY to_char(order_date, 'YYYY-MM')
          ORDER BY period ASC
        `;
      } else if (dateFormat === 'YYYY-"Q"Q') {
        return `
          SELECT 
            to_char(order_date, 'YYYY-"Q"Q') as period,
            COUNT(*)::int as order_count,
            COALESCE(SUM(CAST(total_amount AS numeric)), 0) as total_amount
          FROM ${table}
          WHERE order_date >= NOW() - INTERVAL '${intervalDays} days'
          GROUP BY to_char(order_date, 'YYYY-"Q"Q')
          ORDER BY period ASC
        `;
      } else {
        return `
          SELECT 
            to_char(order_date, 'YYYY') as period,
            COUNT(*)::int as order_count,
            COALESCE(SUM(CAST(total_amount AS numeric)), 0) as total_amount
          FROM ${table}
          WHERE order_date >= NOW() - INTERVAL '${intervalDays} days'
          GROUP BY to_char(order_date, 'YYYY')
          ORDER BY period ASC
        `;
      }
    };

    const buildSummaryQuery = (table: string, amountAlias: string) => `
      SELECT 
        COUNT(*)::int as total_orders,
        COALESCE(SUM(CAST(total_amount AS numeric)), 0) as ${amountAlias}
      FROM ${table}
      WHERE order_date >= NOW() - INTERVAL '${intervalDays} days'
    `;

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
}

export const storage = new DatabaseStorage();
