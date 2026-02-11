import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useSalesOrders, useCreateSalesOrder, useUpdateSalesStatus } from "@/hooks/use-orders";
import { useCustomers } from "@/hooks/use-parties";
import { useProducts } from "@/hooks/use-products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search, Plus, Loader2, Trash2, Package, FileText } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { z } from "zod";

const orderItemSchema = z.object({
  isCustom: z.boolean().default(false),
  productId: z.coerce.number().nullable().optional(),
  description: z.string().nullable().optional(),
  quantity: z.coerce.number().min(1, "Qty > 0"),
  unitPrice: z.coerce.number(),
});

const salesOrderSchema = z.object({
  customerId: z.coerce.number().min(1, "Customer is required"),
  status: z.string(),
  items: z.array(orderItemSchema).min(1, "Add at least one item"),
});

type SalesOrderFormValues = z.infer<typeof salesOrderSchema>;

export default function Sales() {
  const { data: orders, isLoading } = useSalesOrders();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const updateStatus = useUpdateSalesStatus();
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
          <h1 className="text-3xl font-display font-bold text-foreground">Sales Orders</h1>
          <p className="text-muted-foreground mt-1">Manage customer orders and invoicing.</p>
        </div>
        <div className="flex items-center gap-2">
          <CreateOrderDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Customer</TableHead>
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
                  <TableCell>{order.customer?.name || 'Unknown'}</TableCell>
                  <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                  <TableCell><StatusBadge status={order.status} /></TableCell>
                  <TableCell className="text-right font-bold">${Number(order.totalAmount).toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Select defaultValue={order.status} onValueChange={(val) => handleStatusChange(order.id, val)}>
                      <SelectTrigger data-testid={`select-status-${order.id}`} className="h-8 w-[110px] ml-auto">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="invoiced">Invoiced</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
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

function CreateOrderDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const createOrder = useCreateSalesOrder();
  const { data: customers } = useCustomers();
  const { data: products } = useProducts();

  const form = useForm<SalesOrderFormValues>({
    resolver: zodResolver(salesOrderSchema),
    defaultValues: {
      status: "draft",
      items: [{ isCustom: false, productId: null, description: "", quantity: 1, unitPrice: 0 }]
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
      form.setValue(`items.${index}.unitPrice`, Number(product.sellingPrice));
    }
  };

  const toggleCustomItem = (index: number, isCustom: boolean) => {
    form.setValue(`items.${index}.isCustom`, isCustom);
    if (isCustom) {
      form.setValue(`items.${index}.productId`, null);
      form.setValue(`items.${index}.description`, "");
    } else {
      form.setValue(`items.${index}.description`, null);
      form.setValue(`items.${index}.productId`, null);
    }
    form.setValue(`items.${index}.unitPrice`, 0);
  };

  const onSubmit = (values: SalesOrderFormValues) => {
    const payload = {
      customerId: values.customerId,
      status: values.status,
      items: values.items.map(item => ({
        productId: item.isCustom ? null : (item.productId || null),
        description: item.isCustom ? item.description : null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    };
    createOrder.mutate(payload as any, {
      onSuccess: () => {
        toast({ title: "Success", description: "Order created successfully" });
        onOpenChange(false);
        form.reset();
      },
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  const watchedItems = form.watch("items");
  const total = watchedItems.reduce((acc, item) => acc + ((item.quantity || 0) * (item.unitPrice || 0)), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button data-testid="button-new-sales-order" className="gap-2 shadow-lg shadow-primary/20"><Plus className="h-4 w-4" /> New Order</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create Sales Order</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger data-testid="select-customer">
                          <SelectValue placeholder="Select Customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers?.map((c: any) => (
                          <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
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
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="invoiced">Invoiced</SelectItem>
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
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ isCustom: false, productId: null, description: "", quantity: 1, unitPrice: 0 })}>
                    <Package className="h-3 w-3 mr-1" /> Inventory Item
                  </Button>
                  <Button data-testid="button-add-custom-item" type="button" variant="outline" size="sm" onClick={() => append({ isCustom: true, productId: null, description: "", quantity: 1, unitPrice: 0 })}>
                    <FileText className="h-3 w-3 mr-1" /> Custom Item
                  </Button>
                </div>
              </div>
              
              {fields.map((field, index) => {
                const isCustom = watchedItems[index]?.isCustom;
                return (
                  <div key={field.id} className={`flex flex-col gap-3 p-3 rounded-lg ${isCustom ? 'bg-amber-50 border border-amber-200' : 'bg-muted/30'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isCustom ? (
                          <span className="text-xs font-medium text-amber-700 flex items-center gap-1"><FileText className="h-3 w-3" /> Custom Item</span>
                        ) : (
                          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Package className="h-3 w-3" /> Inventory Item</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`custom-toggle-${index}`} className="text-xs text-muted-foreground">Custom</Label>
                        <Switch
                          id={`custom-toggle-${index}`}
                          data-testid={`switch-custom-${index}`}
                          checked={isCustom}
                          onCheckedChange={(checked) => toggleCustomItem(index, checked)}
                        />
                        <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => remove(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-4 items-end">
                      {isCustom ? (
                        <FormField
                          control={form.control}
                          name={`items.${index}.description`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel className="text-xs">Description</FormLabel>
                              <FormControl><Input data-testid={`input-description-${index}`} placeholder="e.g. Labor: Brake Installation" className="h-8" {...field} value={field.value || ""} /></FormControl>
                            </FormItem>
                          )}
                        />
                      ) : (
                        <FormField
                          control={form.control}
                          name={`items.${index}.productId`}
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel className="text-xs">Product</FormLabel>
                              <Select onValueChange={(val) => { field.onChange(Number(val)); handleProductSelect(index, val); }} value={field.value?.toString() || ""}>
                                <FormControl>
                                  <SelectTrigger data-testid={`select-product-${index}`} className="h-8">
                                    <SelectValue placeholder="Select Product" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {products?.map((p: any) => (
                                    <SelectItem key={p.id} value={p.id.toString()}>{p.sku} - {p.name} (${p.sellingPrice})</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                      )}
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem className="w-20">
                            <FormLabel className="text-xs">Qty</FormLabel>
                            <FormControl><Input data-testid={`input-quantity-${index}`} type="number" className="h-8" {...field} /></FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`items.${index}.unitPrice`}
                        render={({ field }) => (
                          <FormItem className="w-24">
                            <FormLabel className="text-xs">Price</FormLabel>
                            <FormControl><Input data-testid={`input-price-${index}`} type="number" className="h-8" {...field} /></FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end items-center gap-4 pt-4 border-t">
              <div className="text-right">
                <span className="text-muted-foreground text-sm mr-2">Total:</span>
                <span data-testid="text-order-total" className="text-xl font-bold">${total.toFixed(2)}</span>
              </div>
              <Button data-testid="button-create-order" type="submit" disabled={createOrder.isPending}>
                {createOrder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Order
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
