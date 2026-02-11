import { useState, useRef } from "react";
import { Layout } from "@/components/Layout";
import { useSalesOrders, useCreateSalesOrder, useUpdateSalesStatus, useUpdateSalesOrder, useDeleteSalesOrder } from "@/hooks/use-orders";
import { useCustomers } from "@/hooks/use-parties";
import { useProducts } from "@/hooks/use-products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search, Plus, Loader2, Trash2, Package, FileText, Pencil, Printer, Download } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

function formatOrderNumber(id: number): string {
  return `SO-${String(id).padStart(5, '0')}`;
}

function generateSalesOrderPDF(order: any) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("SALES ORDER", pageWidth / 2, 20, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Sales Order# ${formatOrderNumber(order.id)}`, pageWidth - 15, 28, { align: "right" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("TruckGear Truck Parts Store", 15, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("1032, A. Bonifacio St., Brgy Balingasa, Balintawak", 15, 46);
  doc.text("Quezon City, Philippines National Capital Region (Manila)", 15, 51);
  doc.text("1115", 15, 56);
  doc.text("Philippines", 15, 61);
  doc.text("09285066385", 15, 66);
  doc.text("truckgearph@gmail.com", 15, 71);
  doc.text("https://truckgearph.com", 15, 76);

  const orderDate = new Date(order.orderDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Order Date :", pageWidth - 70, 88);
  doc.setFont("helvetica", "normal");
  doc.text(orderDate, pageWidth - 15, 88, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.text("Bill To", 15, 98);
  doc.setFont("helvetica", "normal");
  const customerName = order.customer?.name || "Unknown";
  doc.text(customerName, 15, 104);
  if (order.customer?.address) {
    doc.text(order.customer.address, 15, 109);
  }

  doc.setFont("helvetica", "bold");
  doc.text("Ref# :", pageWidth - 70, 98);
  doc.setFont("helvetica", "normal");
  doc.text(String(order.id), pageWidth - 15, 98, { align: "right" });

  const tableData = order.items.map((item: any, idx: number) => {
    const itemName = item.productId ? (item.product?.name || `Product #${item.productId}`) : (item.description || "Custom Item");
    const qty = Number(item.quantity).toFixed(2);
    const rate = Number(item.unitPrice).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const amount = (Number(item.quantity) * Number(item.unitPrice)).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return [String(idx + 1), itemName, qty, rate, amount];
  });

  autoTable(doc, {
    startY: 118,
    head: [["#", "Item & Description", "Qty", "Rate", "Amount"]],
    body: tableData,
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [245, 245, 245], textColor: [30, 30, 30], fontStyle: "bold", lineWidth: 0.5, lineColor: [200, 200, 200] },
    columnStyles: {
      0: { cellWidth: 15, halign: "center" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 25, halign: "right" },
      3: { cellWidth: 35, halign: "right" },
      4: { cellWidth: 35, halign: "right" },
    },
    theme: "plain",
    didDrawPage: () => {},
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 160;

  const subtotal = Number(order.totalAmount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const total = Number(order.totalAmount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Sub Total", pageWidth - 70, finalY + 15);
  doc.setFont("helvetica", "normal");
  doc.text(subtotal, pageWidth - 15, finalY + 15, { align: "right" });

  doc.setDrawColor(200, 200, 200);
  doc.line(pageWidth - 85, finalY + 20, pageWidth - 15, finalY + 20);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Total", pageWidth - 70, finalY + 30);
  doc.text(`PHP${total}`, pageWidth - 15, finalY + 30, { align: "right" });

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(String(i), pageWidth - 15, doc.internal.pageSize.getHeight() - 10, { align: "right" });
  }

  return doc;
}

export default function Sales() {
  const { data: orders, isLoading } = useSalesOrders();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<any>(null);
  const [deleteOrder, setDeleteOrder] = useState<any>(null);
  const updateStatus = useUpdateSalesStatus();
  const deleteMutation = useDeleteSalesOrder();
  const { toast } = useToast();

  const handleStatusChange = (id: number, newStatus: string) => {
    updateStatus.mutate({ id, status: newStatus }, {
      onSuccess: () => toast({ title: "Updated", description: "Order status updated" }),
      onError: () => toast({ title: "Error", description: "Failed to update status", variant: "destructive" })
    });
  };

  const handleDelete = (order: any) => {
    deleteMutation.mutate(order.id, {
      onSuccess: () => {
        toast({ title: "Deleted", description: `Order ${formatOrderNumber(order.id)} has been deleted.` });
        setDeleteOrder(null);
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
        setDeleteOrder(null);
      }
    });
  };

  const handlePrint = (order: any) => {
    const doc = generateSalesOrderPDF(order);
    const pdfBlob = doc.output("blob");
    const url = URL.createObjectURL(pdfBlob);
    const printWindow = window.open(url);
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const handleDownloadPDF = (order: any) => {
    const doc = generateSalesOrderPDF(order);
    doc.save(`${formatOrderNumber(order.id)}.pdf`);
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

      <div className="bg-white dark:bg-card rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Order #</TableHead>
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
                  <TableCell className="font-mono font-medium" data-testid={`text-order-number-${order.id}`}>{formatOrderNumber(order.id)}</TableCell>
                  <TableCell data-testid={`text-customer-${order.id}`}>{order.customer?.name || 'Unknown'}</TableCell>
                  <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                  <TableCell><StatusBadge status={order.status} /></TableCell>
                  <TableCell className="text-right font-bold">&#8369;{Number(order.totalAmount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        data-testid={`button-edit-order-${order.id}`}
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditOrder(order)}
                        disabled={order.status === 'invoiced'}
                        title="Edit Order"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        data-testid={`button-print-order-${order.id}`}
                        size="icon"
                        variant="ghost"
                        onClick={() => handlePrint(order)}
                        title="Print Order"
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button
                        data-testid={`button-pdf-order-${order.id}`}
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDownloadPDF(order)}
                        title="Download PDF"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        data-testid={`button-delete-order-${order.id}`}
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteOrder(order)}
                        disabled={order.status === 'invoiced'}
                        title="Delete Order"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      <Select defaultValue={order.status} onValueChange={(val) => handleStatusChange(order.id, val)}>
                        <SelectTrigger data-testid={`select-status-${order.id}`} className="h-8 w-[110px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="shipped">Shipped</SelectItem>
                          <SelectItem value="invoiced">Invoiced</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {editOrder && (
        <EditOrderDialog
          order={editOrder}
          open={!!editOrder}
          onOpenChange={(open) => { if (!open) setEditOrder(null); }}
        />
      )}

      <AlertDialog open={!!deleteOrder} onOpenChange={(open) => { if (!open) setDeleteOrder(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sales Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete order <strong>{deleteOrder && formatOrderNumber(deleteOrder.id)}</strong> for <strong>{deleteOrder?.customer?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-delete"
              onClick={() => deleteOrder && handleDelete(deleteOrder)}
              className="bg-destructive text-destructive-foreground hover-elevate"
            >
              {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

function OrderFormFields({ form, products, customers, watchedItems, fields, append, remove, toggleCustomItem, handleProductSelect }: any) {
  const total = watchedItems.reduce((acc: number, item: any) => acc + ((item.quantity || 0) * (item.unitPrice || 0)), 0);

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="customerId"
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Customer</FormLabel>
              <Select onValueChange={field.onChange} value={field.value?.toString() || ""}>
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
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
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
        <div className="flex flex-wrap justify-between items-center gap-2">
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

        {fields.map((field: any, index: number) => {
          const isCustom = watchedItems[index]?.isCustom;
          return (
            <div key={field.id} className={`flex flex-col gap-3 p-3 rounded-md ${isCustom ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800' : 'bg-muted/30'}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {isCustom ? (
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1"><FileText className="h-3 w-3" /> Custom Item</span>
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
              <div className="flex flex-wrap gap-4 items-end">
                {isCustom ? (
                  <FormField
                    control={form.control}
                    name={`items.${index}.description`}
                    render={({ field }: any) => (
                      <FormItem className="flex-1 min-w-[200px]">
                        <FormLabel className="text-xs">Description</FormLabel>
                        <FormControl><Input data-testid={`input-description-${index}`} placeholder="e.g. Labor: Brake Installation" className="h-8" {...field} value={field.value || ""} /></FormControl>
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={form.control}
                    name={`items.${index}.productId`}
                    render={({ field }: any) => (
                      <FormItem className="flex-1 min-w-[200px]">
                        <FormLabel className="text-xs">Product</FormLabel>
                        <Select onValueChange={(val) => { field.onChange(Number(val)); handleProductSelect(index, val); }} value={field.value?.toString() || ""}>
                          <FormControl>
                            <SelectTrigger data-testid={`select-product-${index}`} className="h-8">
                              <SelectValue placeholder="Select Product" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {products?.map((p: any) => (
                              <SelectItem key={p.id} value={p.id.toString()}>{p.sku} - {p.name} (&#8369;{p.sellingPrice})</SelectItem>
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
                  render={({ field }: any) => (
                    <FormItem className="w-20">
                      <FormLabel className="text-xs">Qty</FormLabel>
                      <FormControl><Input data-testid={`input-quantity-${index}`} type="number" className="h-8" {...field} /></FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.unitPrice`}
                  render={({ field }: any) => (
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

      <div className="flex flex-wrap justify-end items-center gap-4 pt-4 border-t">
        <div className="text-right">
          <span className="text-muted-foreground text-sm mr-2">Total:</span>
          <span data-testid="text-order-total" className="text-xl font-bold">&#8369;{total.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    </>
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button data-testid="button-new-sales-order" className="gap-2 shadow-lg shadow-primary/20"><Plus className="h-4 w-4" /> New Order</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Sales Order</DialogTitle>
          <DialogDescription>Fill in the details below to create a new sales order.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <OrderFormFields
              form={form}
              products={products}
              customers={customers}
              watchedItems={watchedItems}
              fields={fields}
              append={append}
              remove={remove}
              toggleCustomItem={toggleCustomItem}
              handleProductSelect={handleProductSelect}
            />
            <div className="flex justify-end">
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

function EditOrderDialog({ order, open, onOpenChange }: { order: any; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const updateOrder = useUpdateSalesOrder();
  const { data: customers } = useCustomers();
  const { data: products } = useProducts();

  const defaultItems = order.items.map((item: any) => ({
    isCustom: !item.productId,
    productId: item.productId || null,
    description: item.description || "",
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
  }));

  const form = useForm<SalesOrderFormValues>({
    resolver: zodResolver(salesOrderSchema),
    defaultValues: {
      customerId: order.customerId,
      status: order.status,
      items: defaultItems.length > 0 ? defaultItems : [{ isCustom: false, productId: null, description: "", quantity: 1, unitPrice: 0 }],
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
    updateOrder.mutate({ id: order.id, data: payload as any }, {
      onSuccess: () => {
        toast({ title: "Updated", description: `Order ${formatOrderNumber(order.id)} has been updated.` });
        onOpenChange(false);
      },
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  const watchedItems = form.watch("items");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Sales Order {formatOrderNumber(order.id)}</DialogTitle>
          <DialogDescription>Update the order details below.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <OrderFormFields
              form={form}
              products={products}
              customers={customers}
              watchedItems={watchedItems}
              fields={fields}
              append={append}
              remove={remove}
              toggleCustomItem={toggleCustomItem}
              handleProductSelect={handleProductSelect}
            />
            <div className="flex justify-end">
              <Button data-testid="button-save-order" type="submit" disabled={updateOrder.isPending}>
                {updateOrder.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
