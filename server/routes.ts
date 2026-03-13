import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import multer from "multer";
import path from "path";
import express from "express";
import fs from "fs";
import Shopify from "shopify-api-node";
import { db } from "./db";
import { eq, and, desc, ilike, inArray } from "drizzle-orm";
import { salesInvoices, salesInvoiceItems, drawerSessions } from "@shared/schema";

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, `product-${uniqueSuffix}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  app.use("/uploads", express.static(uploadsDir));

  // --- Image Upload ---
  app.post("/api/upload", upload.single("image"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }
    const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedMimes.includes(req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Only image files (JPG, PNG, GIF, WEBP) are allowed" });
    }
    res.json({ imageUrl: `/uploads/${req.file.filename}` });
  });

  // --- Products ---
  app.get(api.products.list.path, async (req, res) => {
    const products = await storage.getProducts(req.query.search as string);
    res.json(products);
  });

  app.get(api.products.get.path, async (req, res) => {
    const product = await storage.getProduct(Number(req.params.id));
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  });

  app.post(api.products.create.path, async (req, res) => {
    try {
      const { oemNumbers, compatibility, ...productData } = api.products.create.input.parse(req.body);
      const product = await storage.createProduct(productData, oemNumbers, compatibility);
      res.status(201).json(product);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json(e.errors);
      throw e;
    }
  });

  app.put(api.products.update.path, async (req, res) => {
    try {
      const { oemNumbers, compatibility, ...productData } = api.products.update.input.parse(req.body);
      const product = await storage.updateProduct(Number(req.params.id), productData, oemNumbers, compatibility);
      res.json(product);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json(e.errors);
      throw e;
    }
  });

  app.delete(api.products.delete.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const product = await storage.getProduct(id);
      if (!product) return res.status(404).json({ message: "Product not found" });
      await storage.deleteProduct(id);
      res.json({ message: "Product deleted" });
    } catch (e: any) {
      if (e.code === '23503') {
        return res.status(400).json({ message: "Cannot delete product that is used in existing orders." });
      }
      throw e;
    }
  });

  // --- Customers ---
  app.get(api.customers.list.path, async (req, res) => {
    const customers = await storage.getCustomers();
    res.json(customers);
  });

  app.post(api.customers.create.path, async (req, res) => {
    const customer = await storage.createCustomer(req.body);
    res.status(201).json(customer);
  });

  // --- Vendors ---
  app.get(api.vendors.list.path, async (req, res) => {
    const vendors = await storage.getVendors();
    res.json(vendors);
  });

  app.post(api.vendors.create.path, async (req, res) => {
    const vendor = await storage.createVendor(req.body);
    res.status(201).json(vendor);
  });

  // --- Sales Orders ---
  app.get(api.salesOrders.list.path, async (req, res) => {
    const orders = await storage.getSalesOrders();
    res.json(orders);
  });

  app.get(api.salesOrders.get.path, async (req, res) => {
    const order = await storage.getSalesOrder(Number(req.params.id));
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  });

  app.post(api.salesOrders.create.path, async (req, res) => {
    const { items, ...orderData } = api.salesOrders.create.input.parse(req.body);
    const order = await storage.createSalesOrder(orderData, items);
    res.status(201).json(order);
  });

  app.patch(api.salesOrders.updateStatus.path, async (req, res) => {
    const { status } = req.body;
    const order = await storage.updateSalesOrderStatus(Number(req.params.id), status);
    res.json(order);
  });

  app.put(api.salesOrders.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const existing = await storage.getSalesOrder(id);
      if (!existing) return res.status(404).json({ message: "Order not found" });
      if (existing.status === 'invoiced') return res.status(400).json({ message: "Cannot edit an invoiced order" });
      const { items, ...orderData } = api.salesOrders.update.input.parse(req.body);
      const order = await storage.updateSalesOrder(id, orderData, items);
      res.json(order);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json(e.errors);
      throw e;
    }
  });

  app.delete(api.salesOrders.delete.path, async (req, res) => {
    const id = Number(req.params.id);
    const existing = await storage.getSalesOrder(id);
    if (!existing) return res.status(404).json({ message: "Order not found" });
    if (existing.status === 'invoiced') return res.status(400).json({ message: "Cannot delete an invoiced order" });
    await storage.deleteSalesOrder(id);
    res.json({ message: "Order deleted" });
  });

  // --- Purchase Orders ---
  app.get(api.purchaseOrders.list.path, async (req, res) => {
    const orders = await storage.getPurchaseOrders();
    res.json(orders);
  });

  app.get(api.purchaseOrders.get.path, async (req, res) => {
    const order = await storage.getPurchaseOrder(Number(req.params.id));
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  });

  app.post(api.purchaseOrders.create.path, async (req, res) => {
    const { items, ...orderData } = api.purchaseOrders.create.input.parse(req.body);
    const order = await storage.createPurchaseOrder(orderData, items);
    res.status(201).json(order);
  });

  app.patch(api.purchaseOrders.updateStatus.path, async (req, res) => {
    const { status } = req.body;
    const order = await storage.updatePurchaseOrderStatus(Number(req.params.id), status);
    res.json(order);
  });

  app.put(api.purchaseOrders.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const existing = await storage.getPurchaseOrder(id);
      if (!existing) return res.status(404).json({ message: "Order not found" });
      if (existing.status === 'received') return res.status(400).json({ message: "Cannot edit a received order" });
      const { items, ...orderData } = api.purchaseOrders.update.input.parse(req.body);
      const order = await storage.updatePurchaseOrder(id, orderData, items);
      res.json(order);
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json(e.errors);
      throw e;
    }
  });

  app.delete(api.purchaseOrders.delete.path, async (req, res) => {
    const id = Number(req.params.id);
    const existing = await storage.getPurchaseOrder(id);
    if (!existing) return res.status(404).json({ message: "Order not found" });
    if (existing.status === 'received') return res.status(400).json({ message: "Cannot delete a received order" });
    await storage.deletePurchaseOrder(id);
    res.json({ message: "Order deleted" });
  });

  // --- Stats & Reports ---
  app.get(api.stats.dashboard.path, async (req, res) => {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  });

  app.get("/api/reports/activity", async (req, res) => {
    const period = (req.query.period as string) || 'daily';
    const report = await storage.getActivityReport(period);
    res.json(report);
  });

  // --- POS: Drawer Management ---
  app.get("/api/pos/drawer-status", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const session = await storage.getActiveDrawerSession(userId);
      res.json({ active: !!session, session: session || null });
    } catch (e) {
      console.error("drawer-status error:", e);
      res.status(500).json({ active: false });
    }
  });

  app.post("/api/pos/drawer-open", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const session = await storage.createDrawerSession({
        userId,
        openingBalance: String(req.body.openingBalance ?? 0),
        status: "OPEN",
        companyId: 1,
      });
      res.json(session);
    } catch (e) {
      console.error("drawer-open error:", e);
      res.status(500).json({ message: "Failed to open drawer" });
    }
  });

  app.post("/api/pos/drawer-close", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const session = await storage.getActiveDrawerSession(userId);
      if (!session) return res.status(404).json({ message: "No active drawer session" });
      await storage.closeDrawerSession(session.id, String(req.body.closingBalance ?? 0));
      res.json({ message: "Drawer closed" });
    } catch (e) {
      console.error("drawer-close error:", e);
      res.status(500).json({ message: "Failed to close drawer" });
    }
  });

  // --- Accounts Payable ---
  app.get("/api/accounts-payable", isAuthenticated, async (req, res) => {
    const { vendorName, status } = req.query as { vendorName?: string; status?: string };
    const bills = await storage.getAccountsPayable(vendorName, status);
    res.json(bills);
  });

  app.post("/api/accounts-payable", isAuthenticated, async (req, res) => {
    try {
      const bill = await storage.createAccountsPayable({
        ...req.body,
        status: req.body.status || "PENDING_COUNTER",
      });
      res.status(201).json(bill);
    } catch (e) {
      console.error("accounts-payable create error:", e);
      res.status(500).json({ message: "Failed to create bill" });
    }
  });

  app.put("/api/accounts-payable/:id", isAuthenticated, async (req, res) => {
    try {
      const bill = await storage.updateAccountsPayable(Number(req.params.id), req.body);
      res.json(bill);
    } catch (e) {
      console.error("accounts-payable update error:", e);
      res.status(500).json({ message: "Failed to update bill" });
    }
  });

  app.post("/api/accounts-payable/:id/receive", isAuthenticated, async (req, res) => {
    try {
      const bill = await storage.receiveAccountsPayable(Number(req.params.id), req.body.vendorDrNumber || "");
      res.json(bill);
    } catch (e) {
      console.error("accounts-payable receive error:", e);
      res.status(500).json({ message: "Failed to mark as received" });
    }
  });

  // --- Counter Receipts ---
  app.get("/api/counter-receipts", isAuthenticated, async (req, res) => {
    try {
      const receipts = await storage.getCounterReceipts();
      res.json(receipts);
    } catch (e) {
      console.error("counter-receipts list error:", e);
      res.status(500).json({ message: "Failed to fetch counter receipts" });
    }
  });

  app.get("/api/counter-receipts/:id", isAuthenticated, async (req, res) => {
    try {
      const receipt = await storage.getCounterReceiptById(Number(req.params.id));
      if (!receipt) return res.status(404).json({ message: "Not found" });
      res.json(receipt);
    } catch (e) {
      res.status(500).json({ message: "Failed to fetch counter receipt" });
    }
  });

  app.post("/api/counter-receipts", isAuthenticated, async (req, res) => {
    try {
      const { receipt, checks, apInvoiceIds } = req.body as {
        receipt: any;
        checks: any[];
        apInvoiceIds: number[];
      };
      const created = await storage.createCounterReceipt(
        { ...receipt, companyId: 1 },
        checks
      );
      if (apInvoiceIds && apInvoiceIds.length > 0) {
        await storage.bulkMarkCountered(apInvoiceIds, created.id);
      }
      res.status(201).json(created);
    } catch (e) {
      console.error("counter-receipts create error:", e);
      res.status(500).json({ message: "Failed to create counter receipt" });
    }
  });

  // --- Admin: User Management ---
  app.get("/api/admin/users", isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (e) {
      console.error("admin users error:", e);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/admin/users", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.createAdminUser(req.body);
      res.status(201).json(user);
    } catch (e: any) {
      console.error("admin create user error:", e);
      if (e.code === '23505') return res.status(400).json({ message: "Username already taken" });
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch("/api/admin/users/:id/toggle-status", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.toggleUserStatus(req.params.id, req.body.isActive);
      res.json(user);
    } catch (e) {
      console.error("admin toggle status error:", e);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  // --- Sales Invoices List (for Billing Collection & Check Summary) ---
  app.get("/api/sales-invoices", isAuthenticated, async (req, res) => {
    try {
      const { status, paymentMethod, registeredName } = req.query as Record<string, string>;
      const conditions: any[] = [];
      if (status) conditions.push(eq(salesInvoices.status, status));
      if (paymentMethod) conditions.push(eq(salesInvoices.paymentMethod, paymentMethod));
      if (registeredName) conditions.push(ilike(salesInvoices.registeredName, `%${registeredName}%`));
      let q = db.select().from(salesInvoices).$dynamic();
      if (conditions.length === 1) q = q.where(conditions[0]);
      else if (conditions.length > 1) q = q.where(and(...conditions));
      const invoices = await q.orderBy(desc(salesInvoices.date));
      res.json(invoices);
    } catch (err) {
      console.error("sales-invoices list error:", err);
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  // --- Bulk update sales invoice status (e.g. mark as BILLED) ---
  app.patch("/api/sales-invoices/bulk-status", isAuthenticated, async (req, res) => {
    try {
      const { ids, status } = req.body as { ids: number[]; status: string };
      if (!ids?.length) return res.json({ updated: 0 });
      await db.update(salesInvoices).set({ status }).where(inArray(salesInvoices.id, ids));
      res.json({ updated: ids.length });
    } catch (err) {
      console.error("bulk-status error:", err);
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  // --- POS: VAT Invoices ---
  app.post("/api/vat-invoices", isAuthenticated, async (req, res) => {
    try {
      const { invoice, items } = req.body;
      const method = (invoice.paymentMethod || "CASH").toUpperCase();
      const isNet = method === "NET_DAYS";
      const [newInv] = await db
        .insert(salesInvoices)
        .values({
          invoiceNumber: invoice.invoiceNo,
          registeredName: invoice.customer?.name || "Walk-in Customer",
          tin: invoice.customer?.tin || "",
          businessAddress: invoice.customer?.address || "",
          "totalAmount_Due": String(invoice.totalAmountDue ?? invoice.totalAmount_Due ?? 0),
          vatableSales: invoice.vatableSales ? String(invoice.vatableSales) : null,
          vatAmount: invoice.vatAmount ? String(invoice.vatAmount) : null,
          withholdingTax: invoice.withholdingTax ? String(invoice.withholdingTax) : null,
          drawerSessionId: invoice.drawerSessionId || null,
          paymentMethod: method,
          status: isNet ? "UNPAID" : "PAID",
          // GCash
          gcashRef: method === "GCASH" ? (invoice.gcashRef || null) : null,
          // Check
          checkBankName: method === "CHECK" ? (invoice.checkBankName || null) : null,
          checkNumber: method === "CHECK" ? (invoice.checkNumber || null) : null,
          checkMaturityDate: method === "CHECK" ? (invoice.checkMaturityDate || null) : null,
          // NET Days
          netDays: isNet ? (invoice.netDays || null) : null,
          poNumber: isNet ? (invoice.poNumber || null) : null,
          companyId: 1,
        })
        .returning();

      if (items && items.length > 0) {
        await db.insert(salesInvoiceItems).values(
          items.map((item: any) => ({
            salesInvoiceId: newInv.id,
            itemDescription: item.description || item.name,
            quantity: Number(item.qty ?? item.quantity ?? 1),
            unitPrice: String(item.price ?? item.unitPrice ?? 0),
            amount: String((Number(item.qty ?? item.quantity ?? 1)) * Number(item.price ?? item.unitPrice ?? 0)),
          }))
        );
      }

      res.json({ success: true, invoiceId: newInv.id, invoiceNumber: newInv.invoiceNumber });
    } catch (err) {
      console.error("vat-invoices error:", err);
      res.status(500).json({ error: "Failed to create invoice" });
    }
  });

  // --- Shopify Integration ---
  function getShopifyClient(): Shopify | null {
    const storeUrl = process.env.SHOPIFY_STORE_URL;
    const apiKey = process.env.SHOPIFY_API_KEY;
    if (!storeUrl || !apiKey) return null;
    return new Shopify({
      shopName: storeUrl.replace('.myshopify.com', ''),
      accessToken: apiKey,
      apiVersion: '2024-01',
      autoLimit: true,
    });
  }

  app.get("/api/shopify/status", isAuthenticated, async (req, res) => {
    const shopify = getShopifyClient();
    if (!shopify) return res.json({ connected: false, message: "Shopify credentials not configured" });
    try {
      const shop = await shopify.shop.get();
      res.json({ connected: true, shop: { name: shop.name, domain: shop.domain, email: shop.email, currency: shop.currency, plan: shop.plan_name } });
    } catch (e: any) {
      res.json({ connected: false, message: e.message || "Failed to connect to Shopify" });
    }
  });

  app.get("/api/shopify/products", isAuthenticated, async (req, res) => {
    const shopify = getShopifyClient();
    if (!shopify) return res.status(400).json({ message: "Shopify not configured" });
    try {
      const products = await shopify.product.list({ limit: 250 });
      res.json(products);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to fetch Shopify products" });
    }
  });

  app.post("/api/shopify/import-products", isAuthenticated, async (req, res) => {
    const shopify = getShopifyClient();
    if (!shopify) return res.status(400).json({ message: "Shopify not configured" });
    try {
      const shopifyProducts = await shopify.product.list({ limit: 250 });
      let imported = 0, skipped = 0;
      const errors: string[] = [];
      for (const sp of shopifyProducts) {
        const variant = sp.variants?.[0];
        const sku = variant?.sku || `SHOPIFY-${sp.id}`;
        try {
          const existing = await storage.getProductBySku(sku);
          if (existing) { skipped++; continue; }
          await storage.createProduct({
            sku, name: sp.title,
            category: sp.product_type || "Imported",
            brand: sp.vendor || null,
            costPrice: String(variant?.compare_at_price || variant?.price || "0"),
            sellingPrice: String(variant?.price || "0"),
            stockQuantity: variant?.inventory_quantity ?? 0,
            reorderPoint: 5,
            imageUrl: sp.image?.src || null,
          }, [], []);
          imported++;
        } catch (e: any) {
          errors.push(`${sp.title}: ${e.message}`);
        }
      }
      res.json({ imported, skipped, errors, total: shopifyProducts.length });
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to import products" });
    }
  });

  app.post("/api/shopify/export-products", isAuthenticated, async (req, res) => {
    const shopify = getShopifyClient();
    if (!shopify) return res.status(400).json({ message: "Shopify not configured" });
    try {
      const localProducts = await storage.getProducts();
      let exported = 0, skipped = 0;
      const errors: string[] = [];
      for (const lp of localProducts) {
        try {
          const existing = await shopify.product.list({ limit: 1, title: lp.name });
          if (existing.length > 0) { skipped++; continue; }
          await shopify.product.create({
            title: lp.name, product_type: lp.category, vendor: lp.brand || undefined,
            variants: [{ sku: lp.sku, price: String(lp.sellingPrice), compare_at_price: String(lp.costPrice), inventory_management: "shopify", inventory_quantity: lp.stockQuantity }],
          });
          exported++;
        } catch (e: any) {
          errors.push(`${lp.name}: ${e.message}`);
        }
      }
      res.json({ exported, skipped, errors, total: localProducts.length });
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to export products" });
    }
  });

  app.post("/api/shopify/sync-inventory", isAuthenticated, async (req, res) => {
    const shopify = getShopifyClient();
    if (!shopify) return res.status(400).json({ message: "Shopify not configured" });
    try {
      const shopifyProducts = await shopify.product.list({ limit: 250 });
      const localProducts = await storage.getProducts();
      let synced = 0;
      const details: any[] = [];
      for (const sp of shopifyProducts) {
        const variant = sp.variants?.[0];
        if (!variant?.sku) continue;
        const local = localProducts.find((p: any) => p.sku === variant.sku);
        if (!local) continue;
        details.push({ sku: variant.sku, name: sp.title, shopifyQty: variant.inventory_quantity ?? 0, localQty: local.stockQuantity, status: (variant.inventory_quantity ?? 0) === local.stockQuantity ? "in_sync" : "out_of_sync" });
        synced++;
      }
      res.json({ synced, details });
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to sync inventory" });
    }
  });

  app.get("/api/shopify/orders", isAuthenticated, async (req, res) => {
    const shopify = getShopifyClient();
    if (!shopify) return res.status(400).json({ message: "Shopify not configured" });
    try {
      const orders = await shopify.order.list({ limit: 50, status: "any" });
      res.json(orders);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to fetch Shopify orders" });
    }
  });

  return httpServer;
}
