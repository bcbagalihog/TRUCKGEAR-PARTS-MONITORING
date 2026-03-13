import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import {
  Printer,
  Plus,
  Trash2,
  Loader2,
  Search,
  Banknote,
  X,
  ArrowUpCircle,
  Archive,
  FileText,
  Pencil,
  Download,
  Eye,
  Check,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Product } from "@shared/schema";
// @ts-ignore
import jsPDF from "jspdf";
// @ts-ignore
import autoTable from "jspdf-autotable";

export default function POS() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // POS-SPECIFIC STATES
  const [activeSession, setActiveSession] = useState<any>(null);
  const [isDrawerModalOpen, setIsDrawerModalOpen] = useState(false);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isCloseDrawerModalOpen, setIsCloseDrawerModalOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [expense, setExpense] = useState({ description: "", amount: "0" });
  const [closingBalance, setClosingBalance] = useState("0");

  // ORIGINAL DATA STATES
  const [invoiceNo, setInvoiceNo] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [customer, setCustomer] = useState({
    name: "",
    tin: "",
    address: "",
    type: "CASH SALES",
  });
  const [withholdingTaxRate, setWithholdingTaxRate] = useState(0);
  const [items, setItems] = useState([{ description: "", qty: 1, price: 0 }]);

  // PAYMENT METHOD STATES
  type PayMethod = "CASH" | "GCASH" | "CHECK" | "NET_DAYS";
  const [paymentMethod, setPaymentMethod] = useState<PayMethod>("CASH");
  const [gcashRef, setGcashRef] = useState("");
  const [checkBankName, setCheckBankName] = useState("");
  const [checkNumber, setCheckNumber] = useState("");
  const [checkMaturityDate, setCheckMaturityDate] = useState("");
  const [netDays, setNetDays] = useState("30");
  const [poNumber, setPoNumber] = useState("");

  // CALIBRATION PREVIEW
  const [showCalibrationPreview, setShowCalibrationPreview] = useState(false);

  // VAULT / TAB STATE
  const queryClient = useQueryClient();
  const [posTab, setPosTab] = useState<"new" | "vault">("new");
  const [vaultSearch, setVaultSearch] = useState("");
  const [vaultStatusFilter, setVaultStatusFilter] = useState("ALL");
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [vaultPrintInvoice, setVaultPrintInvoice] = useState<any>(null);
  const [deleteConfirmInvoice, setDeleteConfirmInvoice] = useState<any>(null);

  const { data: vaultInvoices = [], refetch: refetchVault } = useQuery<any[]>({
    queryKey: ["/api/sales-invoices"],
    queryFn: () => fetch("/api/sales-invoices").then((r) => r.json()),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/sales-invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-invoices"] });
      setSelectedInvoice(updated);
      setIsEditing(false);
      toast({ title: "Invoice updated" });
    },
    onError: () => toast({ title: "Update failed", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/sales-invoices/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-invoices"] });
      setDeleteConfirmInvoice(null);
      setIsVaultModalOpen(false);
      setSelectedInvoice(null);
      toast({ title: "Invoice deleted" });
    },
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  const openVaultModal = async (inv: any) => {
    try {
      const res = await fetch(`/api/sales-invoices/${inv.id}`);
      const full = await res.json();
      setSelectedInvoice(full);
      setIsVaultModalOpen(true);
      setIsEditing(false);
    } catch {
      toast({ title: "Failed to load invoice", variant: "destructive" });
    }
  };

  const startEdit = () => {
    setEditData({
      invoiceNumber: selectedInvoice.invoiceNumber,
      registeredName: selectedInvoice.registeredName,
      tin: selectedInvoice.tin || "",
      businessAddress: selectedInvoice.businessAddress || "",
      status: selectedInvoice.status,
      paymentMethod: selectedInvoice.paymentMethod,
      gcashRef: selectedInvoice.gcashRef || "",
      checkBankName: selectedInvoice.checkBankName || "",
      checkNumber: selectedInvoice.checkNumber || "",
      checkMaturityDate: selectedInvoice.checkMaturityDate || "",
      netDays: selectedInvoice.netDays || "",
      poNumber: selectedInvoice.poNumber || "",
      items: (selectedInvoice.items || []).map((it: any) => ({
        itemDescription: it.itemDescription,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        amount: it.amount,
      })),
    });
    setIsEditing(true);
  };

  const saveEdit = () => {
    if (!editData) return;
    const items = editData.items.map((it: any) => ({
      ...it,
      quantity: Number(it.quantity),
      unitPrice: String(it.unitPrice),
      amount: String(Number(it.quantity) * Number(it.unitPrice)),
    }));
    const total = items.reduce((s: number, i: any) => s + Number(i.amount), 0);
    const vat = total / 1.12;
    updateMutation.mutate({
      id: selectedInvoice.id,
      data: {
        ...editData,
        items,
        "totalAmount_Due": String(total),
        vatableSales: String(vat.toFixed(2)),
        vatAmount: String((total - vat).toFixed(2)),
      },
    });
  };

  const handleVaultReprint = (inv: any) => {
    setVaultPrintInvoice(inv);
    setTimeout(() => {
      document.body.classList.add("vault-printing");
      window.print();
      document.body.classList.remove("vault-printing");
    }, 300);
  };

  const handleVaultSavePDF = (inv: any) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 14;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("TRUCKGEAR.IO", margin, 18);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("VAT SALES INVOICE", pageW - margin, 18, { align: "right" });
    doc.text(`Invoice #: ${inv.invoiceNumber}`, pageW - margin, 24, { align: "right" });
    doc.text(`Date: ${new Date(inv.date || inv.createdAt).toLocaleDateString("en-PH")}`, pageW - margin, 29, { align: "right" });
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, 32, pageW - margin, 32);
    doc.setFontSize(9);
    doc.text(`Sold To: ${inv.registeredName}`, margin, 38);
    if (inv.tin) doc.text(`TIN: ${inv.tin}`, margin, 43);
    if (inv.businessAddress) doc.text(`Address: ${inv.businessAddress}`, margin, 48);
    let startY = inv.businessAddress ? 55 : inv.tin ? 50 : 45;
    autoTable(doc, {
      startY,
      head: [["Description", "Qty", "Unit Price", "Amount"]],
      body: (inv.items || []).map((it: any) => [
        it.itemDescription,
        it.quantity,
        `₱${Number(it.unitPrice).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
        `₱${Number(it.amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] },
      columnStyles: { 0: { cellWidth: "auto" }, 1: { cellWidth: 15, halign: "center" }, 2: { cellWidth: 35, halign: "right" }, 3: { cellWidth: 35, halign: "right" } },
      margin: { left: margin, right: margin },
    });
    const finalY = (doc as any).lastAutoTable.finalY + 5;
    const total = Number(inv.totalAmount_Due || 0);
    const vatAmt = Number(inv.vatAmount || 0);
    const vatSales = Number(inv.vatableSales || 0);
    doc.setFontSize(9);
    doc.text(`VATable Sales: ₱${vatSales.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`, pageW - margin, finalY, { align: "right" });
    doc.text(`VAT Amount (12%): ₱${vatAmt.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`, pageW - margin, finalY + 5, { align: "right" });
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(255, 220, 50);
    doc.rect(pageW - margin - 70, finalY + 8, 70, 10, "F");
    doc.text(`TOTAL DUE: ₱${total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`, pageW - margin - 2, finalY + 15, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Payment Method: ${inv.paymentMethod?.replace("_", " ") || "CASH"}  |  Status: ${inv.status}`, margin, finalY + 20);
    doc.save(`Invoice_${inv.invoiceNumber}_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  const filteredVaultInvoices = vaultInvoices.filter((inv) => {
    const matchSearch = !vaultSearch || inv.invoiceNumber?.toLowerCase().includes(vaultSearch.toLowerCase()) || inv.registeredName?.toLowerCase().includes(vaultSearch.toLowerCase());
    const matchStatus = vaultStatusFilter === "ALL" || inv.status === vaultStatusFilter;
    return matchSearch && matchStatus;
  });

  // INVENTORY QUERY
  const { data: productsData } = useQuery<Product[]>({
    queryKey: ["/api/products", searchTerm],
    queryFn: () =>
      fetch(`/api/products?search=${searchTerm}`).then((res) => res.json()),
    enabled: searchTerm.length > 0,
  });
  const products = Array.isArray(productsData) ? productsData : [];

  // DRAWER SYNC
  useEffect(() => {
    fetch("/api/pos/drawer-status")
      .then((res) => res.json())
      .then((data) => {
        if (data.active) setActiveSession(data.session);
        else setIsDrawerModalOpen(true);
      })
      .catch(() => setIsDrawerModalOpen(true));
  }, []);

  // --- MATH ENGINE ---
  const totalSales = items.reduce(
    (sum, item) => sum + item.qty * item.price,
    0,
  );
  const vatableSales = totalSales / 1.12;
  const vatAmount = totalSales - vatableSales;
  const withholdingTax = vatableSales * (withholdingTaxRate / 100);
  const totalAmount_Due = totalSales - withholdingTax;

  // --- DRAWER ACTIONS ---
  const handleOpenDrawer = async () => {
    const res = await fetch("/api/pos/drawer-open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openingBalance }),
    });
    const data = await res.json();
    setActiveSession(data);
    setIsDrawerModalOpen(false);
  };

  const handleRecordExpense = async () => {
    await fetch("/api/pos/expense", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...expense, sessionId: activeSession.id }),
    });
    toast({ title: "Expense Recorded" });
    setIsExpenseModalOpen(false);
    setExpense({ description: "", amount: "0" });
  };

  const handleCloseDrawer = async () => {
    await fetch("/api/pos/drawer-close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: activeSession.id, closingBalance }),
    });
    setActiveSession(null);
    setIsCloseDrawerModalOpen(false);
    setIsDrawerModalOpen(true);
  };

  // --- SAVE & PRINT ENGINE ---
  const handleSaveToVault = async () => {
    const validItems = items.filter((i) => i.description.trim() !== "");
    if (!invoiceNo)
      return toast({ title: "Invoice number is required", variant: "destructive" });
    if (paymentMethod === "NET_DAYS" && !customer.name)
      return toast({ title: "Customer name is required for NET Days", variant: "destructive" });
    if (!customer.name)
      return toast({ title: "Customer / Registered Name is required", variant: "destructive" });
    if (!activeSession) return setIsDrawerModalOpen(true);

    setIsSaving(true);
    try {
      const payload = {
        invoice: {
          invoiceNo,
          date,
          customer,
          type: customer.type,
          vatableSales: vatableSales.toFixed(2),
          vatAmount: vatAmount.toFixed(2),
          withholdingTax: withholdingTax.toFixed(2),
          totalAmountDue: totalAmount_Due.toFixed(2),
          drawerSessionId: activeSession.id,
          paymentMethod,
          gcashRef: paymentMethod === "GCASH" ? gcashRef : undefined,
          checkBankName: paymentMethod === "CHECK" ? checkBankName : undefined,
          checkNumber: paymentMethod === "CHECK" ? checkNumber : undefined,
          checkMaturityDate: paymentMethod === "CHECK" ? checkMaturityDate : undefined,
          netDays: paymentMethod === "NET_DAYS" ? Number(netDays) : undefined,
          poNumber: paymentMethod === "NET_DAYS" ? poNumber : undefined,
        },
        items: validItems.map((i) => ({ ...i, price: i.price.toString() })),
      };

      const res = await fetch("/api/vat-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error();
      const label = paymentMethod === "NET_DAYS" ? "Invoice saved as UNPAID (NET Days)" : "Invoice Vaulted";
      toast({ title: label });
      window.print();
      // Reset form
      setItems([{ description: "", qty: 1, price: 0 }]);
      setInvoiceNo("");
      setCustomer({ name: "", tin: "", address: "", type: "CASH SALES" });
      setGcashRef("");
      setCheckBankName("");
      setCheckNumber("");
      setCheckMaturityDate("");
      setNetDays("30");
      setPoNumber("");
    } catch (error) {
      toast({ title: "Error Saving", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto animate-in fade-in duration-500 print:p-0 print:m-0">
        <div className="print:hidden space-y-6">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                VAT Invoices (POS)
              </h1>
              <p className="text-sm text-gray-500 mt-1 uppercase font-black">
                {activeSession
                  ? `Drawer Open: ₱${activeSession.openingBalance} | Shift #${activeSession.id}`
                  : "Drawer Locked"}
              </p>
            </div>
            <div className="space-x-3">
              <button
                onClick={() => setIsExpenseModalOpen(true)}
                className="bg-amber-50 text-amber-700 border border-amber-200 px-4 py-2 rounded-md font-medium inline-flex items-center"
              >
                <ArrowUpCircle className="w-4 h-4 mr-2" /> Cash Out
              </button>
              <button
                onClick={() => setIsCloseDrawerModalOpen(true)}
                className="bg-red-50 text-red-700 border border-red-200 px-4 py-2 rounded-md font-medium inline-flex items-center"
              >
                <X className="w-4 h-4 mr-2" /> Close Shift
              </button>
              <button
                onClick={() => setIsInventoryModalOpen(true)}
                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md font-medium shadow-sm inline-flex items-center"
              >
                <Search className="w-4 h-4 mr-2" /> Find Part
              </button>
              <button
                onClick={() => setShowCalibrationPreview(true)}
                className="bg-gray-100 border border-gray-300 text-gray-700 px-4 py-2 rounded-md font-medium shadow-sm inline-flex items-center"
                title="Preview print alignment against your form"
              >
                <Eye className="w-4 h-4 mr-2" /> Preview Layout
              </button>
              <button
                onClick={handleSaveToVault}
                disabled={isSaving}
                className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium shadow-sm inline-flex items-center disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Printer className="w-4 h-4 mr-2" />
                )}{" "}
                Finalize & Print
              </button>
            </div>
          </div>

          {/* ── Tab Switcher ── */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
            {[
              { key: "new", label: "New Invoice", icon: FileText },
              { key: "vault", label: "Invoice Vault", icon: Archive },
            ].map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setPosTab(key as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${posTab === key ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                <Icon className="h-4 w-4" />{label}
                {key === "vault" && vaultInvoices.length > 0 && (
                  <span className="ml-1 bg-blue-100 text-blue-700 rounded-full text-xs px-2">{vaultInvoices.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* ── Invoice Vault Tab ── */}
          {posTab === "vault" && (
            <div className="space-y-4">
              {/* Search + Filter Bar */}
              <div className="flex gap-3 items-center">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Search invoice # or customer..."
                    value={vaultSearch}
                    onChange={(e) => setVaultSearch(e.target.value)}
                  />
                </div>
                <select
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none"
                  value={vaultStatusFilter}
                  onChange={(e) => setVaultStatusFilter(e.target.value)}
                >
                  {["ALL", "PAID", "UNPAID", "BILLED"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button onClick={() => refetchVault()}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                  Refresh
                </button>
              </div>

              {/* Invoice Table */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">Invoice #</th>
                      <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">Customer</th>
                      <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">Date</th>
                      <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">Method</th>
                      <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase">Status</th>
                      <th className="text-right px-4 py-3 font-bold text-gray-600 text-xs uppercase">Total</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredVaultInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-gray-400">No invoices found.</td>
                      </tr>
                    ) : filteredVaultInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-blue-50 transition-colors cursor-pointer"
                        onClick={() => openVaultModal(inv)}>
                        <td className="px-4 py-3 font-mono font-bold text-blue-700">{inv.invoiceNumber}</td>
                        <td className="px-4 py-3 text-gray-800">{inv.registeredName}</td>
                        <td className="px-4 py-3 text-gray-500">{new Date(inv.date || inv.createdAt).toLocaleDateString("en-PH")}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${inv.paymentMethod === "CASH" ? "bg-green-100 text-green-700" : inv.paymentMethod === "GCASH" ? "bg-blue-100 text-blue-700" : inv.paymentMethod === "CHECK" ? "bg-purple-100 text-purple-700" : "bg-amber-100 text-amber-700"}`}>
                            {inv.paymentMethod?.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${inv.status === "PAID" ? "bg-emerald-100 text-emerald-700" : inv.status === "UNPAID" ? "bg-red-100 text-red-700" : inv.status === "BILLED" ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-700"}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">
                          ₱{Number(inv.totalAmount_Due || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end items-center gap-3">
                            <button className="text-blue-600 hover:text-blue-800 font-medium text-xs underline" onClick={(e) => { e.stopPropagation(); openVaultModal(inv); }}>
                              Open
                            </button>
                            <button className="text-red-500 hover:text-red-700" title="Delete invoice" onClick={(e) => { e.stopPropagation(); setDeleteConfirmInvoice(inv); }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --- ORIGINAL FORM SECTION (UNTOUCHED) --- */}
          {posTab === "new" && <>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Registered Name
                </label>
                <input
                  type="text"
                  className="w-full border p-2 rounded outline-none uppercase font-bold"
                  value={customer.name}
                  onChange={(e) =>
                    setCustomer({ ...customer, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Business Address
                </label>
                <input
                  type="text"
                  className="w-full border p-2 rounded outline-none uppercase"
                  value={customer.address}
                  onChange={(e) =>
                    setCustomer({ ...customer, address: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Invoice Number
                  </label>
                  <input
                    type="text"
                    className="w-full border p-2 rounded font-mono text-red-600 outline-none font-bold"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    className="w-full border p-2 rounded outline-none font-bold"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    TIN
                  </label>
                  <input
                    type="text"
                    className="w-full border p-2 rounded outline-none"
                    value={customer.tin}
                    onChange={(e) =>
                      setCustomer({ ...customer, tin: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    WHT (%)
                  </label>
                  <input
                    type="number"
                    className="w-full border p-2 rounded outline-none font-bold"
                    value={withholdingTaxRate}
                    onChange={(e) =>
                      setWithholdingTaxRate(Number(e.target.value))
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {/* --- TABLE SECTION --- */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr className="text-xs uppercase tracking-wider text-gray-500 font-bold">
                  <th className="p-4 w-1/2">Item Description</th>
                  <th className="p-4">Qty</th>
                  <th className="p-4">Unit Price</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className="p-2">
                      <input
                        type="text"
                        className="w-full p-2 border rounded uppercase font-bold text-sm"
                        value={item.description}
                        onChange={(e) => {
                          const n = [...items];
                          n[index].description = e.target.value;
                          setItems(n);
                        }}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        className="w-full p-2 border rounded font-bold"
                        value={item.qty}
                        onChange={(e) => {
                          const n = [...items];
                          n[index].qty = Number(e.target.value);
                          setItems(n);
                        }}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        className="w-full p-2 border rounded font-bold"
                        value={item.price}
                        onChange={(e) => {
                          const n = [...items];
                          n[index].price = Number(e.target.value);
                          setItems(n);
                        }}
                      />
                    </td>
                    <td className="p-4 text-right font-mono font-bold">
                      ₱
                      {(item.qty * item.price).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() =>
                          setItems(items.filter((_, i) => i !== index))
                        }
                        className="text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() =>
                  setItems([...items, { description: "", qty: 1, price: 0 }])
                }
                className="text-sm font-bold text-blue-600 uppercase flex items-center"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Row
              </button>
            </div>
          </div>

          <div className="flex justify-between items-start pt-4 gap-4">
            {/* PAYMENT METHOD PANEL */}
            <div className="flex-1 bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
              <p className="text-xs font-bold uppercase text-gray-500">Payment Method</p>
              <div className="grid grid-cols-4 gap-2">
                {(["CASH", "GCASH", "CHECK", "NET_DAYS"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setPaymentMethod(m)}
                    className={`py-2 px-3 rounded-lg text-sm font-bold uppercase border-2 transition-all ${
                      paymentMethod === m
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-gray-200 bg-gray-50 text-gray-600 hover:border-blue-300"
                    }`}
                  >
                    {m === "NET_DAYS" ? "NET Days" : m}
                  </button>
                ))}
              </div>

              {/* GCash Fields */}
              {paymentMethod === "GCASH" && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">GCash Reference No.</label>
                  <input
                    type="text"
                    className="w-full border p-2 rounded outline-none font-mono font-bold"
                    placeholder="e.g. 1234567890"
                    value={gcashRef}
                    onChange={(e) => setGcashRef(e.target.value)}
                  />
                </div>
              )}

              {/* Check Fields */}
              {paymentMethod === "CHECK" && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bank Name</label>
                    <input
                      type="text"
                      className="w-full border p-2 rounded outline-none uppercase font-bold text-sm"
                      placeholder="e.g. BDO"
                      value={checkBankName}
                      onChange={(e) => setCheckBankName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Check Number</label>
                    <input
                      type="text"
                      className="w-full border p-2 rounded outline-none font-mono font-bold text-sm"
                      placeholder="0000000"
                      value={checkNumber}
                      onChange={(e) => setCheckNumber(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Maturity Date</label>
                    <input
                      type="date"
                      className="w-full border p-2 rounded outline-none font-bold text-sm"
                      value={checkMaturityDate}
                      onChange={(e) => setCheckMaturityDate(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* NET Days Fields */}
              {paymentMethod === "NET_DAYS" && (
                <div className="space-y-2">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-bold uppercase">
                    Customer selection is required. Invoice will be saved as UNPAID and linked to Billing Collection.
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">NET Days</label>
                      <select
                        className="w-full border p-2 rounded outline-none font-bold"
                        value={netDays}
                        onChange={(e) => setNetDays(e.target.value)}
                      >
                        <option value="15">NET 15</option>
                        <option value="30">NET 30</option>
                        <option value="45">NET 45</option>
                        <option value="60">NET 60</option>
                        <option value="90">NET 90</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">P.O. Number</label>
                      <input
                        type="text"
                        className="w-full border p-2 rounded outline-none font-mono font-bold text-sm"
                        placeholder="PO-XXXXXX"
                        value={poNumber}
                        onChange={(e) => setPoNumber(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* TOTALS PANEL */}
            <div className="w-80 bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-3">
              <div className="flex justify-between text-xs font-bold uppercase text-gray-500">
                <span>VATable Sales</span>
                <span className="font-mono">
                  ₱{vatableSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-xs font-bold uppercase text-gray-500">
                <span>VAT (12%)</span>
                <span className="font-mono">
                  ₱{vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              {withholdingTax > 0 && (
                <div className="flex justify-between text-xs font-bold uppercase text-gray-500">
                  <span>WHT ({withholdingTaxRate}%)</span>
                  <span className="font-mono text-red-500">
                    -₱{withholdingTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-black text-2xl uppercase tracking-tighter text-blue-700">
                <span>Total Due</span>
                <span className="font-mono">
                  ₱{totalAmount_Due.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="pt-1 text-center">
                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                  paymentMethod === "NET_DAYS"
                    ? "bg-amber-100 text-amber-700"
                    : paymentMethod === "CHECK"
                    ? "bg-purple-100 text-purple-700"
                    : paymentMethod === "GCASH"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-green-100 text-green-700"
                }`}>
                  {paymentMethod === "NET_DAYS" ? `NET ${netDays}` : paymentMethod}
                </span>
              </div>
            </div>
          </div>
          </>}
        </div>

        {/* ── INVOICE VAULT MODAL ── */}
        {isVaultModalOpen && selectedInvoice && (
          <div className="fixed inset-0 bg-black/70 z-[300] flex items-start justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Invoice #{isEditing ? editData?.invoiceNumber : selectedInvoice.invoiceNumber}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{new Date(selectedInvoice.date || selectedInvoice.createdAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!isEditing ? (
                    <>
                      <button onClick={startEdit}
                        className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-medium hover:bg-amber-100">
                        <Pencil className="h-4 w-4" /> Edit
                      </button>
                      <button onClick={() => handleVaultReprint(selectedInvoice)}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-200">
                        <Printer className="h-4 w-4" /> Reprint
                      </button>
                      <button onClick={() => handleVaultSavePDF(selectedInvoice)}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                        <Download className="h-4 w-4" /> Save PDF
                      </button>
                      <button onClick={() => setDeleteConfirmInvoice(selectedInvoice)}
                        className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100">
                        <Trash2 className="h-4 w-4" /> Delete
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={saveEdit} disabled={updateMutation.isPending}
                        className="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
                        {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save Changes
                      </button>
                      <button onClick={() => setIsEditing(false)}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200">
                        <X className="h-4 w-4" /> Cancel
                      </button>
                    </>
                  )}
                  <button onClick={() => { setIsVaultModalOpen(false); setIsEditing(false); }}
                    className="ml-2 p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-5">
                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Registered Name</label>
                    {isEditing ? (
                      <input className="w-full border rounded-lg px-3 py-2 text-sm" value={editData.registeredName}
                        onChange={(e) => setEditData({ ...editData, registeredName: e.target.value })} />
                    ) : <p className="text-sm font-semibold text-gray-800">{selectedInvoice.registeredName}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">TIN</label>
                    {isEditing ? (
                      <input className="w-full border rounded-lg px-3 py-2 text-sm" value={editData.tin}
                        onChange={(e) => setEditData({ ...editData, tin: e.target.value })} />
                    ) : <p className="text-sm text-gray-700">{selectedInvoice.tin || "—"}</p>}
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Business Address</label>
                    {isEditing ? (
                      <input className="w-full border rounded-lg px-3 py-2 text-sm" value={editData.businessAddress}
                        onChange={(e) => setEditData({ ...editData, businessAddress: e.target.value })} />
                    ) : <p className="text-sm text-gray-700">{selectedInvoice.businessAddress || "—"}</p>}
                  </div>
                </div>

                {/* Payment + Status */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Payment Method</label>
                    {isEditing ? (
                      <select className="w-full border rounded-lg px-3 py-2 text-sm" value={editData.paymentMethod}
                        onChange={(e) => setEditData({ ...editData, paymentMethod: e.target.value })}>
                        {["CASH", "GCASH", "CHECK", "NET_DAYS"].map((m) => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
                      </select>
                    ) : (
                      <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${selectedInvoice.paymentMethod === "CASH" ? "bg-green-100 text-green-700" : selectedInvoice.paymentMethod === "GCASH" ? "bg-blue-100 text-blue-700" : selectedInvoice.paymentMethod === "CHECK" ? "bg-purple-100 text-purple-700" : "bg-amber-100 text-amber-700"}`}>
                        {selectedInvoice.paymentMethod?.replace("_", " ")}
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Status</label>
                    {isEditing ? (
                      <select className="w-full border rounded-lg px-3 py-2 text-sm" value={editData.status}
                        onChange={(e) => setEditData({ ...editData, status: e.target.value })}>
                        {["PAID", "UNPAID", "BILLED"].map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${selectedInvoice.status === "PAID" ? "bg-emerald-100 text-emerald-700" : selectedInvoice.status === "UNPAID" ? "bg-red-100 text-red-700" : "bg-indigo-100 text-indigo-700"}`}>
                        {selectedInvoice.status}
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Invoice #</label>
                    {isEditing ? (
                      <input className="w-full border rounded-lg px-3 py-2 text-sm" value={editData.invoiceNumber}
                        onChange={(e) => setEditData({ ...editData, invoiceNumber: e.target.value })} />
                    ) : <p className="text-sm font-mono font-bold text-blue-700">{selectedInvoice.invoiceNumber}</p>}
                  </div>
                </div>

                {/* Payment-specific fields */}
                {isEditing && editData.paymentMethod === "GCASH" && (
                  <div><label className="text-xs font-bold uppercase text-gray-500 mb-1 block">GCash Ref #</label>
                    <input className="w-full border rounded-lg px-3 py-2 text-sm" value={editData.gcashRef}
                      onChange={(e) => setEditData({ ...editData, gcashRef: e.target.value })} />
                  </div>
                )}
                {isEditing && editData.paymentMethod === "CHECK" && (
                  <div className="grid grid-cols-3 gap-4">
                    <div><label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Bank</label>
                      <input className="w-full border rounded-lg px-3 py-2 text-sm" value={editData.checkBankName}
                        onChange={(e) => setEditData({ ...editData, checkBankName: e.target.value })} />
                    </div>
                    <div><label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Check #</label>
                      <input className="w-full border rounded-lg px-3 py-2 text-sm" value={editData.checkNumber}
                        onChange={(e) => setEditData({ ...editData, checkNumber: e.target.value })} />
                    </div>
                    <div><label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Maturity Date</label>
                      <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm" value={editData.checkMaturityDate}
                        onChange={(e) => setEditData({ ...editData, checkMaturityDate: e.target.value })} />
                    </div>
                  </div>
                )}
                {isEditing && editData.paymentMethod === "NET_DAYS" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs font-bold uppercase text-gray-500 mb-1 block">NET Days</label>
                      <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={editData.netDays}
                        onChange={(e) => setEditData({ ...editData, netDays: e.target.value })} />
                    </div>
                    <div><label className="text-xs font-bold uppercase text-gray-500 mb-1 block">PO Number</label>
                      <input className="w-full border rounded-lg px-3 py-2 text-sm" value={editData.poNumber}
                        onChange={(e) => setEditData({ ...editData, poNumber: e.target.value })} />
                    </div>
                  </div>
                )}

                {/* Line Items */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold uppercase text-gray-500">Line Items</label>
                    {isEditing && (
                      <button onClick={() => setEditData({ ...editData, items: [...editData.items, { itemDescription: "", quantity: 1, unitPrice: "0", amount: "0" }] })}
                        className="flex items-center gap-1 text-xs text-blue-600 font-medium hover:underline">
                        <Plus className="h-3.5 w-3.5" /> Add Row
                      </button>
                    )}
                  </div>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2 text-xs font-bold text-gray-500 uppercase">Description</th>
                          <th className="text-center px-3 py-2 text-xs font-bold text-gray-500 uppercase w-16">Qty</th>
                          <th className="text-right px-3 py-2 text-xs font-bold text-gray-500 uppercase w-28">Unit Price</th>
                          <th className="text-right px-3 py-2 text-xs font-bold text-gray-500 uppercase w-28">Amount</th>
                          {isEditing && <th className="w-8"></th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(isEditing ? editData.items : selectedInvoice.items || []).map((it: any, idx: number) => (
                          <tr key={idx}>
                            <td className="px-3 py-2">
                              {isEditing ? (
                                <input className="w-full border-0 bg-transparent text-sm focus:ring-1 focus:ring-blue-300 rounded px-1" value={it.itemDescription}
                                  onChange={(e) => {
                                    const items = [...editData.items]; items[idx] = { ...items[idx], itemDescription: e.target.value };
                                    setEditData({ ...editData, items });
                                  }} />
                              ) : <span className="text-gray-800">{it.itemDescription}</span>}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {isEditing ? (
                                <input type="number" className="w-full border-0 bg-transparent text-sm text-center focus:ring-1 focus:ring-blue-300 rounded" value={it.quantity}
                                  onChange={(e) => {
                                    const items = [...editData.items]; items[idx] = { ...items[idx], quantity: e.target.value, amount: String(Number(e.target.value) * Number(items[idx].unitPrice)) };
                                    setEditData({ ...editData, items });
                                  }} />
                              ) : it.quantity}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {isEditing ? (
                                <input type="number" className="w-full border-0 bg-transparent text-sm text-right focus:ring-1 focus:ring-blue-300 rounded" value={it.unitPrice}
                                  onChange={(e) => {
                                    const items = [...editData.items]; items[idx] = { ...items[idx], unitPrice: e.target.value, amount: String(Number(items[idx].quantity) * Number(e.target.value)) };
                                    setEditData({ ...editData, items });
                                  }} />
                              ) : `₱${Number(it.unitPrice).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`}
                            </td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-gray-800">
                              ₱{Number(isEditing ? it.amount : it.amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                            </td>
                            {isEditing && (
                              <td className="px-2 py-2">
                                <button onClick={() => { const items = editData.items.filter((_: any, i: number) => i !== idx); setEditData({ ...editData, items }); }}
                                  className="text-red-400 hover:text-red-600">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="text-sm space-y-1 text-right min-w-[220px]">
                    <div className="flex justify-between gap-8 text-gray-600">
                      <span>VATable Sales</span>
                      <span className="font-mono">₱{Number(isEditing ? (editData.items.reduce((s: number, i: any) => s + Number(i.amount), 0) / 1.12) : (selectedInvoice.vatableSales || 0)).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between gap-8 text-gray-600">
                      <span>VAT (12%)</span>
                      <span className="font-mono">₱{Number(isEditing ? (editData.items.reduce((s: number, i: any) => s + Number(i.amount), 0) - editData.items.reduce((s: number, i: any) => s + Number(i.amount), 0) / 1.12) : (selectedInvoice.vatAmount || 0)).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between gap-8 font-black text-lg border-t pt-2 bg-yellow-50 px-3 py-2 rounded-lg">
                      <span>TOTAL DUE</span>
                      <span className="font-mono text-blue-700">
                        ₱{Number(isEditing ? editData.items.reduce((s: number, i: any) => s + Number(i.amount), 0) : (selectedInvoice.totalAmount_Due || 0)).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── VAULT REPRINT AREA (A5 — identical layout to main print area) ── */}
        {vaultPrintInvoice && (
          <div
            id="vault-print-area"
            className="hidden print:block"
            style={{
              position: "relative",
              width: "148mm",
              height: "210mm",
              margin: "0",
              padding: "0",
              overflow: "hidden",
              background: "transparent",
              fontFamily: "'Courier New', Courier, monospace",
              fontSize: "10pt",
              color: "black",
            }}
          >
            {/* DATE */}
            <div style={{ position: "absolute", top: "23mm", left: "115mm", fontFamily: "monospace" }}>
              {new Date(vaultPrintInvoice.date || vaultPrintInvoice.createdAt).toLocaleDateString("en-PH")}
            </div>

            {/* CUSTOMER NAME */}
            <div style={{ position: "absolute", top: "29mm", left: "40mm", width: "100mm", fontFamily: "monospace", whiteSpace: "nowrap", overflow: "hidden" }}>
              {vaultPrintInvoice.registeredName}
            </div>

            {/* TIN */}
            <div style={{ position: "absolute", top: "35mm", left: "40mm", width: "100mm", fontFamily: "monospace", whiteSpace: "nowrap", overflow: "hidden" }}>
              {vaultPrintInvoice.tin}
            </div>

            {/* BUSINESS ADDRESS */}
            <div style={{ position: "absolute", top: "41mm", left: "40mm", width: "100mm", fontFamily: "monospace", lineHeight: "5mm", whiteSpace: "nowrap", overflow: "hidden" }}>
              {vaultPrintInvoice.businessAddress}
            </div>

            {/* ITEMS TABLE */}
            {(vaultPrintInvoice.items || []).map((it: any, index: number) => (
              <div key={index} style={{ position: "absolute", top: `${62 + index * 6.8}mm`, left: "0", width: "148mm", fontFamily: "monospace" }}>
                <div style={{ position: "absolute", left: "10mm", width: "88mm", overflow: "hidden", whiteSpace: "nowrap" }}>
                  {it.itemDescription}
                </div>
                <div style={{ position: "absolute", left: "100mm", width: "13mm", textAlign: "center" }}>
                  {it.quantity}
                </div>
                <div style={{ position: "absolute", left: "115mm", width: "18mm", textAlign: "right" }}>
                  {Number(it.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div style={{ position: "absolute", left: "135mm", width: "13mm", textAlign: "right" }}>
                  {Number(it.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))}

            {/* RIGHT: Total Sales (VATable) */}
            <div style={{ position: "absolute", top: "126mm", left: "135mm", width: "13mm", textAlign: "right", fontFamily: "monospace" }}>
              {Number(vaultPrintInvoice.vatableSales || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>

            {/* RIGHT: VAT Amount (12%) */}
            <div style={{ position: "absolute", top: "132mm", left: "135mm", width: "13mm", textAlign: "right", fontFamily: "monospace" }}>
              {Number(vaultPrintInvoice.vatAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>

            {/* RIGHT: Withholding Tax — only if > 0 */}
            {Number(vaultPrintInvoice.withholdingTax || 0) > 0 && (
              <div style={{ position: "absolute", top: "144mm", left: "135mm", width: "13mm", textAlign: "right", fontFamily: "monospace" }}>
                {Number(vaultPrintInvoice.withholdingTax || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            )}

            {/* RIGHT: Total Amount Due */}
            <div style={{ position: "absolute", top: "165mm", left: "135mm", width: "13mm", textAlign: "right", fontFamily: "monospace", fontWeight: "bold" }}>
              {Number(vaultPrintInvoice.totalAmount_Due || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>

            {/* LEFT: Vatable Sales */}
            <div style={{ position: "absolute", top: "150mm", left: "55mm", width: "18mm", textAlign: "right", fontFamily: "monospace" }}>
              {Number(vaultPrintInvoice.vatableSales || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>

            {/* LEFT: VAT Amount */}
            <div style={{ position: "absolute", top: "156mm", left: "55mm", width: "18mm", textAlign: "right", fontFamily: "monospace" }}>
              {Number(vaultPrintInvoice.vatAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>

            {/* LEFT: Zero Rated Sales */}
            <div style={{ position: "absolute", top: "162mm", left: "55mm", width: "18mm", textAlign: "right", fontFamily: "monospace" }}>
              0.00
            </div>

            {/* LEFT: VAT-Exempt Sales */}
            <div style={{ position: "absolute", top: "168mm", left: "55mm", width: "18mm", textAlign: "right", fontFamily: "monospace" }}>
              0.00
            </div>
          </div>
        )}

        {/* MODALS: EXPENSE & CLOSE DRAWER */}
        {isExpenseModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-xl w-full max-w-md shadow-2xl space-y-4 border-t-8 border-amber-500">
              <h2 className="text-xl font-bold uppercase">
                Record Expense (Cash Out)
              </h2>
              <input
                placeholder="DESCRIPTION (e.g. SNACKS, FUEL)"
                className="w-full p-4 border rounded font-bold uppercase"
                value={expense.description}
                onChange={(e) =>
                  setExpense({ ...expense, description: e.target.value })
                }
              />
              <input
                type="number"
                placeholder="AMOUNT"
                className="w-full p-4 border rounded font-bold"
                value={expense.amount}
                onChange={(e) =>
                  setExpense({ ...expense, amount: e.target.value })
                }
              />
              <button
                onClick={handleRecordExpense}
                className="w-full bg-amber-600 text-white py-4 rounded font-bold uppercase"
              >
                Deduct from Drawer
              </button>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="w-full text-xs font-bold text-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {isCloseDrawerModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4">
            <div className="bg-white p-12 rounded-2xl w-full max-w-md shadow-2xl space-y-6 border-t-8 border-red-600 text-center">
              <h2 className="text-2xl font-bold uppercase">
                End of Day (Close Shift)
              </h2>
              <p className="text-sm text-gray-500 uppercase font-bold">
                Count the physical cash in your drawer and enter it below.
              </p>
              <input
                type="number"
                placeholder="ACTUAL CASH ON HAND"
                className="w-full p-6 border-4 border-gray-100 text-center text-4xl font-bold rounded-2xl"
                value={closingBalance}
                onChange={(e) => setClosingBalance(e.target.value)}
              />
              <button
                onClick={handleCloseDrawer}
                className="w-full bg-red-600 text-white py-6 rounded-2xl font-bold uppercase tracking-widest"
              >
                Submit & Close Session
              </button>
              <button
                onClick={() => setIsCloseDrawerModalOpen(false)}
                className="w-full text-xs font-bold text-gray-400"
              >
                Go Back
              </button>
            </div>
          </div>
        )}

        {/* --- DRAWER INITIALIZATION & PRINT AREA (REMAIN UNCHANGED) --- */}
        {isDrawerModalOpen && (
          <div className="fixed inset-0 bg-slate-900 z-[300] flex items-center justify-center">
            <div className="bg-white p-12 rounded-2xl text-center space-y-8 w-[400px] shadow-2xl border-b-8 border-blue-600">
              <Banknote className="mx-auto h-16 w-16 text-blue-600" />
              <h2 className="text-2xl font-bold uppercase tracking-tight">
                Open Terminal
              </h2>
              <input
                type="number"
                className="w-full p-4 border-2 border-gray-100 text-center text-4xl font-bold rounded-xl"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
              />
              <button
                onClick={handleOpenDrawer}
                className="w-full bg-blue-600 text-white py-6 rounded-xl font-bold uppercase tracking-widest text-lg"
              >
                Start Shift
              </button>
            </div>
          </div>
        )}

        {/* ── CALIBRATION PREVIEW MODAL ── */}
        {showCalibrationPreview && (
          <div className="fixed inset-0 bg-black/80 z-[500] flex flex-col items-center justify-start overflow-y-auto py-8">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-4">
                <p className="text-white font-bold text-lg">Print Layout Preview — your data overlaid on the form</p>
                <button
                  onClick={() => setShowCalibrationPreview(false)}
                  className="bg-white text-black px-4 py-2 rounded font-bold"
                >
                  Close
                </button>
              </div>
              {/* A5 calibration preview — form as background, data overlaid in red */}
              <div
                style={{
                  position: "relative",
                  width: "148mm",
                  height: "210mm",
                  backgroundImage: "url('/invoice-form.jpg')",
                  backgroundSize: "100% 100%",
                  backgroundRepeat: "no-repeat",
                  fontFamily: "'Courier New', Courier, monospace",
                  fontSize: "10pt",
                  color: "red",
                  boxShadow: "0 0 30px rgba(0,0,0,0.5)",
                  flexShrink: 0,
                }}
              >
                <div style={{ position: "absolute", top: "23mm", left: "115mm", fontFamily: "monospace" }}>{date}</div>
                <div style={{ position: "absolute", top: "29mm", left: "40mm", width: "100mm", fontFamily: "monospace", whiteSpace: "nowrap", overflow: "hidden" }}>{customer.name}</div>
                <div style={{ position: "absolute", top: "35mm", left: "40mm", width: "100mm", fontFamily: "monospace", whiteSpace: "nowrap", overflow: "hidden" }}>{customer.tin}</div>
                <div style={{ position: "absolute", top: "41mm", left: "40mm", width: "100mm", fontFamily: "monospace", lineHeight: "5mm", whiteSpace: "nowrap", overflow: "hidden" }}>{customer.address}</div>
                {items.filter((i) => i.description.trim() !== "").map((item, index) => (
                  <div key={index} style={{ position: "absolute", top: `${62 + index * 6.8}mm`, left: "0", width: "148mm", fontFamily: "monospace" }}>
                    <div style={{ position: "absolute", left: "10mm", width: "88mm", overflow: "hidden", whiteSpace: "nowrap" }}>{item.description}</div>
                    <div style={{ position: "absolute", left: "100mm", width: "13mm", textAlign: "center" }}>{item.qty}</div>
                    <div style={{ position: "absolute", left: "115mm", width: "18mm", textAlign: "right" }}>{Number(item.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    <div style={{ position: "absolute", left: "135mm", width: "13mm", textAlign: "right" }}>{(item.qty * item.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </div>
                ))}
                {/* RIGHT: VATable Sales row */}
                <div style={{ position: "absolute", top: "126mm", left: "135mm", width: "13mm", textAlign: "right", fontFamily: "monospace" }}>{vatableSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                {/* RIGHT: VAT Amount row */}
                <div style={{ position: "absolute", top: "132mm", left: "135mm", width: "13mm", textAlign: "right", fontFamily: "monospace" }}>{vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                {/* RIGHT: Withholding Tax */}
                {withholdingTax > 0 && (
                  <div style={{ position: "absolute", top: "144mm", left: "135mm", width: "13mm", textAlign: "right", fontFamily: "monospace" }}>{withholdingTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                )}
                {/* RIGHT: Total Amount Due */}
                <div style={{ position: "absolute", top: "165mm", left: "135mm", width: "13mm", textAlign: "right", fontFamily: "monospace", fontWeight: "bold" }}>{totalAmount_Due.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                {/* LEFT: Vatable Sales */}
                <div style={{ position: "absolute", top: "150mm", left: "55mm", width: "18mm", textAlign: "right", fontFamily: "monospace" }}>{vatableSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                {/* LEFT: VAT Amount */}
                <div style={{ position: "absolute", top: "156mm", left: "55mm", width: "18mm", textAlign: "right", fontFamily: "monospace" }}>{vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                {/* LEFT: Zero Rated Sales */}
                <div style={{ position: "absolute", top: "162mm", left: "55mm", width: "18mm", textAlign: "right", fontFamily: "monospace" }}>0.00</div>
                {/* LEFT: VAT-Exempt Sales */}
                <div style={{ position: "absolute", top: "168mm", left: "55mm", width: "18mm", textAlign: "right", fontFamily: "monospace" }}>0.00</div>
              </div>
              <p className="text-yellow-300 text-sm max-w-md text-center">
                Red text shows where your data will print. If any value is misaligned, tell me by how many mm to move it (e.g. "invoice number 3mm left, 2mm down").
              </p>
            </div>
          </div>
        )}

        {/* ── MAIN INVOICE PRINT AREA (A5 absolute positioning for pre-printed form) ── */}
        <div
          id="print-area"
          className="hidden print:block"
          style={{
            position: "relative",
            width: "148mm",
            height: "210mm",
            margin: "0",
            padding: "0",
            overflow: "hidden",
            background: "transparent",
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: "10pt",
            color: "black",
          }}
        >
          {/* DATE — top +5mm from previous; adjust left if needed */}
          <div style={{ position: "absolute", top: "23mm", left: "115mm", fontFamily: "monospace" }}>
            {date}
          </div>

          {/* CUSTOMER NAME — top +5mm from previous */}
          <div style={{ position: "absolute", top: "29mm", left: "40mm", width: "100mm", fontFamily: "monospace", whiteSpace: "nowrap", overflow: "hidden" }}>
            {customer.name}
          </div>

          {/* TIN — between customer name and address; adjust top if needed */}
          <div style={{ position: "absolute", top: "35mm", left: "40mm", width: "100mm", fontFamily: "monospace", whiteSpace: "nowrap", overflow: "hidden" }}>
            {customer.tin}
          </div>

          {/* BUSINESS ADDRESS — top +5mm from previous */}
          <div style={{ position: "absolute", top: "41mm", left: "40mm", width: "100mm", fontFamily: "monospace", lineHeight: "5mm", whiteSpace: "nowrap", overflow: "hidden" }}>
            {customer.address}
          </div>

          {/* ITEMS TABLE — base 62mm (+4mm); columns shifted right by 5mm */}
          {items.filter((i) => i.description.trim() !== "").map((item, index) => (
            <div key={index} style={{ position: "absolute", top: `${62 + index * 6.8}mm`, left: "0", width: "148mm", fontFamily: "monospace" }}>
              {/* Description — left: 10mm */}
              <div style={{ position: "absolute", left: "10mm", width: "88mm", overflow: "hidden", whiteSpace: "nowrap" }}>
                {item.description}
              </div>
              {/* Qty — left: 100mm (+5mm) */}
              <div style={{ position: "absolute", left: "100mm", width: "13mm", textAlign: "center" }}>
                {item.qty}
              </div>
              {/* Unit Price — left: 115mm (+5mm) */}
              <div style={{ position: "absolute", left: "115mm", width: "18mm", textAlign: "right" }}>
                {Number(item.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              {/* Row Total — left: 135mm (+5mm) */}
              <div style={{ position: "absolute", left: "135mm", width: "13mm", textAlign: "right" }}>
                {(item.qty * item.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
          ))}

          {/* RIGHT: Total Sales (VATable) */}
          <div style={{ position: "absolute", top: "126mm", left: "135mm", width: "13mm", textAlign: "right", fontFamily: "monospace" }}>
            {vatableSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>

          {/* RIGHT: VAT Amount (12%) */}
          <div style={{ position: "absolute", top: "132mm", left: "135mm", width: "13mm", textAlign: "right", fontFamily: "monospace" }}>
            {vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>

          {/* RIGHT: Withholding Tax — only prints if WHT > 0 */}
          {withholdingTax > 0 && (
            <div style={{ position: "absolute", top: "144mm", left: "135mm", width: "13mm", textAlign: "right", fontFamily: "monospace" }}>
              {withholdingTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          )}

          {/* RIGHT: Total Amount Due */}
          <div style={{ position: "absolute", top: "165mm", left: "135mm", width: "13mm", textAlign: "right", fontFamily: "monospace", fontWeight: "bold" }}>
            {totalAmount_Due.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>

          {/* LEFT: Vatable Sales */}
          <div style={{ position: "absolute", top: "150mm", left: "55mm", width: "18mm", textAlign: "right", fontFamily: "monospace" }}>
            {vatableSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>

          {/* LEFT: VAT Amount */}
          <div style={{ position: "absolute", top: "156mm", left: "55mm", width: "18mm", textAlign: "right", fontFamily: "monospace" }}>
            {vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>

          {/* LEFT: Zero Rated Sales */}
          <div style={{ position: "absolute", top: "162mm", left: "55mm", width: "18mm", textAlign: "right", fontFamily: "monospace" }}>
            0.00
          </div>

          {/* LEFT: VAT-Exempt Sales */}
          <div style={{ position: "absolute", top: "168mm", left: "55mm", width: "18mm", textAlign: "right", fontFamily: "monospace" }}>
            0.00
          </div>
        </div>
      </div>

      {/* ── DELETE CONFIRMATION DIALOG ── */}
      {deleteConfirmInvoice && (
        <div className="fixed inset-0 bg-black/60 z-[400] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Delete Invoice</h3>
                <p className="text-sm text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-6">
              Are you sure you want to delete invoice <span className="font-bold text-gray-900">#{deleteConfirmInvoice.invoiceNumber}</span> for <span className="font-semibold">{deleteConfirmInvoice.registeredName}</span>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmInvoice(null)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirmInvoice.id)}
                disabled={deleteMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
