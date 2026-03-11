import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  setupAuth,
  registerAuthRoutes,
  isAuthenticated,
} from "./replit_integrations/auth";
import express from "express";
import path from "path";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import {
  salesInvoices,
  salesInvoiceItems,
  drawerSessions,
} from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // --- DRAWER STATUS (SYNCED FOR V3) ---
  app.get("/api/pos/drawer-status", isAuthenticated, async (req, res) => {
    try {
      const [session] = await db
        .select()
        .from(drawerSessions)
        .where(
          and(
            eq(drawerSessions.userId, req.user!.id),
            eq(drawerSessions.status, "OPEN"),
          ),
        )
        .orderBy(desc(drawerSessions.startTime))
        .limit(1);
      res.json({ active: !!session, session: session || null });
    } catch (e) {
      res.status(500).json({ active: false });
    }
  });

  app.post("/api/pos/drawer-open", isAuthenticated, async (req, res) => {
    try {
      const [newSession] = await db
        .insert(drawerSessions)
        .values({
          userId: req.user!.id,
          openingBalance: req.body.openingBalance.toString(),
          status: "OPEN",
          companyId: 1,
        })
        .returning();
      res.json(newSession);
    } catch (e) {
      res.status(500).json({ message: "Failed" });
    }
  });

  app.get("/api/products", isAuthenticated, async (req, res) => {
    const products = await storage.getProducts(req.query.search as string);
    res.json(products);
  });

  // --- FINALIZE INVOICE (SUPPORTS GCASH/BANK) ---
  app.post("/api/vat-invoices", isAuthenticated, async (req, res) => {
    try {
      const { invoice, items } = req.body;
      const [newInv] = await db
        .insert(salesInvoices)
        .values({
          invoiceNumber: invoice.invoiceNo,
          registeredName: invoice.customer.name,
          tin: invoice.customer.tin || "",
          totalAmountDue: invoice.totalAmountDue.toString(),
          drawerSessionId: invoice.drawerSessionId,
          paymentMethod: invoice.paymentMethod || "CASH", // Supports GCASH/BANK
          companyId: 1,
        })
        .returning();

      const itemsToInsert = items.map((item: any) => ({
        salesInvoiceId: newInv.id,
        itemDescription: item.description,
        quantity: item.qty,
        unitPrice: item.price.toString(),
        amount: (item.qty * item.price).toString(),
      }));
      await db.insert(salesInvoiceItems).values(itemsToInsert);
      res.json({ success: true, invoiceId: newInv.id });
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  });

  return httpServer;
}
