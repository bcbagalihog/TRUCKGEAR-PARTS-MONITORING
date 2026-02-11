import { useState, useRef } from "react";
import { Layout } from "@/components/Layout";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/hooks/use-products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search, Plus, Loader2, Pencil, Trash2, ImagePlus, X } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const productFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().min(1, "SKU is required"),
  category: z.string().min(1, "Category is required"),
  brand: z.string().optional(),
  description: z.string().optional(),
  stockQuantity: z.coerce.number().min(0),
  reorderPoint: z.coerce.number().min(0),
  costPrice: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  location: z.string().optional(),
  imageUrl: z.string().nullable().optional(),
  oemNumbers: z.array(z.string()).optional(),
  compatibility: z.array(z.object({
    make: z.string().min(1),
    model: z.string().min(1),
    yearStart: z.coerce.number().optional(),
    yearEnd: z.coerce.number().optional(),
  })).optional(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

function ImageUpload({ value, onChange }: { value: string | null | undefined; onChange: (url: string | null) => void }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    setUploading(true);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      URL.revokeObjectURL(localPreview);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: "Upload failed" }));
        throw new Error(errData.message || "Upload failed");
      }
      const data = await res.json();
      setPreview(data.imageUrl);
      onChange(data.imageUrl);
    } catch (err: any) {
      URL.revokeObjectURL(localPreview);
      setPreview(value || null);
      onChange(value || null);
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex items-start gap-3">
      <div
        className="relative w-20 h-20 rounded-md border-2 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden cursor-pointer bg-muted/20"
        onClick={() => fileInputRef.current?.click()}
        data-testid="button-upload-image"
      >
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : preview ? (
          <img src={preview} alt="Product" className="w-full h-full object-cover" />
        ) : (
          <ImagePlus className="h-6 w-6 text-muted-foreground/50" />
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={handleFileChange}
          data-testid="input-product-image"
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Click to upload product image</span>
        <span className="text-xs text-muted-foreground">JPG, PNG, GIF, WEBP (max 5MB)</span>
        {error && <span className="text-xs text-destructive" data-testid="text-upload-error">{error}</span>}
        {preview && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive text-xs w-fit"
            onClick={handleRemove}
            data-testid="button-remove-image"
          >
            <X className="h-3 w-3 mr-1" /> Remove
          </Button>
        )}
      </div>
    </div>
  );
}

export default function Inventory() {
  const [search, setSearch] = useState("");
  const { data: products, isLoading } = useProducts(search);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground mt-1">Manage automotive parts and stock levels.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search SKU, Name..." 
              className="pl-9 w-64 bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <CreateProductDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center">
                  <div className="flex justify-center items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading products...
                  </div>
                </TableCell>
              </TableRow>
            ) : products?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                  No products found. Add your first item.
                </TableCell>
              </TableRow>
            ) : (
              products?.map((product: any) => (
                <TableRow key={product.id} className="hover:bg-muted/30">
                  <TableCell className="w-12 p-1">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-10 h-10 rounded-md object-cover border"
                        data-testid={`img-product-${product.id}`}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-md bg-muted/50 flex items-center justify-center">
                        <ImagePlus className="h-4 w-4 text-muted-foreground/30" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                  <TableCell>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-xs text-muted-foreground">{product.category}</div>
                  </TableCell>
                  <TableCell>{product.brand || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className={product.stockQuantity <= product.reorderPoint ? "text-destructive font-bold" : ""}>
                      {product.stockQuantity}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    &#8369;{Number(product.sellingPrice).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{product.location || '-'}</TableCell>
                  <TableCell>
                    {product.stockQuantity <= product.reorderPoint ? (
                      <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">Low Stock</Badge>
                    ) : (
                      <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-green-50 text-green-700 border-green-200">In Stock</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        data-testid={`button-edit-product-${product.id}`}
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditProduct(product)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        data-testid={`button-delete-product-${product.id}`}
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => setDeleteTarget(product)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {editProduct && (
        <EditProductDialog
          product={editProduct}
          open={!!editProduct}
          onOpenChange={(open) => { if (!open) setEditProduct(null); }}
        />
      )}

      {deleteTarget && (
        <DeleteProductDialog
          product={deleteTarget}
          open={!!deleteTarget}
          onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        />
      )}
    </Layout>
  );
}

function ProductFormFields({ form }: { form: any }) {
  return (
    <>
      <FormField
        control={form.control}
        name="imageUrl"
        render={({ field }: any) => (
          <FormItem>
            <FormLabel>Product Image</FormLabel>
            <FormControl>
              <ImageUpload value={field.value} onChange={field.onChange} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }: any) => (
            <FormItem className="col-span-2">
              <FormLabel>Product Name</FormLabel>
              <FormControl><Input data-testid="input-product-name" placeholder="e.g. Brake Pad Set" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="sku"
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>SKU</FormLabel>
              <FormControl><Input data-testid="input-product-sku" placeholder="BP-1234" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <FormControl><Input data-testid="input-product-category" placeholder="Brakes" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="brand"
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Brand</FormLabel>
              <FormControl><Input data-testid="input-product-brand" placeholder="Bosch" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="location"
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl><Input data-testid="input-product-location" placeholder="Shelf A-12" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <FormField
          control={form.control}
          name="costPrice"
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Cost (&#8369;)</FormLabel>
              <FormControl><Input data-testid="input-product-cost" type="number" step="0.01" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="sellingPrice"
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Price (&#8369;)</FormLabel>
              <FormControl><Input data-testid="input-product-price" type="number" step="0.01" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="stockQuantity"
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Stock Qty</FormLabel>
              <FormControl><Input data-testid="input-product-stock" type="number" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="reorderPoint"
          render={({ field }: any) => (
            <FormItem>
              <FormLabel>Reorder At</FormLabel>
              <FormControl><Input data-testid="input-product-reorder" type="number" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  );
}

function CreateProductDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const createProduct = useCreateProduct();
  
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      sku: "",
      category: "",
      brand: "",
      location: "",
      stockQuantity: 0,
      reorderPoint: 5,
      costPrice: 0,
      sellingPrice: 0,
      imageUrl: null,
      oemNumbers: [],
      compatibility: []
    }
  });

  const onSubmit = (values: ProductFormValues) => {
    const payload = {
      ...values,
      costPrice: String(values.costPrice),
      sellingPrice: String(values.sellingPrice),
    };
    createProduct.mutate(payload as any, {
      onSuccess: () => {
        toast({ title: "Success", description: "Product created successfully" });
        onOpenChange(false);
        form.reset();
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-product" className="gap-2 shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <ProductFormFields form={form} />
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button data-testid="button-create-product" type="submit" disabled={createProduct.isPending}>
                {createProduct.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Product
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function EditProductDialog({ product, open, onOpenChange }: { product: any; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const updateProduct = useUpdateProduct();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product.name || "",
      sku: product.sku || "",
      category: product.category || "",
      brand: product.brand || "",
      description: product.description || "",
      location: product.location || "",
      stockQuantity: product.stockQuantity ?? 0,
      reorderPoint: product.reorderPoint ?? 5,
      costPrice: Number(product.costPrice) || 0,
      sellingPrice: Number(product.sellingPrice) || 0,
      imageUrl: product.imageUrl || null,
      oemNumbers: product.oemNumbers?.map((o: any) => o.oemNumber) || [],
      compatibility: product.compatibility || [],
    }
  });

  const onSubmit = (values: ProductFormValues) => {
    const payload = {
      id: product.id,
      ...values,
      costPrice: String(values.costPrice),
      sellingPrice: String(values.sellingPrice),
    };
    updateProduct.mutate(payload as any, {
      onSuccess: () => {
        toast({ title: "Success", description: "Product updated successfully" });
        onOpenChange(false);
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Product - {product.sku}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <ProductFormFields form={form} />
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button data-testid="button-save-product" type="submit" disabled={updateProduct.isPending}>
                {updateProduct.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteProductDialog({ product, open, onOpenChange }: { product: any; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const deleteProduct = useDeleteProduct();

  const handleDelete = () => {
    deleteProduct.mutate(product.id, {
      onSuccess: () => {
        toast({ title: "Deleted", description: `"${product.name}" has been removed from inventory.` });
        onOpenChange(false);
      },
      onError: (err) => {
        toast({ title: "Cannot Delete", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Product</DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <span className="font-semibold text-foreground">{product.name}</span> ({product.sku})?
          </p>
        </div>
        <div className="flex justify-end gap-3">
          <Button data-testid="button-cancel-delete" type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button data-testid="button-confirm-delete" variant="destructive" onClick={handleDelete} disabled={deleteProduct.isPending}>
            {deleteProduct.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
