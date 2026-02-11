import { useDashboardStats } from "@/hooks/use-stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Package, ShoppingCart, Clock } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading) return <DashboardSkeleton />;

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Overview</h1>
        <p className="text-muted-foreground mt-1">Key metrics and system alerts.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Total Products" 
          value={stats?.totalProducts} 
          icon={Package} 
          trend="+12% from last month"
          color="text-blue-600"
        />
        <StatCard 
          title="Low Stock Alerts" 
          value={stats?.lowStockCount} 
          icon={AlertTriangle} 
          trend="Action needed"
          color="text-amber-600"
          highlight={stats?.lowStockCount > 0}
        />
        <StatCard 
          title="Pending Orders" 
          value={stats?.pendingOrders} 
          icon={Clock} 
          trend="Awaiting shipment"
          color="text-indigo-600"
        />
        <StatCard 
          title="Recent Sales" 
          value={stats?.recentSales?.length || 0} 
          icon={ShoppingCart} 
          trend="Last 30 days"
          color="text-emerald-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="card-gradient shadow-sm">
          <CardHeader>
            <CardTitle>Recent Sales Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recentSales?.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4">No recent sales.</p>
            ) : (
              <div className="space-y-4">
                {stats?.recentSales.map((sale: any) => (
                  <div key={sale.id} className="flex items-center justify-between p-3 rounded-lg border bg-white/50">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                        <ShoppingCart className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Order #{sale.id}</p>
                        <p className="text-xs text-muted-foreground">{new Date(sale.orderDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">${Number(sale.totalAmount).toFixed(2)}</p>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{sale.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 pt-4 border-t">
              <Link href="/sales" className="text-sm font-medium text-primary hover:underline">
                View all orders &rarr;
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Placeholder for chart - requires recharts setup which is tricky in pure code gen without errors, keeping simple for now */}
        <Card className="card-gradient shadow-sm">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Link href="/products" className="flex flex-col items-center justify-center p-6 rounded-xl border border-dashed hover:border-primary hover:bg-primary/5 transition-all group">
              <Package className="h-8 w-8 text-muted-foreground group-hover:text-primary mb-2 transition-colors" />
              <span className="font-medium text-sm">Add Product</span>
            </Link>
            <Link href="/sales" className="flex flex-col items-center justify-center p-6 rounded-xl border border-dashed hover:border-primary hover:bg-primary/5 transition-all group">
              <ShoppingCart className="h-8 w-8 text-muted-foreground group-hover:text-primary mb-2 transition-colors" />
              <span className="font-medium text-sm">New Sale</span>
            </Link>
            <Link href="/purchases" className="flex flex-col items-center justify-center p-6 rounded-xl border border-dashed hover:border-primary hover:bg-primary/5 transition-all group">
              <Truck className="h-8 w-8 text-muted-foreground group-hover:text-primary mb-2 transition-colors" />
              <span className="font-medium text-sm">New Purchase</span>
            </Link>
            <Link href="/customers" className="flex flex-col items-center justify-center p-6 rounded-xl border border-dashed hover:border-primary hover:bg-primary/5 transition-all group">
              <Users className="h-8 w-8 text-muted-foreground group-hover:text-primary mb-2 transition-colors" />
              <span className="font-medium text-sm">Add Customer</span>
            </Link>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function StatCard({ title, value, icon: Icon, trend, color, highlight }: any) {
  return (
    <Card className={`card-gradient shadow-sm transition-all hover:shadow-md ${highlight ? 'ring-2 ring-amber-500/20' : ''}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-display font-bold mt-1">{value ?? '-'}</h3>
          </div>
          <div className={`h-10 w-10 rounded-full ${color.replace('text-', 'bg-')}/10 flex items-center justify-center`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
        <p className={`text-xs mt-3 ${highlight ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
          {trend}
        </p>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <Layout>
      <div className="mb-8 space-y-2">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-8">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </Layout>
  );
}
