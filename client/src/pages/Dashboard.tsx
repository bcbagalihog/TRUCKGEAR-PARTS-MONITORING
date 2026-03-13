import { useDashboardStats } from "@/hooks/use-stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle, Package, ShoppingCart, Clock, Truck, Users,
  Building2, PhilippinePeso, TrendingUp, FileText, CreditCard, Ban,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading) return <DashboardSkeleton />;

  const fmt = (n: number) =>
    "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const payBadge = (method: string) => {
    const m = (method || "").toUpperCase();
    if (m === "CASH") return "bg-emerald-100 text-emerald-700";
    if (m === "GCASH") return "bg-blue-100 text-blue-700";
    if (m === "CHECK") return "bg-purple-100 text-purple-700";
    if (m === "NET_DAYS") return "bg-amber-100 text-amber-700";
    return "bg-gray-100 text-gray-600";
  };

  const statusBadge = (status: string) => {
    const s = (status || "").toUpperCase();
    if (s === "PAID") return "bg-emerald-100 text-emerald-700";
    if (s === "UNPAID") return "bg-red-100 text-red-600";
    if (s === "BILLED") return "bg-sky-100 text-sky-700";
    return "bg-gray-100 text-gray-600";
  };

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {new Date().toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <Link
          href="/pos"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors"
          data-testid="link-open-pos"
        >
          <FileText className="h-4 w-4" />
          Open POS
        </Link>
      </div>

      {/* KPI Row 1 — Revenue & Invoices */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <KPICard
          label="Today's Revenue"
          value={fmt(stats?.todayRevenue)}
          sub={`${stats?.todayInvoiceCount ?? 0} invoices today`}
          icon={PhilippinePeso}
          accent="emerald"
          testId="kpi-today-revenue"
        />
        <KPICard
          label="30-Day Revenue"
          value={fmt(stats?.monthlyRevenue)}
          sub={`${stats?.monthlyInvoiceCount ?? 0} invoices`}
          icon={TrendingUp}
          accent="blue"
          testId="kpi-monthly-revenue"
        />
        <KPICard
          label="Unpaid AR"
          value={fmt(stats?.unpaidAR)}
          sub="Pending collection"
          icon={CreditCard}
          accent={stats?.unpaidAR > 0 ? "amber" : "gray"}
          testId="kpi-unpaid-ar"
        />
        <KPICard
          label="Low Stock Items"
          value={stats?.lowStockCount ?? 0}
          sub="Need reordering"
          icon={AlertTriangle}
          accent={stats?.lowStockCount > 0 ? "red" : "gray"}
          alert={stats?.lowStockCount > 0}
          testId="kpi-low-stock"
        />
      </div>

      {/* KPI Row 2 — Operational */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard
          label="Total Products"
          value={stats?.totalProducts ?? 0}
          sub="SKUs in inventory"
          icon={Package}
          accent="indigo"
          testId="kpi-total-products"
        />
        <KPICard
          label="Pending Sales Orders"
          value={stats?.pendingOrders ?? 0}
          sub="Draft sales"
          icon={ShoppingCart}
          accent="violet"
          testId="kpi-pending-so"
        />
        <KPICard
          label="Pending Purchase Orders"
          value={stats?.pendingPurchaseOrders ?? 0}
          sub="Draft purchases"
          icon={Truck}
          accent="orange"
          testId="kpi-pending-po"
        />
        <KPICard
          label="Customers"
          value={stats?.totalCustomers ?? 0}
          sub={`${stats?.totalVendors ?? 0} vendors`}
          icon={Users}
          accent="teal"
          testId="kpi-customers"
        />
      </div>

      {/* Chart + Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* 7-Day Revenue Chart */}
        <Card className="col-span-1 lg:col-span-2 card-gradient shadow-sm" data-testid="card-weekly-chart">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">7-Day Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {(stats?.weeklyChart?.length ?? 0) === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                No invoice data for the past 7 days
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={stats?.weeklyChart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v: number) => [`₱${v.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`, "Revenue"]}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card className="card-gradient shadow-sm" data-testid="card-low-stock">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(stats?.lowStockItems?.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground text-sm">
                <Package className="h-8 w-8 text-emerald-400" />
                All stock levels are healthy
              </div>
            ) : (
              <div className="space-y-2">
                {stats?.lowStockItems?.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-amber-50 border border-amber-100"
                    data-testid={`row-low-stock-${item.id}`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">{item.sku}</p>
                    </div>
                    <div className="text-right ml-2 shrink-0">
                      <span className="text-sm font-bold text-red-600">{item.stockQuantity}</span>
                      <p className="text-[10px] text-muted-foreground">min {item.reorderPoint}</p>
                    </div>
                  </div>
                ))}
                <div className="pt-1">
                  <Link href="/products" className="text-xs font-medium text-primary hover:underline" data-testid="link-view-products">
                    Manage inventory →
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Invoices + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent POS Invoices */}
        <Card className="col-span-1 lg:col-span-2 card-gradient shadow-sm" data-testid="card-recent-invoices">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {(stats?.recentInvoices?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No invoices yet. Open the POS to create one.</p>
            ) : (
              <div className="space-y-2">
                {stats?.recentInvoices?.map((inv: any) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-white/50 hover:bg-white/80 transition-colors"
                    data-testid={`row-invoice-${inv.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{inv.registeredName || "Walk-in"}</p>
                        <p className="text-[10px] text-muted-foreground">
                          #{inv.invoiceNumber} · {new Date(inv.createdAt).toLocaleDateString("en-PH")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${payBadge(inv.paymentMethod)}`}>
                        {(inv.paymentMethod || "").replace("_", " ")}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${statusBadge(inv.status)}`}>
                        {inv.status}
                      </span>
                      <p className="font-bold text-sm text-right w-28">{fmt(inv.totalAmount)}</p>
                    </div>
                  </div>
                ))}
                <div className="pt-1">
                  <Link href="/pos" className="text-xs font-medium text-primary hover:underline" data-testid="link-view-pos">
                    Open Invoice Vault →
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="card-gradient shadow-sm" data-testid="card-quick-actions">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {[
              { href: "/pos", icon: FileText, label: "New Invoice", color: "text-blue-600", bg: "bg-blue-50 hover:bg-blue-100" },
              { href: "/sales", icon: ShoppingCart, label: "Sales Order", color: "text-emerald-600", bg: "bg-emerald-50 hover:bg-emerald-100" },
              { href: "/purchases", icon: Truck, label: "Purchase Order", color: "text-orange-600", bg: "bg-orange-50 hover:bg-orange-100" },
              { href: "/products", icon: Package, label: "Add Product", color: "text-indigo-600", bg: "bg-indigo-50 hover:bg-indigo-100" },
              { href: "/customers", icon: Users, label: "Add Customer", color: "text-teal-600", bg: "bg-teal-50 hover:bg-teal-100" },
              { href: "/reports", icon: TrendingUp, label: "Reports", color: "text-violet-600", bg: "bg-violet-50 hover:bg-violet-100" },
            ].map(({ href, icon: Icon, label, color, bg }) => (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all group ${bg}`}
                data-testid={`link-quick-${label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <Icon className={`h-6 w-6 ${color} mb-1.5`} />
                <span className="font-medium text-xs text-center leading-tight">{label}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function KPICard({ label, value, sub, icon: Icon, accent, alert, testId }: any) {
  const accentMap: Record<string, { bg: string; icon: string; ring: string }> = {
    emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", ring: "" },
    blue:    { bg: "bg-blue-50",    icon: "text-blue-600",    ring: "" },
    amber:   { bg: "bg-amber-50",   icon: "text-amber-600",   ring: "ring-2 ring-amber-200" },
    red:     { bg: "bg-red-50",     icon: "text-red-600",     ring: "ring-2 ring-red-200" },
    indigo:  { bg: "bg-indigo-50",  icon: "text-indigo-600",  ring: "" },
    violet:  { bg: "bg-violet-50",  icon: "text-violet-600",  ring: "" },
    orange:  { bg: "bg-orange-50",  icon: "text-orange-600",  ring: "" },
    teal:    { bg: "bg-teal-50",    icon: "text-teal-600",    ring: "" },
    gray:    { bg: "bg-gray-50",    icon: "text-gray-500",    ring: "" },
  };
  const { bg, icon: iconColor, ring } = accentMap[accent] || accentMap.gray;

  return (
    <Card className={`card-gradient shadow-sm transition-all hover:shadow-md ${alert ? ring : ""}`} data-testid={testId}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
            <h3 className="text-xl font-display font-bold mt-0.5 truncate">{value ?? "—"}</h3>
            <p className={`text-[11px] mt-1 truncate ${alert ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
              {sub}
            </p>
          </div>
          <div className={`h-9 w-9 rounded-full ${bg} flex items-center justify-center shrink-0`}>
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <Layout>
      <div className="mb-6 space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Skeleton className="col-span-2 h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="col-span-2 h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </Layout>
  );
}
