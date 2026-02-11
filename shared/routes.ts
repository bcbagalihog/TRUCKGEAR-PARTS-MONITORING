import { z } from 'zod';
import { 
  insertProductSchema, insertCustomerSchema, insertVendorSchema, 
  insertSalesOrderSchema, insertPurchaseOrderSchema,
  products, customers, vendors, salesOrders, purchaseOrders,
  productOemNumbers, productCompatibility, salesOrderItems, purchaseOrderItems,
  inventoryTransactions
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

// Custom Inputs
const productWithRelationsSchema = insertProductSchema.extend({
  oemNumbers: z.array(z.string()).optional(),
  compatibility: z.array(z.object({
    make: z.string(),
    model: z.string(),
    yearStart: z.number().optional(),
    yearEnd: z.number().optional(),
  })).optional(),
});

const salesOrderWithItemsSchema = insertSalesOrderSchema.extend({
  items: z.array(z.object({
    productId: z.number().nullable().optional(),
    description: z.string().nullable().optional(),
    quantity: z.number(),
    unitPrice: z.number().or(z.string().transform(Number)),
  })),
});

const purchaseOrderWithItemsSchema = insertPurchaseOrderSchema.extend({
  items: z.array(z.object({
    productId: z.number().nullable().optional(),
    description: z.string().nullable().optional(),
    quantity: z.number(),
    unitCost: z.number().or(z.string().transform(Number)),
  })),
});

const updateStatusSchema = z.object({
  status: z.string(),
});

export const api = {
  products: {
    list: {
      method: 'GET' as const,
      path: '/api/products' as const,
      input: z.object({
        search: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.any()), // Using any to avoid huge type complexity in manifest, but implementation returns ProductWithDetails
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/products/:id' as const,
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/products' as const,
      input: productWithRelationsSchema,
      responses: {
        201: z.any(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/products/:id' as const,
      input: productWithRelationsSchema.partial(),
      responses: {
        200: z.any(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/products/:id' as const,
      responses: {
        200: z.object({ message: z.string() }),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
  },
  customers: {
    list: {
      method: 'GET' as const,
      path: '/api/customers' as const,
      responses: { 200: z.array(z.custom<typeof customers.$inferSelect>()) },
    },
    create: {
      method: 'POST' as const,
      path: '/api/customers' as const,
      input: insertCustomerSchema,
      responses: { 201: z.custom<typeof customers.$inferSelect>() },
    },
    get: {
      method: 'GET' as const,
      path: '/api/customers/:id' as const,
      responses: { 200: z.custom<typeof customers.$inferSelect>() },
    },
  },
  vendors: {
    list: {
      method: 'GET' as const,
      path: '/api/vendors' as const,
      responses: { 200: z.array(z.custom<typeof vendors.$inferSelect>()) },
    },
    create: {
      method: 'POST' as const,
      path: '/api/vendors' as const,
      input: insertVendorSchema,
      responses: { 201: z.custom<typeof vendors.$inferSelect>() },
    },
    get: {
      method: 'GET' as const,
      path: '/api/vendors/:id' as const,
      responses: { 200: z.custom<typeof vendors.$inferSelect>() },
    },
  },
  salesOrders: {
    list: {
      method: 'GET' as const,
      path: '/api/sales-orders' as const,
      responses: { 200: z.array(z.any()) },
    },
    get: {
      method: 'GET' as const,
      path: '/api/sales-orders/:id' as const,
      responses: { 200: z.any(), 404: errorSchemas.notFound },
    },
    create: {
      method: 'POST' as const,
      path: '/api/sales-orders' as const,
      input: salesOrderWithItemsSchema,
      responses: { 201: z.any() },
    },
    updateStatus: {
      method: 'PATCH' as const,
      path: '/api/sales-orders/:id/status' as const,
      input: updateStatusSchema,
      responses: { 200: z.any() },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/sales-orders/:id' as const,
      input: salesOrderWithItemsSchema,
      responses: { 200: z.any(), 404: errorSchemas.notFound },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/sales-orders/:id' as const,
      responses: { 200: z.object({ message: z.string() }), 404: errorSchemas.notFound },
    },
  },
  purchaseOrders: {
    list: {
      method: 'GET' as const,
      path: '/api/purchase-orders' as const,
      responses: { 200: z.array(z.any()) },
    },
    get: {
      method: 'GET' as const,
      path: '/api/purchase-orders/:id' as const,
      responses: { 200: z.any(), 404: errorSchemas.notFound },
    },
    create: {
      method: 'POST' as const,
      path: '/api/purchase-orders' as const,
      input: purchaseOrderWithItemsSchema,
      responses: { 201: z.any() },
    },
    updateStatus: {
      method: 'PATCH' as const,
      path: '/api/purchase-orders/:id/status' as const,
      input: updateStatusSchema,
      responses: { 200: z.any() },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/purchase-orders/:id' as const,
      input: purchaseOrderWithItemsSchema,
      responses: { 200: z.any(), 404: errorSchemas.notFound },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/purchase-orders/:id' as const,
      responses: { 200: z.object({ message: z.string() }), 404: errorSchemas.notFound },
    },
  },
  stats: {
    dashboard: {
      method: 'GET' as const,
      path: '/api/stats/dashboard' as const,
      responses: {
        200: z.object({
          lowStockCount: z.number(),
          totalProducts: z.number(),
          pendingOrders: z.number(),
          recentSales: z.array(z.any()),
        }),
      },
    },
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
