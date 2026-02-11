import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, ShoppingCart, Truck } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";

const PERIODS = [
  { value: "7day", label: "Last 7 Days" },
  { value: "30day", label: "Last 30 Days" },
  { value: "daily", label: "Daily (30 Days)" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

function formatCurrency(value: number) {
  return `\u20B1${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function Reports() {
  const [period, setPeriod] = useState("30day");

  const { data: report, isLoading } = useQuery<any>({
    queryKey: ["/api/reports/activity", period],
    queryFn: async () => {
      const res = await fetch(`/api/reports/activity?period=${period}`);
      if (!res.ok) throw new Error("Failed to fetch report");
      return res.json();
    },
  });

  const mergedData = mergeChartData(report?.sales || [], report?.purchases || []);

  return (
    <Layout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground" data-testid="text-reports-title">Activity Reports</h1>
          <p className="text-muted-foreground mt-1">Sales and purchase activity over time.</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger data-testid="select-report-period" className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <ReportSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <SummaryCard
              title="Total Sales"
              value={formatCurrency(Number(report?.salesSummary?.total_revenue || 0))}
              subtitle={`${report?.salesSummary?.total_orders || 0} orders`}
              icon={ShoppingCart}
              color="text-emerald-600"
              testId="text-total-sales"
            />
            <SummaryCard
              title="Total Purchases"
              value={formatCurrency(Number(report?.purchaseSummary?.total_cost || 0))}
              subtitle={`${report?.purchaseSummary?.total_orders || 0} orders`}
              icon={Truck}
              color="text-blue-600"
              testId="text-total-purchases"
            />
            <SummaryCard
              title="Net Profit"
              value={formatCurrency(Number(report?.salesSummary?.total_revenue || 0) - Number(report?.purchaseSummary?.total_cost || 0))}
              subtitle="Revenue - Purchases"
              icon={TrendingUp}
              color="text-amber-600"
              testId="text-net-profit"
            />
            <SummaryCard
              title="Avg. Sale Value"
              value={formatCurrency(
                Number(report?.salesSummary?.total_orders) > 0
                  ? Number(report?.salesSummary?.total_revenue) / Number(report?.salesSummary?.total_orders)
                  : 0
              )}
              subtitle="Per order"
              icon={TrendingDown}
              color="text-indigo-600"
              testId="text-avg-sale"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <Card className="card-gradient shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-emerald-600" />
                  Sales Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                {report?.sales?.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-8 text-center">No sales data for this period.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={report?.sales || []}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `\u20B1${v}`} />
                      <Tooltip formatter={(value: number) => [formatCurrency(value), "Revenue"]} />
                      <Bar dataKey="total_amount" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="card-gradient shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-blue-600" />
                  Purchase Spending
                </CardTitle>
              </CardHeader>
              <CardContent>
                {report?.purchases?.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-8 text-center">No purchase data for this period.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={report?.purchases || []}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `\u20B1${v}`} />
                      <Tooltip formatter={(value: number) => [formatCurrency(value), "Spending"]} />
                      <Bar dataKey="total_amount" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Spending" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="card-gradient shadow-sm">
            <CardHeader>
              <CardTitle>Sales vs Purchases (Order Count)</CardTitle>
            </CardHeader>
            <CardContent>
              {mergedData.length === 0 ? (
                <p className="text-muted-foreground text-sm py-8 text-center">No data for this period.</p>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={mergedData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="salesCount" stroke="hsl(var(--chart-1))" strokeWidth={2} name="Sales Orders" dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="purchaseCount" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Purchase Orders" dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Layout>
  );
}

function mergeChartData(sales: any[], purchases: any[]) {
  const map = new Map<string, { period: string; salesCount: number; purchaseCount: number }>();

  for (const s of sales) {
    map.set(s.period, {
      period: s.period,
      salesCount: Number(s.order_count),
      purchaseCount: 0,
    });
  }

  for (const p of purchases) {
    const existing = map.get(p.period);
    if (existing) {
      existing.purchaseCount = Number(p.order_count);
    } else {
      map.set(p.period, {
        period: p.period,
        salesCount: 0,
        purchaseCount: Number(p.order_count),
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.period.localeCompare(b.period));
}

function SummaryCard({ title, value, subtitle, icon: Icon, color, testId }: any) {
  return (
    <Card className="card-gradient shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 data-testid={testId} className="text-2xl font-display font-bold mt-1 truncate">{value}</h3>
          </div>
          <div className={`h-10 w-10 rounded-full ${color.replace('text-', 'bg-')}/10 flex items-center justify-center shrink-0`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
        <p className="text-xs mt-3 text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function ReportSkeleton() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Skeleton className="h-[380px] rounded-xl" />
        <Skeleton className="h-[380px] rounded-xl" />
      </div>
      <Skeleton className="h-[420px] rounded-xl" />
    </>
  );
}
