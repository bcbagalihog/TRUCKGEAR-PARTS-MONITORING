import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Pencil,
  X,
  PackageCheck,
  ScanLine,
  Loader2,
  ChevronLeft,
  Home,
  Lock,
  Printer,
  Wallet,
  FileText,
  CheckSquare,
  Square,
  Trash2,
  Download,
  Search,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoPath from "@assets/Ben_Anthony_Bagalihog_A_simple,_minimalist_logo_featuring_a_bl_1770796859768.png";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Bill {
  id?: number;
  invoiceNumber: string;
  vendorName: string;
  amountDue: string;
  dueDate: string;
  status: string;
  vendorDrNumber?: string;
}

interface SalesInvoice {
  id: number;
  invoiceNumber: string;
  date: string;
  registeredName: string;
  tin?: string;
  totalAmount_Due: string;
  status?: string;
}

interface BillingLine {
  invoice: SalesInvoice;
  drNo: string;
  poNo: string;
  selected: boolean;
}

interface CheckLine {
  checkNo: string;
  bank: string;
  date: string;
  amount: string;
}

// ─── PDF Helper ──────────────────────────────────────────────────────────────

async function loadImageDataUrl(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = src;
  });
}

async function generateBillingPDF(
  customerName: string,
  lines: BillingLine[],
  docDate: string
) {
  const selected = lines.filter((l) => l.selected);
  if (selected.length === 0) return;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;

  // ── Logo ──
  try {
    const imgData = await loadImageDataUrl(logoPath);
    doc.addImage(imgData, "PNG", margin, 10, 28, 28);
  } catch {
    // logo not critical
  }

  // ── Company Header ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30, 58, 138);
  doc.text("TRUCKGEAR.IO", 50, 18);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("Auto Parts & Truck Supplies", 50, 24);
  doc.text("Philippine Business", 50, 29);

  // ── Title ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30, 30, 30);
  doc.text("BILLING COLLECTION", pageW - margin, 18, { align: "right" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(`Date: ${docDate}`, pageW - margin, 25, { align: "right" });

  // ── Divider ──
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, 42, pageW - margin, 42);

  // ── To: ──
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text("BILL TO:", margin, 50);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text(customerName.toUpperCase(), margin, 57);

  // ── Table ──
  const tableData = selected.map((l) => [
    new Date(l.invoice.date).toLocaleDateString("en-PH"),
    l.invoice.invoiceNumber,
    l.drNo || "-",
    l.poNo || "-",
    `₱ ${Number(l.invoice.totalAmount_Due).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
  ]);

  autoTable(doc, {
    startY: 63,
    head: [["Date", "Invoice No.", "DR No.", "PO No.", "Amount"]],
    body: tableData,
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: { fontSize: 9, textColor: [30, 30, 30] },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 40 },
      2: { cellWidth: 30 },
      3: { cellWidth: 30 },
      4: { cellWidth: 42, halign: "right" },
    },
    alternateRowStyles: { fillColor: [248, 249, 255] },
    theme: "grid",
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;
  const total = selected.reduce(
    (sum, l) => sum + Number(l.invoice.totalAmount_Due),
    0
  );
  const totalStr = `₱ ${total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

  // ── Yellow Total Box ──
  const boxW = 100;
  const boxH = 14;
  const boxX = pageW - margin - boxW;
  doc.setFillColor(255, 220, 0);
  doc.roundedRect(boxX, finalY, boxW, boxH, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text("TOTAL AMOUNT DUE:", boxX + 4, finalY + 9);
  doc.text(totalStr, pageW - margin - 4, finalY + 9, { align: "right" });

  // ── Footer ──
  const footerY = finalY + 35;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("Received by: ____________________________", margin, footerY);
  doc.text("Date: ____________________________", margin, footerY + 8);
  doc.text("Signature: ____________________________", pageW - margin, footerY, { align: "right" });

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, footerY + 18, pageW - margin, footerY + 18);
  doc.setFontSize(7);
  doc.text("This is a system-generated Billing Collection document.", pageW / 2, footerY + 23, { align: "center" });

  doc.save(`BillingCollection_${customerName.replace(/\s+/g, "_")}_${docDate}.pdf`);
}

async function generateCounterReceiptPDF(
  payeeName: string,
  receiptDate: string,
  refNo: string,
  checks: CheckLine[]
) {
  const activeChecks = checks.filter((c) => c.checkNo && c.amount);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;

  // Logo
  try {
    const imgData = await loadImageDataUrl(logoPath);
    doc.addImage(imgData, "PNG", margin, 10, 24, 24);
  } catch {
    // logo not critical
  }

  // Company
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 58, 138);
  doc.text("TRUCKGEAR.IO", 44, 18);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("Auto Parts & Truck Supplies", 44, 24);

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30, 30, 30);
  doc.text("COUNTER RECEIPT", pageW - margin, 18, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(`Date: ${receiptDate}`, pageW - margin, 25, { align: "right" });
  doc.text(`Ref No: ${refNo}`, pageW - margin, 31, { align: "right" });

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, 40, pageW - margin, 40);

  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text("PAYMENT TO:", margin, 48);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text(payeeName.toUpperCase(), margin, 55);

  const tableData = activeChecks.map((c) => [
    c.checkNo,
    c.bank,
    c.date,
    `₱ ${Number(c.amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
  ]);

  autoTable(doc, {
    startY: 61,
    head: [["Check No.", "Bank", "Check Date", "Amount"]],
    body: tableData,
    margin: { left: margin, right: margin },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 50 },
      2: { cellWidth: 35 },
      3: { cellWidth: 42, halign: "right" },
    },
    theme: "grid",
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;
  const total = activeChecks.reduce((s, c) => s + Number(c.amount || 0), 0);

  const boxW = 100;
  const boxH = 14;
  const boxX = pageW - margin - boxW;
  doc.setFillColor(255, 220, 0);
  doc.roundedRect(boxX, finalY, boxW, boxH, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text("TOTAL PAYMENT:", boxX + 4, finalY + 9);
  doc.text(
    `₱ ${total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
    pageW - margin - 4,
    finalY + 9,
    { align: "right" }
  );

  const footerY = finalY + 35;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("Received by: ____________________________", margin, footerY);
  doc.text("Date: ____________________________", margin, footerY + 8);
  doc.text("Signature: ____________________________", pageW - margin, footerY, { align: "right" });
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, footerY + 18, pageW - margin, footerY + 18);
  doc.setFontSize(7);
  doc.text("This is a system-generated Counter Receipt.", pageW / 2, footerY + 23, { align: "center" });

  doc.save(`CounterReceipt_${payeeName.replace(/\s+/g, "_")}_${receiptDate}.pdf`);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Accounting() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Security ──
  const [isLocked, setIsLocked] = useState(true);
  const [pin, setPin] = useState("");

  // ── Tabs ──
  const [activeTab, setActiveTab] = useState<"payable" | "billing" | "receipt">("payable");

  // ── Accounts Payable ──
  const [bills, setBills] = useState<Bill[]>([]);
  const [loadingBills, setLoadingBills] = useState(true);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [receivingBill, setReceivingBill] = useState<Bill | null>(null);
  const [vendorDrNumber, setVendorDrNumber] = useState("");
  const [isReceiving, setIsReceiving] = useState(false);

  // ── Billing Collection ──
  const [customers, setCustomers] = useState<any[]>([]);
  const [allInvoices, setAllInvoices] = useState<SalesInvoice[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [billingLines, setBillingLines] = useState<BillingLine[]>([]);
  const [billingDate, setBillingDate] = useState(new Date().toISOString().split("T")[0]);
  const [isGeneratingBilling, setIsGeneratingBilling] = useState(false);

  // ── Counter Receipt ──
  const [payeeName, setPayeeName] = useState("");
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().split("T")[0]);
  const [refNo, setRefNo] = useState("");
  const [checks, setChecks] = useState<CheckLine[]>([
    { checkNo: "", bank: "", date: new Date().toISOString().split("T")[0], amount: "" },
  ]);
  const [isGeneratingReceipt, setIsGeneratingReceipt] = useState(false);

  useEffect(() => {
    if (!isLocked) {
      fetchBills();
      fetchCustomers();
      fetchInvoices();
    }
  }, [isLocked]);

  // filter invoices by customer search
  useEffect(() => {
    if (!customerSearch.trim()) {
      setBillingLines([]);
      return;
    }
    const filtered = allInvoices.filter((inv) =>
      inv.registeredName.toLowerCase().includes(customerSearch.toLowerCase())
    );
    setBillingLines(
      filtered.map((inv) => ({ invoice: inv, drNo: "", poNo: "", selected: false }))
    );
  }, [customerSearch, allInvoices]);

  const fetchBills = () => {
    fetch(`/api/accounts-payable?t=${Date.now()}`)
      .then((r) => r.json())
      .then((data) => {
        setBills(data.sort((a: Bill, b: Bill) => (b.id ?? 0) - (a.id ?? 0)));
        setLoadingBills(false);
      })
      .catch(() => {
        toast({ title: "Error", description: "Failed to load bills.", variant: "destructive" });
      });
  };

  const fetchCustomers = () => {
    fetch("/api/customers")
      .then((r) => r.json())
      .then(setCustomers)
      .catch(() => {});
  };

  const fetchInvoices = () => {
    fetch("/api/sales-invoices")
      .then((r) => r.json())
      .then(setAllInvoices)
      .catch(() => {});
  };

  // ── Accounts Payable Actions ──
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanning(true);
    toast({ title: "Scanning...", description: "AI is reading your invoice..." });
    try {
      const formData = new FormData();
      formData.append("invoice", file);
      const res = await fetch("/api/ai/scan-invoice", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Scan failed");
      const data = await res.json();
      setEditingBill({
        invoiceNumber: data.invoiceNumber || "",
        vendorName: data.vendorName || "",
        amountDue: data.amountDue || "0",
        dueDate: data.dueDate || new Date().toISOString().split("T")[0],
        status: "UNPAID",
      });
      toast({ title: "Success!", description: "Invoice parsed successfully." });
    } catch {
      toast({ title: "AI Error", description: "Could not read the invoice.", variant: "destructive" });
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBill) return;
    setIsSaving(true);
    try {
      const isNew = !editingBill.id;
      const url = isNew ? "/api/accounts-payable" : `/api/accounts-payable/${editingBill.id}`;
      const res = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingBill),
      });
      if (res.ok) {
        toast({ title: "Saved", description: "Bill saved successfully." });
        setEditingBill(null);
        setTimeout(fetchBills, 100);
      } else {
        toast({ title: "Error", description: "Failed to save bill.", variant: "destructive" });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleReceiveBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivingBill) return;
    setIsReceiving(true);
    try {
      const res = await fetch(`/api/accounts-payable/${receivingBill.id}/receive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorDrNumber }),
      });
      if (res.ok) {
        toast({ title: "DR Received!", description: "Spot buy marked as received." });
        setReceivingBill(null);
        setVendorDrNumber("");
        setTimeout(fetchBills, 100);
      }
    } finally {
      setIsReceiving(false);
    }
  };

  // ── Billing Collection Actions ──
  const toggleLine = (idx: number) => {
    setBillingLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, selected: !l.selected } : l))
    );
  };

  const toggleAll = () => {
    const allSelected = billingLines.every((l) => l.selected);
    setBillingLines((prev) => prev.map((l) => ({ ...l, selected: !allSelected })));
  };

  const updateLine = (idx: number, field: "drNo" | "poNo", value: string) => {
    setBillingLines((prev) =>
      prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l))
    );
  };

  const handleGenerateBilling = async () => {
    const selectedLines = billingLines.filter((l) => l.selected);
    if (selectedLines.length === 0) {
      toast({ title: "No invoices selected", description: "Select at least one invoice.", variant: "destructive" });
      return;
    }
    const customerName = selectedLines[0].invoice.registeredName;
    setIsGeneratingBilling(true);
    try {
      await generateBillingPDF(customerName, billingLines, billingDate);
      toast({ title: "PDF Generated!", description: "Billing Collection PDF downloaded." });
    } catch (err) {
      toast({ title: "Error", description: "Failed to generate PDF.", variant: "destructive" });
    } finally {
      setIsGeneratingBilling(false);
    }
  };

  // ── Counter Receipt Actions ──
  const addCheck = () =>
    setChecks((prev) => [
      ...prev,
      { checkNo: "", bank: "", date: new Date().toISOString().split("T")[0], amount: "" },
    ]);

  const removeCheck = (idx: number) =>
    setChecks((prev) => prev.filter((_, i) => i !== idx));

  const updateCheck = (idx: number, field: keyof CheckLine, value: string) =>
    setChecks((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));

  const totalChecks = checks.reduce((s, c) => s + Number(c.amount || 0), 0);

  const handleGenerateReceipt = async () => {
    if (!payeeName.trim()) {
      toast({ title: "Missing payee", description: "Enter a payee name.", variant: "destructive" });
      return;
    }
    const activeChecks = checks.filter((c) => c.checkNo && c.amount);
    if (activeChecks.length === 0) {
      toast({ title: "No checks", description: "Add at least one check.", variant: "destructive" });
      return;
    }
    setIsGeneratingReceipt(true);
    try {
      await generateCounterReceiptPDF(payeeName, receiptDate, refNo || "N/A", checks);
      toast({ title: "PDF Generated!", description: "Counter Receipt PDF downloaded." });
    } catch {
      toast({ title: "Error", description: "Failed to generate PDF.", variant: "destructive" });
    } finally {
      setIsGeneratingReceipt(false);
    }
  };

  // ── PIN Lock ──
  if (isLocked) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="h-10 w-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Admin Access Only</h2>
          <p className="text-sm text-slate-500 mb-8">Enter your security PIN to view the Truckgear Ledger.</p>
          <input
            type="password"
            autoFocus
            maxLength={4}
            className="w-full text-center text-5xl tracking-[0.5em] font-mono border-b-4 border-blue-200 focus:border-blue-600 outline-none pb-2 mb-10 transition-all bg-transparent"
            placeholder="****"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              if (e.target.value === "8888") {
                setIsLocked(false);
                toast({ title: "Unlocked", description: "Access granted to Accounting." });
              }
            }}
          />
          <button
            onClick={() => setLocation("/")}
            className="flex items-center justify-center w-full text-slate-400 hover:text-slate-600 text-sm font-medium transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-2" /> Back to Home
          </button>
        </div>
      </div>
    );
  }

  const selectedCount = billingLines.filter((l) => l.selected).length;
  const billingTotal = billingLines
    .filter((l) => l.selected)
    .reduce((s, l) => s + Number(l.invoice.totalAmount_Due), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/" className="hover:text-blue-600 flex items-center gap-1 transition-colors">
          <Home className="h-4 w-4" /> Home
        </Link>
        <ChevronLeft className="h-4 w-4" />
        <span className="font-medium text-gray-900">Accounting</span>
      </nav>

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Accounting</h1>
        <p className="text-sm text-gray-500 mt-1">Manage billing, accounts payable, and supplier payments.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          { key: "payable", label: "Accounts Payable", icon: Wallet },
          { key: "billing", label: "Billing Collection", icon: FileText },
          { key: "receipt", label: "Counter Receipt", icon: Printer },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            data-testid={`tab-${key}`}
            onClick={() => setActiveTab(key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === key
                ? "bg-white text-blue-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── ACCOUNTS PAYABLE TAB ──────────────────────────────────────── */}
      {activeTab === "payable" && (
        <div className="space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Accounts Payable</h2>
              <p className="text-sm text-gray-500">Manage unpaid bills and OTC spot buys.</p>
            </div>
            <div className="flex gap-3">
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning}
                className="bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 px-4 py-2 rounded-md flex items-center text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
                data-testid="button-scan-invoice"
              >
                {isScanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ScanLine className="w-4 h-4 mr-2" />}
                Scan with AI
              </button>
              <button
                onClick={() =>
                  setEditingBill({
                    invoiceNumber: "",
                    vendorName: "",
                    amountDue: "0",
                    dueDate: new Date().toISOString().split("T")[0],
                    status: "UNPAID",
                  })
                }
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center text-sm font-medium transition-colors shadow-sm"
                data-testid="button-new-bill"
              >
                <Plus className="w-4 h-4 mr-2" /> New Bill
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-bold">
                  <th className="p-4">Due Date</th>
                  <th className="p-4">Bill #</th>
                  <th className="p-4">Vendor</th>
                  <th className="p-4">Vendor DR #</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Amount Due</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gray-100">
                {loadingBills ? (
                  <tr><td colSpan={7} className="p-8 text-center text-gray-400">Loading ledger...</td></tr>
                ) : bills.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-gray-400">No records found.</td></tr>
                ) : (
                  bills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-gray-50 transition-colors" data-testid={`row-bill-${bill.id}`}>
                      <td className="p-4 text-gray-900">
                        {bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : "-"}
                      </td>
                      <td className="p-4 text-blue-600 font-mono font-bold">{bill.invoiceNumber}</td>
                      <td className="p-4 text-gray-900 font-semibold">{bill.vendorName}</td>
                      <td className="p-4 text-gray-600 font-mono text-xs">{bill.vendorDrNumber || "Awaiting DR"}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${bill.status === "PAID" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                          {bill.status}
                        </span>
                      </td>
                      <td className="p-4 text-right font-bold text-gray-900">
                        ₱{Number(bill.amountDue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-center space-x-1">
                        <button
                          className="p-1.5 rounded hover:bg-purple-50 text-purple-600"
                          title="Receive DR"
                          onClick={() => setReceivingBill(bill)}
                          data-testid={`button-receive-${bill.id}`}
                        >
                          <PackageCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingBill(bill)}
                          className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                          title="Edit"
                          data-testid={`button-edit-bill-${bill.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── BILLING COLLECTION TAB ───────────────────────────────────────── */}
      {activeTab === "billing" && (
        <div className="space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Billing Collection</h2>
              <p className="text-sm text-gray-500">Select a customer's invoices and generate a collection summary PDF.</p>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                  Customer / Registered Name
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    data-testid="input-customer-search"
                    className="w-full border border-gray-200 rounded-md pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Type customer name..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">
                  Billing Date
                </label>
                <input
                  type="date"
                  data-testid="input-billing-date"
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={billingDate}
                  onChange={(e) => setBillingDate(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleGenerateBilling}
                  disabled={isGeneratingBilling || selectedCount === 0}
                  data-testid="button-generate-billing-pdf"
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-md flex items-center justify-center text-sm font-medium transition-colors shadow-sm"
                >
                  {isGeneratingBilling ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Generate PDF ({selectedCount} invoice{selectedCount !== 1 ? "s" : ""})
                </button>
              </div>
            </div>
          </div>

          {/* Invoice Table */}
          {billingLines.length === 0 && customerSearch.trim() && (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-400 shadow-sm">
              No invoices found for "{customerSearch}".
            </div>
          )}
          {billingLines.length === 0 && !customerSearch.trim() && (
            <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-400 shadow-sm">
              Enter a customer name above to search their invoices.
            </div>
          )}
          {billingLines.length > 0 && (
            <>
              {/* Summary bar */}
              {selectedCount > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-yellow-800">
                    {selectedCount} invoice{selectedCount !== 1 ? "s" : ""} selected
                  </span>
                  <span className="text-base font-bold text-yellow-900">
                    Total: ₱{billingTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-bold">
                      <th className="p-3 w-10">
                        <button onClick={toggleAll} data-testid="button-toggle-all" className="text-gray-400 hover:text-blue-600">
                          {billingLines.every((l) => l.selected) ? (
                            <CheckSquare className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Invoice No.</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">DR No. <span className="text-gray-300">(editable)</span></th>
                      <th className="p-3">PO No. <span className="text-gray-300">(editable)</span></th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-gray-100">
                    {billingLines.map((line, idx) => (
                      <tr
                        key={line.invoice.id}
                        className={`transition-colors ${line.selected ? "bg-blue-50" : "hover:bg-gray-50"}`}
                        data-testid={`row-billing-invoice-${line.invoice.id}`}
                      >
                        <td className="p-3">
                          <button onClick={() => toggleLine(idx)} data-testid={`check-invoice-${line.invoice.id}`}>
                            {line.selected ? (
                              <CheckSquare className="h-4 w-4 text-blue-600" />
                            ) : (
                              <Square className="h-4 w-4 text-gray-400" />
                            )}
                          </button>
                        </td>
                        <td className="p-3 text-gray-600 text-xs">
                          {new Date(line.invoice.date).toLocaleDateString("en-PH")}
                        </td>
                        <td className="p-3 font-mono font-bold text-blue-700">{line.invoice.invoiceNumber}</td>
                        <td className="p-3 text-gray-800">{line.invoice.registeredName}</td>
                        <td className="p-3">
                          <input
                            type="text"
                            className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-400 outline-none"
                            placeholder="DR No."
                            value={line.drNo}
                            onChange={(e) => updateLine(idx, "drNo", e.target.value)}
                            data-testid={`input-dr-no-${line.invoice.id}`}
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-400 outline-none"
                            placeholder="PO No."
                            value={line.poNo}
                            onChange={(e) => updateLine(idx, "poNo", e.target.value)}
                            data-testid={`input-po-no-${line.invoice.id}`}
                          />
                        </td>
                        <td className="p-3 text-right font-bold text-gray-900">
                          ₱{Number(line.invoice.totalAmount_Due).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── COUNTER RECEIPT TAB ──────────────────────────────────────────── */}
      {activeTab === "receipt" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Counter Receipt</h2>
            <p className="text-sm text-gray-500">Record check payments to a supplier and generate a printable receipt.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Details */}
            <div className="lg:col-span-1 bg-white border border-gray-200 rounded-lg p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Payment Details</h3>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Payee / Supplier Name</label>
                <input
                  type="text"
                  data-testid="input-payee-name"
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. ACME Auto Parts Corp."
                  value={payeeName}
                  onChange={(e) => setPayeeName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Receipt Date</label>
                <input
                  type="date"
                  data-testid="input-receipt-date"
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Reference / Voucher No.</label>
                <input
                  type="text"
                  data-testid="input-ref-no"
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. CV-2024-001"
                  value={refNo}
                  onChange={(e) => setRefNo(e.target.value)}
                />
              </div>

              {/* Total */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-2">
                <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide mb-1">Total Payment</p>
                <p className="text-2xl font-bold text-yellow-900">
                  ₱{totalChecks.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </p>
              </div>

              <button
                onClick={handleGenerateReceipt}
                disabled={isGeneratingReceipt}
                data-testid="button-generate-receipt-pdf"
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-md flex items-center justify-center text-sm font-medium transition-colors shadow-sm"
              >
                {isGeneratingReceipt ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Download Counter Receipt PDF
              </button>
            </div>

            {/* Right: Checks Table */}
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Check Details</h3>
                <button
                  onClick={addCheck}
                  data-testid="button-add-check"
                  className="flex items-center gap-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Check
                </button>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-bold">
                    <th className="px-4 py-3 text-left">Check No.</th>
                    <th className="px-4 py-3 text-left">Bank</th>
                    <th className="px-4 py-3 text-left">Check Date</th>
                    <th className="px-4 py-3 text-right">Amount (₱)</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {checks.map((chk, idx) => (
                    <tr key={idx} data-testid={`row-check-${idx}`} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          data-testid={`input-check-no-${idx}`}
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-400 outline-none font-mono"
                          placeholder="e.g. 123456"
                          value={chk.checkNo}
                          onChange={(e) => updateCheck(idx, "checkNo", e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          data-testid={`input-check-bank-${idx}`}
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-400 outline-none"
                          placeholder="e.g. BDO, BPI"
                          value={chk.bank}
                          onChange={(e) => updateCheck(idx, "bank", e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="date"
                          data-testid={`input-check-date-${idx}`}
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-400 outline-none"
                          value={chk.date}
                          onChange={(e) => updateCheck(idx, "date", e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          data-testid={`input-check-amount-${idx}`}
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-400 outline-none text-right"
                          placeholder="0.00"
                          value={chk.amount}
                          onChange={(e) => updateCheck(idx, "amount", e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        {checks.length > 1 && (
                          <button
                            onClick={() => removeCheck(idx)}
                            data-testid={`button-remove-check-${idx}`}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-yellow-50 border-t-2 border-yellow-200">
                    <td colSpan={3} className="px-4 py-3 text-right text-sm font-bold text-yellow-800">
                      TOTAL
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-yellow-900">
                      ₱{totalChecks.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS ───────────────────────────────────────────────────────── */}

      {/* Edit / New Bill Modal */}
      {editingBill && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-base font-bold text-gray-900">
                {editingBill.id ? "Edit Bill" : "New Bill"}
              </h3>
              <button onClick={() => setEditingBill(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Bill / Invoice Number</label>
                <input
                  type="text"
                  required
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={editingBill.invoiceNumber}
                  onChange={(e) => setEditingBill({ ...editingBill, invoiceNumber: e.target.value })}
                  data-testid="input-bill-invoice-number"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Vendor Name</label>
                <input
                  type="text"
                  required
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={editingBill.vendorName}
                  onChange={(e) => setEditingBill({ ...editingBill, vendorName: e.target.value })}
                  data-testid="input-bill-vendor-name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Amount Due (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={editingBill.amountDue}
                    onChange={(e) => setEditingBill({ ...editingBill, amountDue: e.target.value })}
                    data-testid="input-bill-amount"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Due Date</label>
                  <input
                    type="date"
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={editingBill.dueDate}
                    onChange={(e) => setEditingBill({ ...editingBill, dueDate: e.target.value })}
                    data-testid="input-bill-due-date"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                <select
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={editingBill.status}
                  onChange={(e) => setEditingBill({ ...editingBill, status: e.target.value })}
                  data-testid="select-bill-status"
                >
                  <option value="UNPAID">UNPAID</option>
                  <option value="PAID">PAID</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBill(null)}
                  className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                  data-testid="button-save-bill"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Save Bill"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive DR Modal */}
      {receivingBill && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-base font-bold text-gray-900">Receive DR</h3>
              <button onClick={() => setReceivingBill(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleReceiveBill} className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Mark bill <strong>{receivingBill.invoiceNumber}</strong> from{" "}
                <strong>{receivingBill.vendorName}</strong> as received.
              </p>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Vendor DR Number</label>
                <input
                  type="text"
                  required
                  autoFocus
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. DR-2024-00123"
                  value={vendorDrNumber}
                  onChange={(e) => setVendorDrNumber(e.target.value)}
                  data-testid="input-vendor-dr-number"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setReceivingBill(null); setVendorDrNumber(""); }}
                  className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReceiving}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                  data-testid="button-confirm-receive"
                >
                  {isReceiving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Confirm Receipt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
