import { useState } from "react";
import { Layout } from "@/components/Layout";
import { usePurchaseOrders, useCreatePurchaseOrder, useUpdatePurchaseStatus } from "@/hooks/use-orders";
import { useVendors } from "@/hooks/use-parties";
import { useProducts } from "@/hooks/use-products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search, Plus, Loader2, Trash2 } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const purchaseItemSchema = z.object({
  productId: z.coerce.number().min(1, "Product is required"),
  quantity: z.coerce.number().min(1, "Qty > 0"),
  unitCost: z.coerce.number(),
});

const purchaseOrderSchema = z.object({
  vendorId: z.coerce.number().min(1, "Vendor is required"),
  status: z.string(),
  items: z.array(purchaseItemSchema).min(1, "Add at least one item"),
});

type PurchaseOrderFormValues = z.infer<typeof purchaseOrderSchema>;

export default function Purchases() {
  const { data: orders, isLoading } = usePurchaseOrders();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const updateStatus = useUpdatePurchaseStatus();
  const { toast } = useToast();

  const handleStatusChange = (id: number, newStatus: string) => {
    updateStatus.mutate({ id, status: newStatus }, {
      onSuccess: () => toast({ title: "Updated", description: "Order status updated" }),
      onError: () => toast({ title: "Error", description: "Failed to update status", variant: "destructive" })
    });
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Purchase Orders</h1>
          <p className="text-muted-foreground mt-1">Manage vendor orders and receiving.</p>
        </div>
        <div className="flex items-center gap-2">
          <CreatePurchaseDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>PO ID</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : orders?.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No orders found.</TableCell></TableRow>
            ) : (
              orders?.map((order: any) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono">#{order.id}</TableCell>
                  <TableCell>{order.vendor?.name || 'Unknown'}</TableCell>
                  <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                  <TableCell><StatusBadge status={order.status} /></TableCell>
                  <TableCell className="text-right font-bold">${Number(order.totalAmount).toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Select defaultValue={order.status} onValueChange={(val) => handleStatusChange(order.id, val)}>
                      <SelectTrigger className="h-8 w-[110px] ml-auto">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="ordered">Ordered</SelectItem>
                        <SelectItem value="received">Received</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Layout>
  );
}

function CreatePurchaseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const createOrder = useCreatePurchaseOrder();
  const { data: vendors } = useVendors();
  const { data: products } = useProducts();

  const form = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: {
      status: "draft",
      items: [{ productId: 0, quantity: 1, unitCost: 0 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const handleProductSelect = (index: number, productIdStr: string) => {
    const pid = Number(productIdStr);
    const product = products?.find((p: any) => p.id === pid);
    if (product) {
      form.setValue(`items.${index}.unitCost`, Number(product.costPrice));
    }
  };

  const onSubmit = (values: PurchaseOrderFormValues) => {
    createOrder.mutate(values, {
      onSuccess: () => {
        toast({ title: "Success", description: "PO created successfully" });
        onOpenChange(false);
        form.reset();
      },
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  const total = form.watch("items").reduce((acc, item) => acc + (item.quantity * item.unitCost), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-lg shadow-primary/20"><Plus className="h-4 w-4" /> New PO</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create Purchase Order</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vendorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Vendor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vendors?.map((v: any) => (
                          <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="ordered">Ordered</SelectItem>
                        <SelectItem value="received">Received</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Order Items</h3>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ productId: 0, quantity: 1, unitCost: 0 })}>
                  Add Item
                </Button>
              </div>
              
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-4 items-end bg-muted/30 p-3 rounded-lg">
                  <FormField
                    control={form.control}
                    name={`items.${index}.productId`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="text-xs">Product</FormLabel>
                        <Select onValueChange={(val) => { field.onChange(val); handleProductSelect(index, val); }} defaultValue={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Select Product" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {products?.map((p: any) => (
                              <SelectItem key={p.id} value={p.id.toString()}>{p.sku} - {p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem className="w-20">
                        <FormLabel className="text-xs">Qty</FormLabel>
                        <FormControl><Input type="number" className="h-8" {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.unitCost`}
                    render={({ field }) => (
                      <FormItem className="w-24">
                        <FormLabel className="text-xs">Cost</FormLabel>
                        <FormControl><Input type="number" className="h-8" {...field} /></FormControl>
                      </FormItem>
                    )}
                  />
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end items-center gap-4 pt-4 border-t">
              <div className="text-right">
                <span className="text-muted-foreground text-sm mr-2">Total:</span>
                <span className="text-xl font-bold">${total.toFixed(2)}</span>
              </div>
              <Button type="submit" disabled={createOrder.isPending}>
                {createOrder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create PO
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
