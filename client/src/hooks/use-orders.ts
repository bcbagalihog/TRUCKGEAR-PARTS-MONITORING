import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

type SalesOrderInput = z.infer<typeof api.salesOrders.create.input>;
type PurchaseOrderInput = z.infer<typeof api.purchaseOrders.create.input>;

// === SALES ORDERS ===

export function useSalesOrders() {
  return useQuery({
    queryKey: [api.salesOrders.list.path],
    queryFn: async () => {
      const res = await fetch(api.salesOrders.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sales orders");
      return await res.json();
    },
  });
}

export function useSalesOrder(id: number) {
  return useQuery({
    queryKey: [api.salesOrders.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.salesOrders.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch order");
      return await res.json();
    },
    enabled: !!id,
  });
}

export function useCreateSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: SalesOrderInput) => {
      const res = await fetch(api.salesOrders.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create order");
      return await res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.salesOrders.list.path] }),
  });
}

export function useUpdateSalesStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const url = buildUrl(api.salesOrders.updateStatus.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update status");
      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.salesOrders.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.salesOrders.get.path, variables.id] });
    },
  });
}

export function useUpdateSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: SalesOrderInput }) => {
      const url = buildUrl(api.salesOrders.update.path, { id });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update order");
      }
      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.salesOrders.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.salesOrders.get.path, variables.id] });
    },
  });
}

export function useDeleteSalesOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.salesOrders.delete.path, { id });
      const res = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete order");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.salesOrders.list.path] });
    },
  });
}

// === PURCHASE ORDERS ===

export function usePurchaseOrders() {
  return useQuery({
    queryKey: [api.purchaseOrders.list.path],
    queryFn: async () => {
      const res = await fetch(api.purchaseOrders.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch purchase orders");
      return await res.json();
    },
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: PurchaseOrderInput) => {
      const res = await fetch(api.purchaseOrders.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create order");
      return await res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.purchaseOrders.list.path] }),
  });
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: PurchaseOrderInput }) => {
      const url = buildUrl(api.purchaseOrders.update.path, { id });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update order");
      }
      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.purchaseOrders.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.purchaseOrders.get.path, variables.id] });
    },
  });
}

export function useDeletePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.purchaseOrders.delete.path, { id });
      const res = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete order");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.purchaseOrders.list.path] });
    },
  });
}

export function useUpdatePurchaseStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const url = buildUrl(api.purchaseOrders.updateStatus.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update status");
      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.purchaseOrders.list.path] });
    },
  });
}
