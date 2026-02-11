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
  // Setup Auth
  await setupAuth(app);
  registerAuthRoutes(app);

  app.use("/uploads", express.static(uploadsDir));

  app.post("/api/upload", upload.single("image"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }
    const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedMimes.includes(req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Only image files (JPG, PNG, GIF, WEBP) are allowed" });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
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
        return res.status(400).json({ message: "Cannot delete product that is used in existing orders. Remove it from all orders first." });
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
    try {
      const id = Number(req.params.id);
      const existing = await storage.getSalesOrder(id);
      if (!existing) return res.status(404).json({ message: "Order not found" });
      if (existing.status === 'invoiced') return res.status(400).json({ message: "Cannot delete an invoiced order" });
      await storage.deleteSalesOrder(id);
      res.json({ message: "Order deleted" });
    } catch (e: any) {
      throw e;
    }
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
    try {
      const id = Number(req.params.id);
      const existing = await storage.getPurchaseOrder(id);
      if (!existing) return res.status(404).json({ message: "Order not found" });
      if (existing.status === 'received') return res.status(400).json({ message: "Cannot delete a received order" });
      await storage.deletePurchaseOrder(id);
      res.json({ message: "Order deleted" });
    } catch (e: any) {
      throw e;
    }
  });

  // --- Stats ---
  app.get(api.stats.dashboard.path, async (req, res) => {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  });

  // --- Activity Report ---
  app.get("/api/reports/activity", async (req, res) => {
    const period = (req.query.period as string) || 'daily';
    const report = await storage.getActivityReport(period);
    res.json(report);
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
    if (!shopify) {
      return res.json({ connected: false, message: "Shopify credentials not configured" });
    }
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
      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const sp of shopifyProducts) {
        const variant = sp.variants?.[0];
        const sku = variant?.sku || `SHOPIFY-${sp.id}`;
        try {
          const existing = await storage.getProductBySku(sku);
          if (existing) {
            skipped++;
            continue;
          }
          await storage.createProduct({
            sku,
            name: sp.title,
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
      let exported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const lp of localProducts) {
        try {
          const shopifyProducts = await shopify.product.list({ limit: 1, title: lp.name });
          if (shopifyProducts.length > 0) {
            skipped++;
            continue;
          }
          await shopify.product.create({
            title: lp.name,
            product_type: lp.category,
            vendor: lp.brand || undefined,
            variants: [{
              sku: lp.sku,
              price: String(lp.sellingPrice),
              compare_at_price: String(lp.costPrice),
              inventory_management: "shopify",
              inventory_quantity: lp.stockQuantity,
            }],
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
        if (!variant) continue;
        const sku = variant.sku;
        if (!sku) continue;
        const local = localProducts.find((p: any) => p.sku === sku);
        if (!local) continue;

        const shopifyQty = variant.inventory_quantity ?? 0;
        const localQty = local.stockQuantity;
        details.push({
          sku,
          name: sp.title,
          shopifyQty,
          localQty,
          status: shopifyQty === localQty ? "in_sync" : "out_of_sync",
        });
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

  // Seed data (simple check)
  if (process.env.NODE_ENV !== 'production') {
    const products = await storage.getProducts();
    if (products.length === 0) {
      console.log('Seeding database...');
      const p1 = await storage.createProduct({
        sku: 'OIL-FILTER-001',
        name: 'Premium Oil Filter',
        category: 'Maintenance',
        brand: 'Bosch',
        costPrice: "5.00",
        sellingPrice: "12.99",
        stockQuantity: 50,
        reorderPoint: 10
      }, ['OEM-12345', 'OEM-98765'], [{ make: 'Toyota', model: 'Corolla', yearStart: 2010, yearEnd: 2020 }]);
      
      const p2 = await storage.createProduct({
        sku: 'BRAKE-PAD-F-002',
        name: 'Front Brake Pads',
        category: 'Brakes',
        brand: 'Brembo',
        costPrice: "25.00",
        sellingPrice: "55.00",
        stockQuantity: 8,
        reorderPoint: 15
      }, ['OEM-BRK-111'], [{ make: 'Honda', model: 'Civic', yearStart: 2015, yearEnd: 2022 }]);

      const c1 = await storage.createCustomer({
        name: 'John Doe Auto Shop',
        email: 'john@autoshop.com',
        phone: '555-0101',
        address: '123 Main St'
      });

      const v1 = await storage.createVendor({
        name: 'AutoParts Wholesale Inc',
        email: 'sales@autoparts.inc',
        phone: '555-0202',
        address: '456 Supply Rd',
        leadTimeDays: 3
      });
      
      console.log('Database seeded.');
    }
  }

  return httpServer;
}
