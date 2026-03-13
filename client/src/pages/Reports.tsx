import { useState, useRef } from "react";
import { Layout } from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp, TrendingDown, ShoppingCart, Truck, Download, RefreshCw,
  AlertTriangle, CheckCircle2, BarChart3, FileText, Wallet, Calendar, CreditCard,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell,
} from "recharts";
// @ts-ignore
import jsPDF from "jspdf";
// @ts-ignore
import autoTable from "jspdf-autotable";

const PERIODS = [
  { value: "7day", label: "Last 7 Days" },
  { value: "30day", label: "Last 30 Days" },
  { value: "daily", label: "Daily (30 Days)" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

const PIE_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b"];
const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  GCASH: "GCash",
  CHECK: "Check",
  NET_DAYS: "NET Days",
};

function fmt(v: number) {
  return `₱${v.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState<"activity" | "business">("business");
  const [period, setPeriod] = useState("30day");
  const reportRef = useRef<HTMLDivElement>(null);

  const { data: activityReport, isLoading: activityLoading } = useQuery<any>({
    queryKey: ["/api/reports/activity", period],
    queryFn: async () => {
      const res = await fetch(`/api/reports/activity?period=${period}`);
      if (!res.ok) throw new Error("Failed to fetch report");
      return res.json();
    },
    enabled: activeTab === "activity",
  });

  const { data: bizReport, isLoading: bizLoading, refetch: refetchBiz } = useQuery<any>({
    queryKey: ["/api/reports/business"],
    queryFn: async () => {
      const res = await fetch("/api/reports/business");
      if (!res.ok) throw new Error("Failed to fetch business report");
      return res.json();
    },
    enabled: activeTab === "business",
    staleTime: 0,
  });

  const mergedData = mergeChartData(activityReport?.sales || [], activityReport?.purchases || []);

  const handleExportPDF = () => {
    if (!bizReport) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 14;

    // Header
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 58, 138);
    doc.text("Truckgear Truck Parts Store", margin, 18);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text("1032 A. Bonifacio St. Brgy Balingasa Q.C,", margin, 24);
    doc.text("Tel: (02)85513863 | CP: 09285066385", margin, 29);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text("BUSINESS REPORT", pageW - margin, 18, { align: "right" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(`Generated: ${new Date(bizReport.generatedAt).toLocaleString("en-PH")}`, pageW - margin, 24, { align: "right" });
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, 34, pageW - margin, 34);

    let y = 40;

    // Accounting Totals
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("ACCOUNTING TOTALS", margin, y);
    y += 6;
    autoTable(doc, {
      startY: y,
      head: [["Metric", "Amount"]],
      body: [
        ["Total Accounts Receivable (UNPAID)", fmt(bizReport.totals.totalAR)],
        ["Total Accounts Payable (Pending)", fmt(bizReport.totals.totalAP)],
        ["Projected Outflow (next 7 days)", fmt(bizReport.totals.projectedOutflow)],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    // Daily Sales Tally
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("DAILY SALES TALLY", margin, y);
    y += 6;
    const ds = bizReport.todaySales;
    autoTable(doc, {
      startY: y,
      head: [["Payment Method", "Amount"]],
      body: [
        ["Cash", fmt(ds.byMethod.CASH)],
        ["GCash", fmt(ds.byMethod.GCASH)],
        ["Check", fmt(ds.byMethod.CHECK)],
        ["NET Days (Unpaid)", fmt(ds.byMethod.NET_DAYS)],
        ["Total Invoice Value", fmt(ds.total)],
        ["Total Payments Recorded", fmt(ds.paymentsRecorded)],
        ["Discrepancy", ds.discrepancy < 0.01 ? "None ✓" : fmt(ds.discrepancy)],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [16, 185, 129] },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    // Daily Purchase Tally
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("DAILY PURCHASE TALLY", margin, y);
    y += 6;
    const dp = bizReport.todayPurchases;
    autoTable(doc, {
      startY: y,
      head: [["Item", "Amount"]],
      body: [
        ["Total Stock Received (Value)", fmt(dp.total)],
        [`POs Received Today`, `${dp.count} orders`],
        ["Pending AP Invoices", fmt(dp.pendingAP)],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [245, 158, 11] },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    // AR Aging
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("AR AGING", margin, y);
    y += 6;
    const ag = bizReport.arAging;
    autoTable(doc, {
      startY: y,
      head: [["Bucket", "Amount"]],
      body: [
        ["Current (0–30 days)", fmt(ag.current)],
        ["30–60 days", fmt(ag.thirtyToSixty)],
        ["Overdue (60+ days)", fmt(ag.overdue)],
        ["Total AR", fmt(ag.current + ag.thirtyToSixty + ag.overdue)],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [239, 68, 68] },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    // Cash Flow
    if (bizReport.cashFlow?.length > 0) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("PROJECTED CASH OUTFLOW (Next 4 Weeks)", margin, y);
      y += 6;
      autoTable(doc, {
        startY: y,
        head: [["Week", "Check Payments Due"]],
        body: bizReport.cashFlow.map((w: any) => [w.week, fmt(w.amount)]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [100, 116, 139] },
        margin: { left: margin, right: margin },
      });
    }

    doc.save(`Business_Report_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Business Reports</h1>
            <p className="text-sm text-gray-500 mt-1">Daily tally, financial analytics, and activity charts.</p>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === "business" && (
              <>
                <button onClick={() => refetchBiz()}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50">
                  <RefreshCw className="h-4 w-4" /> Refresh
                </button>
                <button onClick={handleExportPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
                  <Download className="h-4 w-4" /> Export PDF
                </button>
              </>
            )}
            {activeTab === "activity" && (
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {[
            { key: "business", label: "Business Report", icon: BarChart3 },
            { key: "activity", label: "Activity Reports", icon: FileText },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === key ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>

        {/* ═══ BUSINESS REPORT TAB ═══ */}
        {activeTab === "business" && (
          <div ref={reportRef} className="space-y-6">
            {bizLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
              </div>
            ) : !bizReport ? (
              <div className="text-center text-gray-400 py-16">Failed to load business report.</div>
            ) : (
              <>
                {/* ── Accounting Totals ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <TotalCard
                    icon={Wallet} iconColor="text-blue-600" bg="bg-blue-50"
                    label="Total Accounts Receivable" sublabel="UNPAID invoices"
                    value={fmt(bizReport.totals.totalAR)}
                  />
                  <TotalCard
                    icon={CreditCard} iconColor="text-amber-600" bg="bg-amber-50"
                    label="Total Accounts Payable" sublabel="Pending supplier invoices"
                    value={fmt(bizReport.totals.totalAP)}
                  />
                  <TotalCard
                    icon={Calendar} iconColor="text-red-600" bg="bg-red-50"
                    label="Projected Outflow (7 days)" sublabel="Supplier checks maturing"
                    value={fmt(bizReport.totals.projectedOutflow)}
                  />
                </div>

                {/* ── Daily Tallies ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Daily Sales */}
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-emerald-600" />
                        <h3 className="font-bold text-gray-800">Daily Sales Tally</h3>
                        <span className="text-xs text-gray-400 font-normal">— Today</span>
                      </div>
                      {bizReport.todaySales.discrepancy < 0.01 ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-600 font-bold">
                          <CheckCircle2 className="h-4 w-4" /> Balanced
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-red-600 font-bold">
                          <AlertTriangle className="h-4 w-4" /> Discrepancy!
                        </span>
                      )}
                    </div>
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-gray-100">
                        {Object.entries(bizReport.todaySales.byMethod).map(([method, amt]: any) => (
                          <tr key={method}>
                            <td className="py-2 text-gray-600">{METHOD_LABELS[method] || method}</td>
                            <td className="py-2 text-right font-mono font-bold text-gray-800">{fmt(amt)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-200">
                          <td className="pt-3 font-bold text-gray-700 text-xs uppercase tracking-wide">Items Sold</td>
                          <td className="pt-3 text-right font-mono font-black text-lg text-blue-700">{fmt(bizReport.todaySales.total)}</td>
                        </tr>
                        <tr>
                          <td className="pb-1 text-xs text-gray-500">Payments Recorded</td>
                          <td className="pb-1 text-right font-mono text-xs text-gray-600">{fmt(bizReport.todaySales.paymentsRecorded)}</td>
                        </tr>
                        {bizReport.todaySales.discrepancy >= 0.01 && (
                          <tr>
                            <td className="text-xs text-red-600 font-bold">Discrepancy</td>
                            <td className="text-right font-mono text-xs text-red-600 font-bold">{fmt(bizReport.todaySales.discrepancy)}</td>
                          </tr>
                        )}
                        <tr>
                          <td className="text-xs text-gray-400">{bizReport.todaySales.count} invoice{bizReport.todaySales.count !== 1 ? "s" : ""} today</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Daily Purchases */}
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Truck className="h-5 w-5 text-blue-600" />
                      <h3 className="font-bold text-gray-800">Daily Purchase Tally</h3>
                      <span className="text-xs text-gray-400 font-normal">— Today</span>
                    </div>
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-gray-100">
                        <tr>
                          <td className="py-2 text-gray-600">Stock Received (Value)</td>
                          <td className="py-2 text-right font-mono font-black text-lg text-blue-700">{fmt(bizReport.todayPurchases.total)}</td>
                        </tr>
                        <tr>
                          <td className="py-2 text-gray-600">POs Received</td>
                          <td className="py-2 text-right font-mono font-bold">{bizReport.todayPurchases.count} orders</td>
                        </tr>
                        <tr>
                          <td className="py-2 text-gray-600">Pending AP Invoices</td>
                          <td className="py-2 text-right font-mono font-bold text-amber-700">{fmt(bizReport.todayPurchases.pendingAP)}</td>
                        </tr>
                      </tbody>
                    </table>

                    {/* AR Aging below */}
                    <div className="mt-5 pt-4 border-t">
                      <h4 className="text-xs font-bold uppercase text-gray-500 mb-3 flex items-center gap-1">
                        <TrendingDown className="h-3.5 w-3.5" /> AR Aging (UNPAID Invoices)
                      </h4>
                      <div className="space-y-2">
                        {[
                          { label: "Current (0–30 days)", val: bizReport.arAging.current, color: "bg-emerald-500" },
                          { label: "30–60 days", val: bizReport.arAging.thirtyToSixty, color: "bg-amber-500" },
                          { label: "Overdue (60+ days)", val: bizReport.arAging.overdue, color: "bg-red-500" },
                        ].map(({ label, val, color }) => {
                          const arTotal = bizReport.arAging.current + bizReport.arAging.thirtyToSixty + bizReport.arAging.overdue || 1;
                          const pct = Math.round((val / arTotal) * 100);
                          return (
                            <div key={label}>
                              <div className="flex justify-between text-xs text-gray-600 mb-1">
                                <span>{label}</span>
                                <span className="font-mono font-bold">{fmt(val)}</span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Charts ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Revenue vs Expense 30-day bar */}
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <BarChart3 className="h-5 w-5 text-blue-600" /> Revenue vs. Purchases (30 Days)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {bizReport.thirtyDayData.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">No data in the last 30 days.</p>
                      ) : (
                        <ResponsiveContainer width="100%" height={260}>
                          <BarChart data={bizReport.thirtyDayData} barGap={2}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis dataKey="day" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₱${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                            <Tooltip formatter={(v: number) => [fmt(v)]} />
                            <Legend />
                            <Bar dataKey="sales" name="Sales" fill="#10b981" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="purchases" name="Purchases" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>

                  {/* Payment Method Pie */}
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <CreditCard className="h-5 w-5 text-purple-600" /> Collection Breakdown
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {!bizReport.paymentBreakdown?.length ? (
                        <p className="text-sm text-gray-400 text-center py-8">No payment data yet.</p>
                      ) : (
                        <div className="flex items-center gap-4">
                          <ResponsiveContainer width="60%" height={240}>
                            <PieChart>
                              <Pie
                                data={bizReport.paymentBreakdown}
                                dataKey="total"
                                nameKey="method"
                                cx="50%"
                                cy="50%"
                                outerRadius={90}
                                innerRadius={50}
                                label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ""}
                                labelLine={false}
                              >
                                {bizReport.paymentBreakdown.map((_: any, index: number) => (
                                  <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(v: number) => [fmt(v)]} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="flex-1 space-y-2">
                            {bizReport.paymentBreakdown.map((item: any, i: number) => (
                              <div key={item.method} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                                  <span className="text-gray-700">{METHOD_LABELS[item.method] || item.method}</span>
                                </div>
                                <span className="font-mono font-bold text-gray-800 text-xs">{fmt(item.total)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* AR Aging Bar Chart */}
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <TrendingDown className="h-5 w-5 text-red-500" /> AR Aging Chart
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {bizReport.arAging.current + bizReport.arAging.thirtyToSixty + bizReport.arAging.overdue === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-8">No outstanding receivables.</p>
                      ) : (
                        <ResponsiveContainer width="100%" height={180}>
                          <BarChart
                            layout="vertical"
                            data={[
                              { label: "Current (0–30)", amount: bizReport.arAging.current },
                              { label: "30–60 Days", amount: bizReport.arAging.thirtyToSixty },
                              { label: "Overdue (60+)", amount: bizReport.arAging.overdue },
                            ]}
                            margin={{ left: 20, right: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `₱${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                            <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={100} />
                            <Tooltip formatter={(v: number) => [fmt(v), "Amount"]} />
                            <Bar dataKey="amount" name="Amount" fill="#ef4444" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>

                  {/* Cash Flow Trend - next 4 weeks */}
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Calendar className="h-5 w-5 text-slate-600" /> Projected Outflow (Next 4 Weeks)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {!bizReport.cashFlow?.some((w: any) => w.amount > 0) ? (
                        <p className="text-sm text-gray-400 text-center py-8">No supplier checks maturing in the next 4 weeks.</p>
                      ) : (
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={bizReport.cashFlow}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis dataKey="week" tick={{ fontSize: 9 }} />
                            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₱${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                            <Tooltip formatter={(v: number) => [fmt(v), "Check Payments"]} />
                            <Line
                              type="monotone"
                              dataKey="amount"
                              name="Check Payments"
                              stroke="#64748b"
                              strokeWidth={2}
                              dot={{ r: 5, fill: "#64748b" }}
                              activeDot={{ r: 7 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ ACTIVITY REPORTS TAB ═══ */}
        {activeTab === "activity" && (
          <>
            {activityLoading ? (
              <ReportSkeleton />
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <SummaryCard
                    title="Total Sales" data-testid="text-total-sales"
                    value={fmt(Number(activityReport?.salesSummary?.total_revenue || 0))}
                    subtitle={`${activityReport?.salesSummary?.total_orders || 0} orders`}
                    icon={ShoppingCart} color="text-emerald-600"
                  />
                  <SummaryCard
                    title="Total Purchases" data-testid="text-total-purchases"
                    value={fmt(Number(activityReport?.purchaseSummary?.total_cost || 0))}
                    subtitle={`${activityReport?.purchaseSummary?.total_orders || 0} orders`}
                    icon={Truck} color="text-blue-600"
                  />
                  <SummaryCard
                    title="Net Profit"
                    value={fmt(Number(activityReport?.salesSummary?.total_revenue || 0) - Number(activityReport?.purchaseSummary?.total_cost || 0))}
                    subtitle="Revenue - Purchases"
                    icon={TrendingUp} color="text-amber-600"
                  />
                  <SummaryCard
                    title="Avg. Sale Value"
                    value={fmt(
                      Number(activityReport?.salesSummary?.total_orders) > 0
                        ? Number(activityReport?.salesSummary?.total_revenue) / Number(activityReport?.salesSummary?.total_orders)
                        : 0
                    )}
                    subtitle="Per order"
                    icon={TrendingDown} color="text-indigo-600"
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  <Card className="card-gradient shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-emerald-600" /> Sales Revenue
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {activityReport?.sales?.length === 0 ? (
                        <p className="text-muted-foreground text-sm py-8 text-center">No sales data for this period.</p>
                      ) : (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={activityReport?.sales || []}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₱${v}`} />
                            <Tooltip formatter={(value: number) => [fmt(value), "Revenue"]} />
                            <Bar dataKey="total_amount" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Revenue" />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="card-gradient shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Truck className="h-5 w-5 text-blue-600" /> Purchase Spending
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {activityReport?.purchases?.length === 0 ? (
                        <p className="text-muted-foreground text-sm py-8 text-center">No purchase data for this period.</p>
                      ) : (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={activityReport?.purchases || []}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₱${v}`} />
                            <Tooltip formatter={(value: number) => [fmt(value), "Spending"]} />
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
          </>
        )}
      </div>
    </Layout>
  );
}

function TotalCard({ icon: Icon, iconColor, bg, label, sublabel, value }: any) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-center gap-4">
      <div className={`${bg} p-3 rounded-xl`}>
        <Icon className={`h-6 w-6 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-black text-gray-900 font-mono mt-0.5 truncate">{value}</p>
        <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>
      </div>
    </div>
  );
}

function mergeChartData(sales: any[], purchases: any[]) {
  const map = new Map<string, { period: string; salesCount: number; purchaseCount: number }>();
  for (const s of sales) {
    map.set(s.period, { period: s.period, salesCount: Number(s.order_count), purchaseCount: 0 });
  }
  for (const p of purchases) {
    const existing = map.get(p.period);
    if (existing) existing.purchaseCount = Number(p.order_count);
    else map.set(p.period, { period: p.period, salesCount: 0, purchaseCount: Number(p.order_count) });
  }
  return Array.from(map.values()).sort((a, b) => a.period.localeCompare(b.period));
}

function SummaryCard({ title, value, subtitle, icon: Icon, color, ...props }: any) {
  return (
    <Card className="card-gradient shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold mt-1 truncate" {...props}>{value}</h3>
          </div>
          <div className={`h-10 w-10 rounded-full ${color.replace("text-", "bg-")}/10 flex items-center justify-center shrink-0`}>
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
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Skeleton className="h-[380px] rounded-xl" />
        <Skeleton className="h-[380px] rounded-xl" />
      </div>
      <Skeleton className="h-[420px] rounded-xl" />
    </>
  );
}
