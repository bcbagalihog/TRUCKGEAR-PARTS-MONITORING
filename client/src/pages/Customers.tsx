import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useCustomers, useCreateCustomer } from "@/hooks/use-parties";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

export default function Customers() {
  const { data: customers, isLoading } = useCustomers();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  return (
    <Layout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Customers</h1>
          <p className="text-muted-foreground mt-1">Manage client information.</p>
        </div>
        <Button className="gap-2" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Add Customer
        </Button>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : customers?.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No customers found.</TableCell></TableRow>
            ) : (
              customers?.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.email || '-'}</TableCell>
                  <TableCell>{c.phone || '-'}</TableCell>
                  <TableCell>{c.address || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm" variant="outline"
                        data-testid={`button-edit-customer-${c.id}`}
                        onClick={() => setEditTarget(c)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm" variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        data-testid={`button-delete-customer-${c.id}`}
                        onClick={() => setDeleteTarget(c)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CustomerFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        mode="create"
      />

      <CustomerFormDialog
        open={!!editTarget}
        onOpenChange={(open) => { if (!open) setEditTarget(null); }}
        mode="edit"
        customer={editTarget}
      />

      <DeleteCustomerDialog
        customer={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
      />
    </Layout>
  );
}

function CustomerFormDialog({
  open, onOpenChange, mode, customer
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  customer?: any;
}) {
  const { toast } = useToast();
  const createCustomer = useCreateCustomer();

  const updateMutation = useMutation({
    mutationFn: (values: CustomerFormValues) =>
      apiRequest("PUT", `/api/customers/${customer?.id}`, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Updated", description: "Customer updated successfully." });
      onOpenChange(false);
    },
    onError: () => toast({ title: "Error", description: "Failed to update customer.", variant: "destructive" }),
  });

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: mode === "edit" && customer
      ? { name: customer.name || "", email: customer.email || "", phone: customer.phone || "", address: customer.address || "" }
      : { name: "", email: "", phone: "", address: "" },
    values: mode === "edit" && customer
      ? { name: customer.name || "", email: customer.email || "", phone: customer.phone || "", address: customer.address || "" }
      : undefined,
  });

  const onSubmit = (values: CustomerFormValues) => {
    if (mode === "create") {
      createCustomer.mutate(values as any, {
        onSuccess: () => {
          toast({ title: "Created", description: "Customer added." });
          onOpenChange(false);
          form.reset();
        },
      });
    } else {
      updateMutation.mutate(values);
    }
  };

  const isPending = createCustomer.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New Customer" : "Edit Customer"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl><Input {...field} data-testid="input-customer-name" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input {...field} data-testid="input-customer-email" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl><Input {...field} data-testid="input-customer-phone" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl><Input {...field} data-testid="input-customer-address" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending} data-testid="button-save-customer">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "create" ? "Create" : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteCustomerDialog({
  customer, open, onOpenChange
}: {
  customer: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/customers/${customer?.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Deleted", description: `${customer?.name} has been removed.` });
      onOpenChange(false);
    },
    onError: () => toast({ title: "Error", description: "Failed to delete customer.", variant: "destructive" }),
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Customer</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{customer?.name}</strong>? This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 hover:bg-red-700"
            onClick={() => deleteMutation.mutate()}
            data-testid="button-confirm-delete-customer"
          >
            {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
