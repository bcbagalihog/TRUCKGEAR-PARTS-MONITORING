import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup Auth
  await setupAuth(app);
  registerAuthRoutes(app);

  // Protect all API routes
  // app.use("/api", isAuthenticated); // Uncomment if strict auth required for everything

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
