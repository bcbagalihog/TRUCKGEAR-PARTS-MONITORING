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
  RefreshCw,
  CalendarDays,
  Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoPath from "@assets/Ben_Anthony_Bagalihog_A_simple,_minimalist_logo_featuring_a_bl_1770796859768.png";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Bill {
  id?: number;
  invoiceNumber: string;
  vendorName: string;
  amountDue: string;
  invoiceDate?: string;
  dueDate?: string;
  status: string;
  vendorDrNumber?: string;
  counterReceiptId?: number;
}

interface SalesInvoice {
  id: number;
  invoiceNumber: string;
  date: string;
  registeredName: string;
  tin?: string;
  totalAmount_Due: string;
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

// ─── PDF Helpers ──────────────────────────────────────────────────────────────

async function loadImageDataUrl(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = src;
  });
}

async function generateBillingPDF(customerName: string, lines: BillingLine[], docDate: string) {
  const selected = lines.filter((l) => l.selected);
  if (!selected.length) return;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  try { doc.addImage(await loadImageDataUrl(logoPath), "PNG", margin, 10, 28, 28); } catch {}
  doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(30, 58, 138);
  doc.text("TRUCKGEAR.IO", 50, 18);
  doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80);
  doc.text("Auto Parts & Truck Supplies", 50, 24);
  doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(30, 30, 30);
  doc.text("BILLING COLLECTION", pageW - margin, 18, { align: "right" });
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80);
  doc.text(`Date: ${docDate}`, pageW - margin, 25, { align: "right" });
  doc.setDrawColor(200, 200, 200); doc.line(margin, 42, pageW - margin, 42);
  doc.setFontSize(9); doc.text("BILL TO:", margin, 50);
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(20, 20, 20);
  doc.text(customerName.toUpperCase(), margin, 57);
  autoTable(doc, {
    startY: 63,
    head: [["Date", "Invoice No.", "DR No.", "PO No.", "Amount"]],
    body: selected.map((l) => [
      new Date(l.invoice.date).toLocaleDateString("en-PH"),
      l.invoice.invoiceNumber, l.drNo || "-", l.poNo || "-",
      `₱ ${Number(l.invoice.totalAmount_Due).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
    ]),
    margin: { left: margin, right: margin },
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0:{cellWidth:28},1:{cellWidth:40},2:{cellWidth:30},3:{cellWidth:30},4:{cellWidth:42,halign:"right"} },
    theme: "grid",
  });
  const fy = (doc as any).lastAutoTable.finalY + 8;
  const total = selected.reduce((s, l) => s + Number(l.invoice.totalAmount_Due), 0);
  doc.setFillColor(255, 220, 0);
  doc.roundedRect(pageW - margin - 100, fy, 100, 14, 3, 3, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(30, 30, 30);
  doc.text("TOTAL AMOUNT DUE:", pageW - margin - 96, fy + 9);
  doc.text(`₱ ${total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`, pageW - margin - 4, fy + 9, { align: "right" });
  const footerY = fy + 35;
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(120, 120, 120);
  doc.text("Received by: ____________________________", margin, footerY);
  doc.text("Signature: ____________________________", pageW - margin, footerY, { align: "right" });
  doc.save(`BillingCollection_${customerName.replace(/\s+/g,"_")}_${docDate}.pdf`);
}

async function generateCounterReceiptPDF(
  vendorName: string,
  receiptDate: string,
  refNo: string,
  apInvoices: Bill[],
  checks: CheckLine[]
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  try { doc.addImage(await loadImageDataUrl(logoPath), "PNG", margin, 10, 24, 24); } catch {}
  doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(30, 58, 138);
  doc.text("TRUCKGEAR.IO", 44, 18);
  doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80);
  doc.text("Auto Parts & Truck Supplies", 44, 24);
  doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(30, 30, 30);
  doc.text("SUPPLIER COUNTER RECEIPT", pageW - margin, 18, { align: "right" });
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80);
  doc.text(`Date: ${receiptDate}`, pageW - margin, 25, { align: "right" });
  doc.text(`Ref No: ${refNo || "N/A"}`, pageW - margin, 31, { align: "right" });
  doc.setDrawColor(200, 200, 200); doc.line(margin, 40, pageW - margin, 40);
  doc.setFontSize(9); doc.text("SUPPLIER:", margin, 48);
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(20, 20, 20);
  doc.text(vendorName.toUpperCase(), margin, 55);

  // Table 1: Invoices
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(60, 60, 60);
  doc.text("INVOICES COVERED:", margin, 63);
  autoTable(doc, {
    startY: 66,
    head: [["Invoice Date", "Invoice No.", "Amount"]],
    body: apInvoices.map((b) => [
      b.invoiceDate ? new Date(b.invoiceDate).toLocaleDateString("en-PH") : "-",
      b.invoiceNumber,
      `₱ ${Number(b.amountDue).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
    ]),
    margin: { left: margin, right: margin },
    headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 0:{cellWidth:38},1:{cellWidth:80},2:{cellWidth:47,halign:"right"} },
    theme: "grid",
  });

  const invoiceTableEndY = (doc as any).lastAutoTable.finalY + 6;

  // Table 2: Checks
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(60, 60, 60);
  doc.text("CHECK PAYMENT DETAILS:", margin, invoiceTableEndY);
  const activeChecks = checks.filter((c) => c.checkNo && c.amount);
  autoTable(doc, {
    startY: invoiceTableEndY + 3,
    head: [["Check No.", "Bank", "Check Date", "Amount"]],
    body: activeChecks.map((c) => [
      c.checkNo, c.bank,
      c.date ? new Date(c.date).toLocaleDateString("en-PH") : "-",
      `₱ ${Number(c.amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
    ]),
    margin: { left: margin, right: margin },
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 0:{cellWidth:40},1:{cellWidth:50},2:{cellWidth:35},3:{cellWidth:40,halign:"right"} },
    theme: "grid",
  });

  const fy = (doc as any).lastAutoTable.finalY + 8;
  const total = activeChecks.reduce((s, c) => s + Number(c.amount || 0), 0);
  doc.setFillColor(255, 220, 0);
  doc.roundedRect(pageW - margin - 100, fy, 100, 14, 3, 3, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(30, 30, 30);
  doc.text("TOTAL PAYMENT:", pageW - margin - 96, fy + 9);
  doc.text(`₱ ${total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`, pageW - margin - 4, fy + 9, { align: "right" });

  const footerY = fy + 32;
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(120, 120, 120);
  doc.text("Prepared by: ____________________________", margin, footerY);
  doc.text("Received by: ____________________________", margin, footerY + 8);
  doc.text("Authorized: ____________________________", pageW - margin, footerY, { align: "right" });
  doc.setDrawColor(200, 200, 200); doc.line(margin, footerY + 18, pageW - margin, footerY + 18);
  doc.setFontSize(7);
  doc.text("This is a system-generated Supplier Counter Receipt.", pageW / 2, footerY + 23, { align: "center" });
  doc.save(`CounterReceipt_${vendorName.replace(/\s+/g,"_")}_${receiptDate}.pdf`);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Accounting() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLocked, setIsLocked] = useState(true);
  const [pin, setPin] = useState("");
  const [activeTab, setActiveTab] = useState<"payable" | "billing" | "receipt" | "checks">("payable");
  const [checkSummary, setCheckSummary] = useState<any[]>([]);
  const [isLoadingChecks, setIsLoadingChecks] = useState(false);

  // ── Accounts Payable ──────────────────────────────────────────────────────
  const [bills, setBills] = useState<Bill[]>([]);
  const [loadingBills, setLoadingBills] = useState(true);
  const [apFilter, setApFilter] = useState<"ALL" | "PENDING_COUNTER" | "COUNTERED">("ALL");
  const [apVendorFilter, setApVendorFilter] = useState("");
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Quick-add form for AP
  const [newBill, setNewBill] = useState({
    vendorName: "",
    invoiceNumber: "",
    invoiceDate: new Date().toISOString().split("T")[0],
    amountDue: "",
  });
  const [isAddingBill, setIsAddingBill] = useState(false);

  // ── Billing Collection ────────────────────────────────────────────────────
  const [allInvoices, setAllInvoices] = useState<SalesInvoice[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [billingLines, setBillingLines] = useState<BillingLine[]>([]);
  const [billingDate, setBillingDate] = useState(new Date().toISOString().split("T")[0]);
  const [isGeneratingBilling, setIsGeneratingBilling] = useState(false);

  // ── Counter Receipt / Installment ────────────────────────────────────────
  const [crVendor, setCrVendor] = useState("");
  const [crVendorInput, setCrVendorInput] = useState("");
  const [pendingInvoices, setPendingInvoices] = useState<Bill[]>([]);
  const [selectedApIds, setSelectedApIds] = useState<number[]>([]);
  const [isFetchingPending, setIsFetchingPending] = useState(false);
  const [crDate, setCrDate] = useState(new Date().toISOString().split("T")[0]);
  const [crRefNo, setCrRefNo] = useState("");
  const [numChecks, setNumChecks] = useState(4);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [checks, setChecks] = useState<CheckLine[]>([
    { checkNo: "", bank: "", date: new Date().toISOString().split("T")[0], amount: "" },
  ]);
  const [isSavingReceipt, setIsSavingReceipt] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const fetchCheckSummary = () => {
    setIsLoadingChecks(true);
    fetch("/api/sales-invoices?paymentMethod=CHECK")
      .then((r) => r.json())
      .then((data) => { setCheckSummary(data); setIsLoadingChecks(false); })
      .catch(() => setIsLoadingChecks(false));
  };

  useEffect(() => {
    if (!isLocked) {
      fetchBills();
      fetchInvoices();
    }
  }, [isLocked]);

  useEffect(() => {
    if (!isLocked && activeTab === "checks") fetchCheckSummary();
  }, [activeTab, isLocked]);

  useEffect(() => {
    if (!customerSearch.trim()) { setBillingLines([]); return; }
    const filtered = allInvoices.filter((inv) =>
      inv.registeredName.toLowerCase().includes(customerSearch.toLowerCase())
    );
    setBillingLines(filtered.map((inv) => ({
      invoice: inv,
      drNo: inv.invoiceNumber || "",
      poNo: (inv as any).poNumber || "",
      selected: true,
    })));
  }, [customerSearch, allInvoices]);

  const fetchBills = (vendorFilter?: string, statusFilter?: string) => {
    setLoadingBills(true);
    const params = new URLSearchParams();
    if (vendorFilter) params.set("vendorName", vendorFilter);
    if (statusFilter && statusFilter !== "ALL") params.set("status", statusFilter);
    fetch(`/api/accounts-payable?${params}`)
      .then((r) => r.json())
      .then((data) => { setBills(data); setLoadingBills(false); })
      .catch(() => { toast({ title: "Error", description: "Failed to load bills.", variant: "destructive" }); setLoadingBills(false); });
  };

  const fetchInvoices = () => {
    fetch("/api/sales-invoices?status=UNPAID")
      .then((r) => r.json())
      .then(setAllInvoices)
      .catch(() => {});
  };

  const fetchPendingForVendor = async () => {
    if (!crVendorInput.trim()) {
      toast({ title: "Enter vendor name", description: "Type a vendor name to fetch their pending invoices.", variant: "destructive" });
      return;
    }
    setIsFetchingPending(true);
    try {
      const params = new URLSearchParams({ vendorName: crVendorInput, status: "PENDING_COUNTER" });
      const res = await fetch(`/api/accounts-payable?${params}`);
      const data: Bill[] = await res.json();
      setCrVendor(crVendorInput);
      setPendingInvoices(data);
      setSelectedApIds(data.map((b) => b.id!).filter(Boolean));
      // auto-set total check amount
      const total = data.reduce((s, b) => s + Number(b.amountDue), 0);
      if (total > 0 && numChecks > 0) autoGenerateChecks(total, numChecks, startDate);
      if (data.length === 0) toast({ title: "No pending invoices", description: `No PENDING_COUNTER invoices found for "${crVendorInput}".` });
    } finally {
      setIsFetchingPending(false);
    }
  };

  const selectedTotal = pendingInvoices
    .filter((b) => selectedApIds.includes(b.id!))
    .reduce((s, b) => s + Number(b.amountDue), 0);

  const autoGenerateChecks = (total: number, n: number, start: string) => {
    const perCheck = total / n;
    const startD = new Date(start + "T00:00:00");
    const generated: CheckLine[] = Array.from({ length: n }, (_, i) => {
      const d = new Date(startD);
      d.setDate(d.getDate() + i * 7);
      return {
        checkNo: "",
        bank: "",
        date: d.toISOString().split("T")[0],
        amount: perCheck.toFixed(2),
      };
    });
    setChecks(generated);
  };

  const handleGenerateSchedule = () => {
    if (numChecks < 1) { toast({ title: "Invalid", description: "Enter at least 1 check.", variant: "destructive" }); return; }
    autoGenerateChecks(selectedTotal, numChecks, startDate);
    toast({ title: "Schedule generated", description: `${numChecks} weekly checks created.` });
  };

  const handleSaveAndCounter = async () => {
    if (!crVendor) { toast({ title: "No vendor", description: "Fetch pending invoices first.", variant: "destructive" }); return; }
    if (selectedApIds.length === 0) { toast({ title: "No invoices selected", variant: "destructive" }); return; }
    const activeChecks = checks.filter((c) => c.amount);
    if (!activeChecks.length) { toast({ title: "No checks", description: "Add at least one check.", variant: "destructive" }); return; }
    setIsSavingReceipt(true);
    try {
      const res = await fetch("/api/counter-receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receipt: {
            vendorName: crVendor,
            receiptDate: crDate,
            refNo: crRefNo,
            totalAmount: String(selectedTotal),
            numberOfChecks: activeChecks.length,
            startDate,
          },
          checks: activeChecks,
          apInvoiceIds: selectedApIds,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast({ title: "✅ Counter Receipt Saved!", description: "AP invoices marked as Countered." });
      fetchBills();
      setPendingInvoices([]);
      setSelectedApIds([]);
      setCrVendor("");
      setCrVendorInput("");
    } catch {
      toast({ title: "Error", description: "Failed to save counter receipt.", variant: "destructive" });
    } finally {
      setIsSavingReceipt(false);
    }
  };

  const handleExportCounterPDF = async () => {
    const selectedBills = pendingInvoices.filter((b) => selectedApIds.includes(b.id!));
    if (!crVendor || !selectedBills.length) {
      toast({ title: "Nothing to export", description: "Fetch and select invoices first.", variant: "destructive" });
      return;
    }
    setIsGeneratingPDF(true);
    try {
      await generateCounterReceiptPDF(crVendor, crDate, crRefNo, selectedBills, checks);
      toast({ title: "PDF Downloaded!" });
    } catch {
      toast({ title: "Error", description: "PDF generation failed.", variant: "destructive" });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // AP Quick Add
  const handleAddBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBill.vendorName || !newBill.invoiceNumber || !newBill.amountDue) return;
    setIsAddingBill(true);
    try {
      const res = await fetch("/api/accounts-payable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newBill, status: "PENDING_COUNTER" }),
      });
      if (res.ok) {
        toast({ title: "Invoice added", description: `${newBill.invoiceNumber} added to AP log.` });
        setNewBill({ vendorName: "", invoiceNumber: "", invoiceDate: new Date().toISOString().split("T")[0], amountDue: "" });
        fetchBills(apVendorFilter || undefined, apFilter);
      }
    } finally {
      setIsAddingBill(false);
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
        toast({ title: "Saved" });
        setEditingBill(null);
        fetchBills(apVendorFilter || undefined, apFilter);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanning(true);
    toast({ title: "Scanning...", description: "AI is reading your invoice..." });
    try {
      const formData = new FormData();
      formData.append("invoice", file);
      const res = await fetch("/api/ai/scan-invoice", { method: "POST", body: formData });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEditingBill({
        invoiceNumber: data.invoiceNumber || "",
        vendorName: data.vendorName || "",
        amountDue: data.amountDue || "0",
        invoiceDate: data.invoiceDate || new Date().toISOString().split("T")[0],
        status: "PENDING_COUNTER",
      });
      toast({ title: "Scanned!" });
    } catch {
      toast({ title: "AI Error", variant: "destructive" });
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Billing Collection
  const toggleLine = (idx: number) => setBillingLines((p) => p.map((l, i) => i === idx ? { ...l, selected: !l.selected } : l));
  const toggleAll = () => { const all = billingLines.every((l) => l.selected); setBillingLines((p) => p.map((l) => ({ ...l, selected: !all }))); };
  const updateLine = (idx: number, field: "drNo" | "poNo", v: string) => setBillingLines((p) => p.map((l, i) => i === idx ? { ...l, [field]: v } : l));
  const selectedCount = billingLines.filter((l) => l.selected).length;
  const billingTotal = billingLines.filter((l) => l.selected).reduce((s, l) => s + Number(l.invoice.totalAmount_Due), 0);

  const handleGenerateBilling = async () => {
    const selected = billingLines.filter((l) => l.selected);
    if (!selected.length) {
      toast({ title: "No invoices selected", variant: "destructive" }); return;
    }
    setIsGeneratingBilling(true);
    try {
      await generateBillingPDF(selected[0].invoice.registeredName, billingLines, billingDate);
      // Mark selected invoices as BILLED
      const ids = selected.map((l) => l.invoice.id).filter(Boolean) as number[];
      if (ids.length > 0) {
        await fetch("/api/sales-invoices/bulk-status", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids, status: "BILLED" }),
        });
        fetchInvoices();
        setCustomerSearch("");
      }
      toast({ title: "Billing PDF generated & invoices marked as BILLED" });
    } catch { toast({ title: "Error", variant: "destructive" }); }
    finally { setIsGeneratingBilling(false); }
  };

  const statusColor = (s: string) => {
    if (s === "PENDING_COUNTER") return "bg-orange-100 text-orange-700";
    if (s === "COUNTERED") return "bg-green-100 text-green-700";
    if (s === "RECEIVED") return "bg-blue-100 text-blue-700";
    if (s === "PAID") return "bg-green-100 text-green-700";
    return "bg-gray-100 text-gray-600";
  };

  // ── PIN Lock ──────────────────────────────────────────────────────────────
  if (isLocked) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="h-10 w-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Admin Access Only</h2>
          <p className="text-sm text-slate-500 mb-8">Enter your security PIN to view the Accounting module.</p>
          <input
            type="password" autoFocus maxLength={4}
            className="w-full text-center text-5xl tracking-[0.5em] font-mono border-b-4 border-blue-200 focus:border-blue-600 outline-none pb-2 mb-10 transition-all bg-transparent"
            placeholder="****" value={pin}
            onChange={(e) => { setPin(e.target.value); if (e.target.value === "8888") { setIsLocked(false); toast({ title: "Unlocked" }); } }}
          />
          <button onClick={() => setLocation("/")} className="flex items-center justify-center w-full text-slate-400 hover:text-slate-600 text-sm font-medium">
            <ChevronLeft className="w-4 h-4 mr-2" /> Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/" className="hover:text-blue-600 flex items-center gap-1"><Home className="h-4 w-4" /> Home</Link>
        <ChevronLeft className="h-4 w-4" />
        <span className="font-medium text-gray-900">Accounting</span>
      </nav>

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Accounting</h1>
        <p className="text-sm text-gray-500 mt-1">AP log, billing collection, and supplier counter receipts.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit flex-wrap">
        {[
          { key: "payable", label: "Accounts Payable", icon: Wallet },
          { key: "billing", label: "Billing Collection", icon: FileText },
          { key: "receipt", label: "Supplier Counter Receipt", icon: Printer },
          { key: "checks", label: "Check Summary", icon: CheckSquare },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} data-testid={`tab-${key}`}
            onClick={() => setActiveTab(key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === key ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {/* ══ ACCOUNTS PAYABLE TAB ════════════════════════════════════════════ */}
      {activeTab === "payable" && (
        <div className="space-y-5">
          {/* Quick-Add Form */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4 text-blue-600" /> Add AP Invoice
            </h3>
            <form onSubmit={handleAddBill} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Vendor Name</label>
                <input type="text" required placeholder="Supplier name"
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newBill.vendorName} onChange={(e) => setNewBill({ ...newBill, vendorName: e.target.value })}
                  data-testid="input-ap-vendor" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Invoice No.</label>
                <input type="text" required placeholder="INV-001"
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newBill.invoiceNumber} onChange={(e) => setNewBill({ ...newBill, invoiceNumber: e.target.value })}
                  data-testid="input-ap-invoice-no" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Invoice Date</label>
                <input type="date"
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newBill.invoiceDate} onChange={(e) => setNewBill({ ...newBill, invoiceDate: e.target.value })}
                  data-testid="input-ap-invoice-date" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Amount (₱)</label>
                <input type="number" step="0.01" required placeholder="0.00"
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newBill.amountDue} onChange={(e) => setNewBill({ ...newBill, amountDue: e.target.value })}
                  data-testid="input-ap-amount" />
              </div>
              <button type="submit" disabled={isAddingBill}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                data-testid="button-add-ap-invoice">
                {isAddingBill ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add Invoice
              </button>
            </form>
          </div>

          {/* Filters & Table */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap gap-3 items-center justify-between">
              <div className="flex items-center gap-2">
                <input type="text" placeholder="Filter by vendor..."
                  className="border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-48"
                  value={apVendorFilter} onChange={(e) => setApVendorFilter(e.target.value)}
                  data-testid="input-ap-vendor-filter" />
                {["ALL", "PENDING_COUNTER", "COUNTERED"].map((s) => (
                  <button key={s} onClick={() => { setApFilter(s as any); fetchBills(apVendorFilter || undefined, s); }}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${apFilter === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                    data-testid={`filter-ap-${s.toLowerCase()}`}>
                    {s === "ALL" ? "All" : s === "PENDING_COUNTER" ? "Pending" : "Countered"}
                  </button>
                ))}
                <button onClick={() => fetchBills(apVendorFilter || undefined, apFilter)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors" title="Refresh"
                  data-testid="button-refresh-ap">
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                <button onClick={() => fileInputRef.current?.click()} disabled={isScanning}
                  className="bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 px-3 py-1.5 rounded-md flex items-center text-xs font-medium disabled:opacity-50">
                  {isScanning ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <ScanLine className="w-3 h-3 mr-1" />}
                  AI Scan
                </button>
              </div>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 font-bold">
                  <th className="px-4 py-3">Invoice Date</th>
                  <th className="px-4 py-3">Invoice No.</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gray-100">
                {loadingBills ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></td></tr>
                ) : bills.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No records found.</td></tr>
                ) : bills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-gray-50 transition-colors" data-testid={`row-ap-${bill.id}`}>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {bill.invoiceDate ? new Date(bill.invoiceDate).toLocaleDateString("en-PH") : "-"}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-blue-700">{bill.invoiceNumber}</td>
                    <td className="px-4 py-3 text-gray-800 font-medium">{bill.vendorName}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor(bill.status)}`}>
                        {bill.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">
                      ₱{Number(bill.amountDue).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => setEditingBill(bill)} className="p-1 text-gray-400 hover:text-blue-600 transition-colors" data-testid={`edit-ap-${bill.id}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {bills.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 border-t border-gray-200">
                    <td colSpan={4} className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">
                      Total ({bills.length} records)
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-gray-900">
                      ₱{bills.reduce((s, b) => s + Number(b.amountDue), 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ══ BILLING COLLECTION TAB ══════════════════════════════════════════ */}
      {activeTab === "billing" && (
        <div className="space-y-5">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Customer / Registered Name</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input type="text" data-testid="input-customer-search"
                    className="w-full border border-gray-200 rounded-md pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Type customer name..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Billing Date</label>
                <input type="date" data-testid="input-billing-date"
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={billingDate} onChange={(e) => setBillingDate(e.target.value)} />
              </div>
              <div className="flex items-end">
                <button onClick={handleGenerateBilling} disabled={isGeneratingBilling || selectedCount === 0}
                  data-testid="button-generate-billing-pdf"
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-md flex items-center justify-center text-sm font-medium">
                  {isGeneratingBilling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  Generate PDF ({selectedCount})
                </button>
              </div>
            </div>
          </div>
          {billingLines.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400">
              {customerSearch.trim() ? `No invoices found for "${customerSearch}".` : "Enter a customer name to search their invoices."}
            </div>
          ) : (
            <>
              {selectedCount > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 flex justify-between items-center">
                  <span className="text-sm font-semibold text-yellow-800">{selectedCount} invoice{selectedCount !== 1 ? "s" : ""} selected</span>
                  <span className="font-bold text-yellow-900">Total: ₱{billingTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b text-xs uppercase tracking-wider text-gray-500 font-bold">
                      <th className="p-3 w-10">
                        <button onClick={toggleAll}>{billingLines.every((l) => l.selected) ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4" />}</button>
                      </th>
                      <th className="p-3">Date</th><th className="p-3">Invoice No.</th><th className="p-3">Customer</th>
                      <th className="p-3">DR No.</th><th className="p-3">PO No.</th><th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-gray-100">
                    {billingLines.map((line, idx) => (
                      <tr key={line.invoice.id} className={`transition-colors ${line.selected ? "bg-blue-50" : "hover:bg-gray-50"}`}>
                        <td className="p-3"><button onClick={() => toggleLine(idx)}>{line.selected ? <CheckSquare className="h-4 w-4 text-blue-600" /> : <Square className="h-4 w-4 text-gray-400" />}</button></td>
                        <td className="p-3 text-xs text-gray-600">{new Date(line.invoice.date).toLocaleDateString("en-PH")}</td>
                        <td className="p-3 font-mono font-bold text-blue-700">{line.invoice.invoiceNumber}</td>
                        <td className="p-3 text-gray-800">{line.invoice.registeredName}</td>
                        <td className="p-3"><input type="text" placeholder="DR No." value={line.drNo}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-400 outline-none"
                          onChange={(e) => updateLine(idx, "drNo", e.target.value)} /></td>
                        <td className="p-3"><input type="text" placeholder="PO No." value={line.poNo}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-400 outline-none"
                          onChange={(e) => updateLine(idx, "poNo", e.target.value)} /></td>
                        <td className="p-3 text-right font-bold">₱{Number(line.invoice.totalAmount_Due).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ══ SUPPLIER COUNTER RECEIPT TAB ════════════════════════════════════ */}
      {activeTab === "receipt" && (
        <div className="space-y-5">
          {/* Step 1: Fetch Pending */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Search className="h-4 w-4 text-blue-600" /> Step 1 — Fetch Pending Invoices
            </h3>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Vendor / Supplier Name</label>
                <input type="text" data-testid="input-cr-vendor"
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. ACME Truck Parts Inc."
                  value={crVendorInput} onChange={(e) => setCrVendorInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchPendingForVendor()} />
              </div>
              <button onClick={fetchPendingForVendor} disabled={isFetchingPending}
                data-testid="button-fetch-pending"
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-md flex items-center gap-2 text-sm font-medium disabled:opacity-50">
                {isFetchingPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Fetch Pending
              </button>
            </div>

            {/* Pending Invoices list */}
            {pendingInvoices.length > 0 && (
              <div className="mt-4 rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b text-xs uppercase tracking-wider text-gray-500 font-bold">
                      <th className="px-3 py-2 w-8">
                        <input type="checkbox" checked={selectedApIds.length === pendingInvoices.length}
                          onChange={(e) => setSelectedApIds(e.target.checked ? pendingInvoices.map((b) => b.id!) : [])}
                          data-testid="check-all-pending" />
                      </th>
                      <th className="px-3 py-2">Invoice Date</th>
                      <th className="px-3 py-2">Invoice No.</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pendingInvoices.map((b) => (
                      <tr key={b.id} className={`transition-colors ${selectedApIds.includes(b.id!) ? "bg-blue-50" : "hover:bg-gray-50"}`}
                        data-testid={`row-pending-${b.id}`}>
                        <td className="px-3 py-2">
                          <input type="checkbox" checked={selectedApIds.includes(b.id!)}
                            onChange={(e) => setSelectedApIds(prev => e.target.checked ? [...prev, b.id!] : prev.filter(id => id !== b.id))}
                            data-testid={`check-pending-${b.id}`} />
                        </td>
                        <td className="px-3 py-2 text-gray-600 text-xs">{b.invoiceDate ? new Date(b.invoiceDate).toLocaleDateString("en-PH") : "-"}</td>
                        <td className="px-3 py-2 font-mono font-bold text-blue-700">{b.invoiceNumber}</td>
                        <td className="px-3 py-2 text-right font-bold">₱{Number(b.amountDue).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-yellow-50 border-t-2 border-yellow-200">
                      <td colSpan={3} className="px-3 py-2 text-right text-sm font-bold text-yellow-800">
                        SELECTED TOTAL ({selectedApIds.length} invoices)
                      </td>
                      <td className="px-3 py-2 text-right text-base font-bold text-yellow-900">
                        ₱{selectedTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Step 2: Installment Generator */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" /> Step 2 — Installment Generator
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Receipt Date</label>
                <input type="date" data-testid="input-cr-date"
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={crDate} onChange={(e) => setCrDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Reference / Voucher No.</label>
                <input type="text" data-testid="input-cr-ref"
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="CV-2024-001" value={crRefNo} onChange={(e) => setCrRefNo(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Number of Checks</label>
                <input type="number" min={1} max={52} data-testid="input-num-checks"
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={numChecks} onChange={(e) => setNumChecks(Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Start Date (Check 1)</label>
                <input type="date" data-testid="input-start-date"
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
            </div>
            <button onClick={handleGenerateSchedule}
              disabled={selectedTotal === 0}
              data-testid="button-generate-schedule"
              className="bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white px-5 py-2 rounded-md flex items-center gap-2 text-sm font-medium">
              <CalendarDays className="h-4 w-4" /> Generate Weekly Schedule
            </button>
            <p className="text-xs text-gray-400 mt-2">
              Splits ₱{selectedTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })} into {numChecks} weekly checks of ₱{selectedTotal > 0 ? (selectedTotal / numChecks).toLocaleString("en-PH", { minimumFractionDigits: 2 }) : "0.00"} each.
            </p>
          </div>

          {/* Step 3: Check Table */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                <Printer className="h-4 w-4 text-blue-600" /> Step 3 — Check Details
              </h3>
              <button onClick={() => setChecks((p) => [...p, { checkNo: "", bank: "", date: new Date().toISOString().split("T")[0], amount: "" }])}
                data-testid="button-add-check"
                className="flex items-center gap-1 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-md text-xs font-medium">
                <Plus className="w-3.5 h-3.5" /> Add Check
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b text-xs uppercase tracking-wider text-gray-500 font-bold">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Check No.</th>
                  <th className="px-4 py-3">Bank</th>
                  <th className="px-4 py-3">Check Date</th>
                  <th className="px-4 py-3 text-right">Amount (₱)</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {checks.map((chk, idx) => (
                  <tr key={idx} data-testid={`row-check-${idx}`} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-xs text-gray-400 font-mono">{idx + 1}</td>
                    <td className="px-4 py-2">
                      <input type="text" data-testid={`input-check-no-${idx}`}
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-400 outline-none font-mono"
                        placeholder="e.g. 123456" value={chk.checkNo}
                        onChange={(e) => setChecks((p) => p.map((c, i) => i === idx ? { ...c, checkNo: e.target.value } : c))} />
                    </td>
                    <td className="px-4 py-2">
                      <input type="text" data-testid={`input-check-bank-${idx}`}
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-400 outline-none"
                        placeholder="BDO, BPI..." value={chk.bank}
                        onChange={(e) => setChecks((p) => p.map((c, i) => i === idx ? { ...c, bank: e.target.value } : c))} />
                    </td>
                    <td className="px-4 py-2">
                      <input type="date" data-testid={`input-check-date-${idx}`}
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-400 outline-none"
                        value={chk.date}
                        onChange={(e) => setChecks((p) => p.map((c, i) => i === idx ? { ...c, date: e.target.value } : c))} />
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" data-testid={`input-check-amount-${idx}`}
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-blue-400 outline-none text-right"
                        placeholder="0.00" value={chk.amount}
                        onChange={(e) => setChecks((p) => p.map((c, i) => i === idx ? { ...c, amount: e.target.value } : c))} />
                    </td>
                    <td className="px-4 py-2 text-center">
                      {checks.length > 1 && (
                        <button onClick={() => setChecks((p) => p.filter((_, i) => i !== idx))}
                          className="p-1 text-gray-400 hover:text-red-500" data-testid={`remove-check-${idx}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-yellow-50 border-t-2 border-yellow-200">
                  <td colSpan={4} className="px-4 py-3 text-right text-sm font-bold text-yellow-800">TOTAL</td>
                  <td className="px-4 py-3 text-right font-bold text-yellow-900">
                    ₱{checks.reduce((s, c) => s + Number(c.amount || 0), 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Step 4: Save & Export */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
              <PackageCheck className="h-4 w-4 text-green-600" /> Step 4 — Save & Export
            </h3>
            <div className="flex gap-3 flex-wrap">
              <button onClick={handleSaveAndCounter} disabled={isSavingReceipt || !crVendor}
                data-testid="button-save-counter-receipt"
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-6 py-2.5 rounded-md flex items-center gap-2 text-sm font-semibold">
                {isSavingReceipt ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
                Save & Mark as Countered
              </button>
              <button onClick={handleExportCounterPDF} disabled={isGeneratingPDF || !crVendor}
                data-testid="button-export-cr-pdf"
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-2.5 rounded-md flex items-center gap-2 text-sm font-semibold">
                {isGeneratingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Export PDF
              </button>
            </div>
            {!crVendor && (
              <p className="text-xs text-gray-400 mt-3">Fetch pending invoices in Step 1 first to enable saving.</p>
            )}
          </div>
        </div>
      )}

      {/* ══ CHECK SUMMARY TAB ═══════════════════════════════════════════════ */}
      {activeTab === "checks" && (
        <div className="space-y-5">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-purple-600" /> Check Payment Registry
              </h3>
              <p className="text-xs text-gray-400 mt-1">All invoices paid by check from the POS terminal.</p>
            </div>
            <button onClick={fetchCheckSummary} disabled={isLoadingChecks}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium">
              {isLoadingChecks ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </button>
          </div>
          {isLoadingChecks ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400">Loading check summary...</div>
          ) : checkSummary.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400">
              No check payments recorded yet. Check payments from the POS will appear here.
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b text-xs uppercase tracking-wider text-gray-500 font-bold">
                    <th className="p-3">Invoice No.</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Bank</th>
                    <th className="p-3">Check No.</th>
                    <th className="p-3">Maturity Date</th>
                    <th className="p-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {checkSummary.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3 font-mono font-bold text-blue-700">{inv.invoiceNumber}</td>
                      <td className="p-3 text-gray-600 text-xs">{new Date(inv.date).toLocaleDateString("en-PH")}</td>
                      <td className="p-3 text-gray-800 font-medium">{inv.registeredName}</td>
                      <td className="p-3 text-gray-600">{inv.checkBankName || "—"}</td>
                      <td className="p-3 font-mono text-gray-700">{inv.checkNumber || "—"}</td>
                      <td className="p-3 text-gray-600 text-xs">
                        {inv.checkMaturityDate ? new Date(inv.checkMaturityDate).toLocaleDateString("en-PH") : "—"}
                      </td>
                      <td className="p-3 text-right font-bold">
                        ₱{Number(inv.totalAmount_Due).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-yellow-50 border-t-2 border-yellow-200">
                    <td colSpan={6} className="px-4 py-3 text-right text-sm font-bold text-yellow-800">TOTAL CHECKS</td>
                    <td className="px-4 py-3 text-right font-bold text-yellow-900">
                      ₱{checkSummary.reduce((s: number, inv: any) => s + Number(inv.totalAmount_Due || 0), 0)
                          .toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══ MODALS ══════════════════════════════════════════════════════════ */}
      {editingBill && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-base font-bold">{editingBill.id ? "Edit Invoice" : "New Invoice"}</h3>
              <button onClick={() => setEditingBill(null)}><X className="h-5 w-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Invoice Number</label>
                <input type="text" required className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={editingBill.invoiceNumber} onChange={(e) => setEditingBill({ ...editingBill, invoiceNumber: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Vendor Name</label>
                <input type="text" required className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={editingBill.vendorName} onChange={(e) => setEditingBill({ ...editingBill, vendorName: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Invoice Date</label>
                  <input type="date" className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={editingBill.invoiceDate || ""} onChange={(e) => setEditingBill({ ...editingBill, invoiceDate: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Amount (₱)</label>
                  <input type="number" step="0.01" required className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={editingBill.amountDue} onChange={(e) => setEditingBill({ ...editingBill, amountDue: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                <select className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={editingBill.status} onChange={(e) => setEditingBill({ ...editingBill, status: e.target.value })}>
                  <option value="PENDING_COUNTER">PENDING COUNTER</option>
                  <option value="COUNTERED">COUNTERED</option>
                  <option value="PAID">PAID</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditingBill(null)}
                  className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md text-sm font-medium">Cancel</button>
                <button type="submit" disabled={isSaving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
