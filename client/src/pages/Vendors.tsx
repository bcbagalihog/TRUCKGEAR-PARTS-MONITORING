import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useVendors, useCreateVendor } from "@/hooks/use-parties";
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

const vendorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  leadTimeDays: z.coerce.number().optional(),
});

type VendorFormValues = z.infer<typeof vendorSchema>;

export default function Vendors() {
  const { data: vendors, isLoading } = useVendors();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  return (
    <Layout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Vendors</h1>
          <p className="text-muted-foreground mt-1">Manage supplier information.</p>
        </div>
        <Button className="gap-2" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Add Vendor
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
              <TableHead>Lead Time</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
            ) : vendors?.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No vendors found.</TableCell></TableRow>
            ) : (
              vendors?.map((v: any) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell>{v.email || '-'}</TableCell>
                  <TableCell>{v.phone || '-'}</TableCell>
                  <TableCell>{v.address || '-'}</TableCell>
                  <TableCell>{v.leadTimeDays ? `${v.leadTimeDays}d` : '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm" variant="outline"
                        data-testid={`button-edit-vendor-${v.id}`}
                        onClick={() => setEditTarget(v)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm" variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        data-testid={`button-delete-vendor-${v.id}`}
                        onClick={() => setDeleteTarget(v)}
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

      <VendorFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        mode="create"
      />

      <VendorFormDialog
        open={!!editTarget}
        onOpenChange={(open) => { if (!open) setEditTarget(null); }}
        mode="edit"
        vendor={editTarget}
      />

      <DeleteVendorDialog
        vendor={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
      />
    </Layout>
  );
}

function VendorFormDialog({
  open, onOpenChange, mode, vendor
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  vendor?: any;
}) {
  const { toast } = useToast();
  const createVendor = useCreateVendor();

  const updateMutation = useMutation({
    mutationFn: (values: VendorFormValues) =>
      apiRequest("PUT", `/api/vendors/${vendor?.id}`, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({ title: "Updated", description: "Vendor updated successfully." });
      onOpenChange(false);
    },
    onError: () => toast({ title: "Error", description: "Failed to update vendor.", variant: "destructive" }),
  });

  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: mode === "edit" && vendor
      ? { name: vendor.name || "", email: vendor.email || "", phone: vendor.phone || "", address: vendor.address || "", leadTimeDays: vendor.leadTimeDays || 7 }
      : { name: "", email: "", phone: "", address: "", leadTimeDays: 7 },
    values: mode === "edit" && vendor
      ? { name: vendor.name || "", email: vendor.email || "", phone: vendor.phone || "", address: vendor.address || "", leadTimeDays: vendor.leadTimeDays || 7 }
      : undefined,
  });

  const onSubmit = (values: VendorFormValues) => {
    if (mode === "create") {
      createVendor.mutate(values as any, {
        onSuccess: () => {
          toast({ title: "Created", description: "Vendor added." });
          onOpenChange(false);
          form.reset();
        },
      });
    } else {
      updateMutation.mutate(values);
    }
  };

  const isPending = createVendor.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New Vendor" : "Edit Vendor"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl><Input {...field} data-testid="input-vendor-name" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input {...field} data-testid="input-vendor-email" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl><Input {...field} data-testid="input-vendor-phone" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl><Input {...field} data-testid="input-vendor-address" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="leadTimeDays" render={({ field }) => (
                <FormItem>
                  <FormLabel>Lead Time (Days)</FormLabel>
                  <FormControl><Input type="number" {...field} data-testid="input-vendor-lead-time" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending} data-testid="button-save-vendor">
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

function DeleteVendorDialog({
  vendor, open, onOpenChange
}: {
  vendor: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/vendors/${vendor?.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({ title: "Deleted", description: `${vendor?.name} has been removed.` });
      onOpenChange(false);
    },
    onError: () => toast({ title: "Error", description: "Failed to delete vendor.", variant: "destructive" }),
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Vendor</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{vendor?.name}</strong>? This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 hover:bg-red-700"
            onClick={() => deleteMutation.mutate()}
            data-testid="button-confirm-delete-vendor"
          >
            {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
