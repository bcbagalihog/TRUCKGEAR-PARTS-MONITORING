import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Loader2,
  Store,
  Download,
  Upload,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Package,
  ShoppingCart,
  ArrowRightLeft,
} from "lucide-react";

export default function ShopifyPage() {
  const { toast } = useToast();

  const { data: status, isLoading: statusLoading } = useQuery<any>({
    queryKey: ["/api/shopify/status"],
  });

  const { data: shopifyProducts, isLoading: productsLoading, refetch: refetchProducts } = useQuery<any[]>({
    queryKey: ["/api/shopify/products"],
    enabled: status?.connected === true,
  });

  const { data: shopifyOrders, isLoading: ordersLoading } = useQuery<any[]>({
    queryKey: ["/api/shopify/orders"],
    enabled: status?.connected === true,
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/shopify/import-products");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Import Complete",
        description: `Imported ${data.imported} products, skipped ${data.skipped}. ${data.errors?.length ? `${data.errors.length} errors.` : ""}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      refetchProducts();
    },
    onError: (err: Error) => {
      toast({ title: "Import Failed", description: err.message, variant: "destructive" });
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/shopify/export-products");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Export Complete",
        description: `Exported ${data.exported} products, skipped ${data.skipped}. ${data.errors?.length ? `${data.errors.length} errors.` : ""}`,
      });
      refetchProducts();
    },
    onError: (err: Error) => {
      toast({ title: "Export Failed", description: err.message, variant: "destructive" });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/shopify/sync-inventory");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Inventory Sync Complete",
        description: `Compared ${data.synced} products by SKU.`,
      });
      setSyncDetails(data.details || []);
    },
    onError: (err: Error) => {
      toast({ title: "Sync Failed", description: err.message, variant: "destructive" });
    },
  });

  const [syncDetails, setSyncDetails] = useState<any[]>([]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-shopify-heading">Shopify Integration</h1>
            <p className="text-muted-foreground">Sync products and orders with your Shopify store</p>
          </div>
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Store className="h-8 w-8 text-primary" />
              <div>
                <h2 className="font-semibold text-lg" data-testid="text-connection-title">Connection Status</h2>
                {statusLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking connection...
                  </div>
                ) : status?.connected ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600 font-medium" data-testid="text-connection-status">Connected to {status.shop?.name || status.shop?.domain}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm text-destructive" data-testid="text-connection-status">{status?.message || "Not connected"}</span>
                  </div>
                )}
              </div>
            </div>
            {status?.connected && status.shop && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                <span>Domain: <strong>{status.shop.domain}</strong></span>
                <span>Currency: <strong>{status.shop.currency}</strong></span>
                <span>Plan: <strong>{status.shop.plan}</strong></span>
              </div>
            )}
          </div>
        </Card>

        {status?.connected && (
          <Tabs defaultValue="products" className="space-y-4">
            <TabsList>
              <TabsTrigger value="products" data-testid="tab-shopify-products">
                <Package className="h-4 w-4 mr-1" /> Products
              </TabsTrigger>
              <TabsTrigger value="orders" data-testid="tab-shopify-orders">
                <ShoppingCart className="h-4 w-4 mr-1" /> Orders
              </TabsTrigger>
              <TabsTrigger value="inventory" data-testid="tab-shopify-inventory">
                <ArrowRightLeft className="h-4 w-4 mr-1" /> Inventory Sync
              </TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="space-y-4">
              <Card className="p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
                  <h3 className="font-semibold">Shopify Products ({shopifyProducts?.length || 0})</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      onClick={() => importMutation.mutate()}
                      disabled={importMutation.isPending}
                      data-testid="button-import-products"
                    >
                      {importMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
                      Import to TruckGear
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => exportMutation.mutate()}
                      disabled={exportMutation.isPending}
                      data-testid="button-export-products"
                    >
                      {exportMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
                      Export to Shopify
                    </Button>
                  </div>
                </div>

                {productsLoading ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading Shopify products...
                  </div>
                ) : !shopifyProducts?.length ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No products found in your Shopify store.
                  </div>
                ) : (
                  <div className="border rounded-md overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">Image</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Vendor</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">Inventory</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {shopifyProducts.map((product: any) => {
                          const variant = product.variants?.[0];
                          return (
                            <TableRow key={product.id} data-testid={`row-shopify-product-${product.id}`}>
                              <TableCell className="p-1">
                                {product.image?.src ? (
                                  <img src={product.image.src} alt={product.title} className="w-10 h-10 rounded-md object-cover border" />
                                ) : (
                                  <div className="w-10 h-10 rounded-md bg-muted/50 flex items-center justify-center">
                                    <Package className="h-4 w-4 text-muted-foreground/30" />
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="font-medium">{product.title}</TableCell>
                              <TableCell>{product.vendor || "-"}</TableCell>
                              <TableCell>{product.product_type || "-"}</TableCell>
                              <TableCell className="font-mono text-xs">{variant?.sku || "-"}</TableCell>
                              <TableCell className="text-right">{variant?.price ? `${variant.price}` : "-"}</TableCell>
                              <TableCell className="text-right">{variant?.inventory_quantity ?? "-"}</TableCell>
                              <TableCell>
                                <Badge variant={product.status === "active" ? "default" : "secondary"}>
                                  {product.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="orders" className="space-y-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Recent Shopify Orders</h3>
                {ordersLoading ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading Shopify orders...
                  </div>
                ) : !shopifyOrders?.length ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No orders found in your Shopify store.
                  </div>
                ) : (
                  <div className="border rounded-md overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Financial</TableHead>
                          <TableHead>Fulfillment</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {shopifyOrders.map((order: any) => (
                          <TableRow key={order.id} data-testid={`row-shopify-order-${order.id}`}>
                            <TableCell className="font-medium">{order.name || `#${order.order_number}`}</TableCell>
                            <TableCell className="text-sm">{new Date(order.created_at).toLocaleDateString()}</TableCell>
                            <TableCell>
                              {order.customer ? `${order.customer.first_name || ""} ${order.customer.last_name || ""}`.trim() || order.customer.email : "Guest"}
                            </TableCell>
                            <TableCell>{order.line_items?.length || 0} items</TableCell>
                            <TableCell className="text-right font-mono">
                              {order.currency} {order.total_price}
                            </TableCell>
                            <TableCell>
                              <Badge variant={order.financial_status === "paid" ? "default" : "secondary"}>
                                {order.financial_status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={order.fulfillment_status === "fulfilled" ? "default" : "outline"}>
                                {order.fulfillment_status || "unfulfilled"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="inventory" className="space-y-4">
              <Card className="p-4">
                <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
                  <div>
                    <h3 className="font-semibold">Inventory Comparison</h3>
                    <p className="text-sm text-muted-foreground">Compare stock levels between TruckGear and Shopify by SKU</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => syncMutation.mutate()}
                    disabled={syncMutation.isPending}
                    data-testid="button-sync-inventory"
                  >
                    {syncMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCcw className="h-4 w-4 mr-1" />}
                    Compare Inventory
                  </Button>
                </div>

                {syncDetails.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Click "Compare Inventory" to see stock level differences between systems.
                  </div>
                ) : (
                  <div className="border rounded-md overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>SKU</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Shopify Qty</TableHead>
                          <TableHead className="text-right">TruckGear Qty</TableHead>
                          <TableHead className="text-right">Difference</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {syncDetails.map((item: any) => {
                          const diff = item.localQty - item.shopifyQty;
                          return (
                            <TableRow key={item.sku}>
                              <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                              <TableCell className="font-medium">{item.name}</TableCell>
                              <TableCell className="text-right">{item.shopifyQty}</TableCell>
                              <TableCell className="text-right">{item.localQty}</TableCell>
                              <TableCell className="text-right font-mono">
                                {diff === 0 ? "0" : diff > 0 ? `+${diff}` : String(diff)}
                              </TableCell>
                              <TableCell>
                                {item.status === "in_sync" ? (
                                  <Badge variant="default">
                                    <CheckCircle2 className="h-3 w-3 mr-1" /> In Sync
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive">
                                    <AlertTriangle className="h-3 w-3 mr-1" /> Mismatch
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {!statusLoading && !status?.connected && (
          <Card className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Shopify Not Connected</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Your Shopify API credentials may be incorrect or missing. Please verify your Shopify API key and store URL are correctly configured.
            </p>
          </Card>
        )}
      </div>
    </Layout>
  );
}
