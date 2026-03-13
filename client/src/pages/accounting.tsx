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
  Archive,
  Eye,
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

// ─── Amount to Words (Philippine format) ──────────────────────────────────────
function amountToWords(num: number): string {
  if (!num || num === 0) return "ZERO PESOS ONLY";
  const ones = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE",
    "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"];
  const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];
  function words(n: number): string {
    if (n === 0) return "";
    if (n < 20) return ones[n] + " ";
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "") + " ";
    if (n < 1000) return ones[Math.floor(n / 100)] + " HUNDRED " + words(n % 100);
    if (n < 1_000_000) return words(Math.floor(n / 1000)) + "THOUSAND " + words(n % 1000);
    if (n < 1_000_000_000) return words(Math.floor(n / 1_000_000)) + "MILLION " + words(n % 1_000_000);
    return words(Math.floor(n / 1_000_000_000)) + "BILLION " + words(n % 1_000_000_000);
  }
  const pesos = Math.floor(num);
  const centavos = Math.round((num - pesos) * 100);
  let result = words(pesos).trim() + " PESOS";
  if (centavos > 0) result += ` AND ${centavos.toString().padStart(2, "0")}/100`;
  return result + " ONLY";
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
  doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(30, 58, 138);
  doc.text("Truckgear Truck Parts Store", 50, 18);
  doc.setFontSize(7.5); doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80);
  doc.text("1032 A. Bonifacio St. Brgy Balingasa Q.C,", 50, 24);
  doc.text("Tel: (02)85513863 | CP: 09285066385", 50, 29);
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
  doc.text("Truckgear Truck Parts Store", 44, 18);
  doc.setFontSize(7.5); doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80);
  doc.text("1032 A. Bonifacio St. Brgy Balingasa Q.C,", 44, 24);
  doc.text("Tel: (02)85513863 | CP: 09285066385", 44, 29);
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
  const [deletingBill, setDeletingBill] = useState<Bill | null>(null);
  const [isDeletingBill, setIsDeletingBill] = useState(false);
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

  // ── Counter Receipt Vault ─────────────────────────────────────────────────
  const [crVault, setCrVault] = useState<any[]>([]);
  const [crVaultLoading, setCrVaultLoading] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<any | null>(null);
  const [editingReceipt, setEditingReceipt] = useState<any | null>(null);
  const [editingReceiptChecks, setEditingReceiptChecks] = useState<any[]>([]);
  const [deletingReceipt, setDeletingReceipt] = useState<any | null>(null);
  const [printCheckData, setPrintCheckData] = useState<{ check: CheckLine; payee: string } | null>(null);
  const [isDeletingReceipt, setIsDeletingReceipt] = useState(false);
  const [isSavingReceiptEdit, setIsSavingReceiptEdit] = useState(false);
  const [showArchivedCr, setShowArchivedCr] = useState(false);

  // ── Billing Collection Vault ──────────────────────────────────────────────
  const [billingVault, setBillingVault] = useState<any[]>([]);
  const [billingVaultLoading, setBillingVaultLoading] = useState(false);
  const [showArchivedBilling, setShowArchivedBilling] = useState(false);

  // ── Customer / Vendor dropdowns ───────────────────────────────────────────
  const [customers, setCustomers] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);

  // ── Payment Recording Modal ───────────────────────────────────────────────
  const [paymentModal, setPaymentModal] = useState<{ type: "cr" | "bc"; id: number; label: string; totalAmount: number; amountPaid: number } | null>(null);
  const [pmDate, setPmDate] = useState(new Date().toISOString().split("T")[0]);
  const [pmRef, setPmRef] = useState("");
  const [pmAmount, setPmAmount] = useState("");
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  // ── Supplier Check Summary ────────────────────────────────────────────────
  const [supplierChecks, setSupplierChecks] = useState<any[]>([]);
  const [isLoadingSupplierChecks, setIsLoadingSupplierChecks] = useState(false);
  const [checkPeriod, setCheckPeriod] = useState<"today" | "week" | "month" | "custom">("month");
  const [checkGroupBy, setCheckGroupBy] = useState<"none" | "supplier" | "date" | "amount">("supplier");
  const today = new Date().toISOString().split("T")[0];
  const [checkCustomStart, setCheckCustomStart] = useState(today);
  const [checkCustomEnd, setCheckCustomEnd] = useState(today);

  const getDateRange = (period: "today" | "week" | "month" | "custom"): { start: string; end: string } => {
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().split("T")[0];
    if (period === "today") return { start: fmt(now), end: fmt(now) };
    if (period === "week") {
      // Current Mon–Sun week
      const day = now.getDay(); // 0=Sun … 6=Sat
      const diffToMon = (day === 0 ? -6 : 1 - day);
      const mon = new Date(now); mon.setDate(now.getDate() + diffToMon);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return { start: fmt(mon), end: fmt(sun) };
    }
    if (period === "month") {
      // Full calendar month (1st to last day) — includes post-dated checks
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start: fmt(s), end: fmt(e) };
    }
    return { start: checkCustomStart, end: checkCustomEnd };
  };

  const fetchSupplierChecks = async (period?: "today" | "week" | "month" | "custom") => {
    const p = period || checkPeriod;
    const { start, end } = getDateRange(p);
    setIsLoadingSupplierChecks(true);
    try {
      const params = new URLSearchParams({ startDate: start, endDate: end });
      const res = await fetch(`/api/supplier-checks-report?${params}`);
      const data = await res.json();
      setSupplierChecks(Array.isArray(data) ? data : []);
    } catch {
      setSupplierChecks([]);
    } finally {
      setIsLoadingSupplierChecks(false);
    }
  };

  const fetchCheckSummary = () => {
    setIsLoadingChecks(true);
    fetch("/api/sales-invoices?paymentMethod=CHECK")
      .then((r) => r.json())
      .then((data) => { setCheckSummary(data); setIsLoadingChecks(false); })
      .catch(() => setIsLoadingChecks(false));
  };

  const fetchCrVault = async (archived = showArchivedCr) => {
    setCrVaultLoading(true);
    try {
      const res = await fetch(`/api/counter-receipts?includeArchived=${archived}`);
      const data = await res.json();
      setCrVault(Array.isArray(data) ? data : []);
    } catch {
      setCrVault([]);
      toast({ title: "Error", description: "Failed to load vault.", variant: "destructive" });
    } finally {
      setCrVaultLoading(false);
    }
  };

  const fetchBillingVault = async (archived = showArchivedBilling) => {
    setBillingVaultLoading(true);
    try {
      const res = await fetch(`/api/billing-collections?includeArchived=${archived}`);
      const data = await res.json();
      setBillingVault(Array.isArray(data) ? data : []);
    } catch {
      setBillingVault([]);
      toast({ title: "Error", description: "Failed to load billing vault.", variant: "destructive" });
    } finally {
      setBillingVaultLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/customers");
      const data = await res.json();
      setCustomers(data);
    } catch {}
  };

  const fetchVendors = async () => {
    try {
      const res = await fetch("/api/vendors");
      const data = await res.json();
      setVendors(data);
    } catch {}
  };

  const handleRecordPayment = async () => {
    if (!paymentModal || !pmAmount || !pmDate) return;
    setIsSavingPayment(true);
    try {
      const url = paymentModal.type === "cr"
        ? `/api/counter-receipts/${paymentModal.id}/payments`
        : `/api/billing-collections/${paymentModal.id}/payments`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentDate: pmDate, refNo: pmRef || undefined, amount: pmAmount }),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Payment recorded", description: `₱${Number(pmAmount).toLocaleString("en-PH", { minimumFractionDigits: 2 })} recorded successfully.` });
      setPaymentModal(null);
      setPmAmount(""); setPmRef(""); setPmDate(new Date().toISOString().split("T")[0]);
      if (paymentModal.type === "cr") fetchCrVault();
      else fetchBillingVault();
    } catch {
      toast({ title: "Error", description: "Failed to record payment.", variant: "destructive" });
    } finally {
      setIsSavingPayment(false);
    }
  };

  const handleArchiveToggle = async (type: "cr" | "bc", id: number, currentStatus: string) => {
    const newStatus = currentStatus === "ARCHIVED" ? "ACTIVE" : "ARCHIVED";
    try {
      const url = type === "cr"
        ? `/api/counter-receipts/${id}/status`
        : `/api/billing-collections/${id}/status`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast({ title: newStatus === "ARCHIVED" ? "Archived" : "Restored", description: "Status updated." });
      if (type === "cr") fetchCrVault();
      else fetchBillingVault();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleDeleteReceipt = async () => {
    if (!deletingReceipt?.id) return;
    setIsDeletingReceipt(true);
    try {
      const res = await fetch(`/api/counter-receipts/${deletingReceipt.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setDeletingReceipt(null);
      fetchCrVault();
      toast({ title: "Deleted", description: "Counter receipt removed." });
    } catch {
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    } finally {
      setIsDeletingReceipt(false);
    }
  };

  const handleSaveReceiptEdit = async () => {
    if (!editingReceipt?.id) return;
    setIsSavingReceiptEdit(true);
    try {
      const totalAmount = editingReceiptChecks.reduce((s, c) => s + Number(c.amount || 0), 0);
      const res = await fetch(`/api/counter-receipts/${editingReceipt.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receipt: {
            vendorName: editingReceipt.vendorName,
            receiptDate: editingReceipt.receiptDate,
            refNo: editingReceipt.refNo,
            totalAmount: String(totalAmount),
            numberOfChecks: editingReceiptChecks.length,
          },
          checks: editingReceiptChecks,
        }),
      });
      if (!res.ok) throw new Error();
      setEditingReceipt(null);
      fetchCrVault();
      toast({ title: "Updated", description: "Counter receipt updated successfully." });
    } catch {
      toast({ title: "Error", description: "Failed to update.", variant: "destructive" });
    } finally {
      setIsSavingReceiptEdit(false);
    }
  };

  useEffect(() => {
    if (!isLocked) {
      fetchBills();
      fetchInvoices();
      fetchCustomers();
      fetchVendors();
    }
  }, [isLocked]);

  useEffect(() => {
    if (!isLocked && activeTab === "checks") fetchCheckSummary();
  }, [activeTab, isLocked]);

  useEffect(() => {
    if (!isLocked && activeTab === "receipt") {
      fetchCrVault(showArchivedCr);
      fetchSupplierChecks(checkPeriod);
    }
  }, [activeTab, isLocked]);

  useEffect(() => {
    if (!isLocked && activeTab === "billing") fetchBillingVault(showArchivedBilling);
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
      toast({ title: "Select a vendor", description: "Choose a vendor from the dropdown first.", variant: "destructive" });
      return;
    }
    setIsFetchingPending(true);
    try {
      const params = new URLSearchParams({ vendorName: crVendorInput, status: "PENDING_COUNTER" });
      const res = await fetch(`/api/accounts-payable?${params}`);
      if (!res.ok) throw new Error("Server error");
      const data: Bill[] = await res.json();
      setCrVendor(crVendorInput);
      setPendingInvoices(Array.isArray(data) ? data : []);
      setSelectedApIds((Array.isArray(data) ? data : []).map((b) => b.id!).filter(Boolean));
      const total = (Array.isArray(data) ? data : []).reduce((s, b) => s + Number(b.amountDue), 0);
      if (total > 0 && numChecks > 0) autoGenerateChecks(total, numChecks, startDate);
      if (!data.length) toast({ title: "No pending invoices", description: `No PENDING_COUNTER invoices found for "${crVendorInput}".` });
    } catch {
      toast({ title: "Error", description: "Failed to fetch pending invoices.", variant: "destructive" });
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
      const selectedVendor = vendors.find((v) => v.id === selectedVendorId);
      const res = await fetch("/api/counter-receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receipt: {
            vendorName: crVendor,
            vendorTin: selectedVendor?.tin || null,
            vendorAddress: selectedVendor?.address || null,
            receiptDate: crDate,
            refNo: crRefNo,
            totalAmount: String(selectedTotal),
            numberOfChecks: activeChecks.length,
            startDate,
            amountPaid: "0",
            status: "ACTIVE",
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

  const handleDeleteBill = async () => {
    if (!deletingBill?.id) return;
    setIsDeletingBill(true);
    try {
      const res = await fetch(`/api/accounts-payable/${deletingBill.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setDeletingBill(null);
      fetchBills(apVendorFilter || undefined, apFilter);
      toast({ title: "Deleted", description: "Invoice removed from Accounts Payable." });
    } catch {
      toast({ title: "Error", description: "Failed to delete.", variant: "destructive" });
    } finally {
      setIsDeletingBill(false);
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
    const customer = customers.find((c) => c.id === selectedCustomerId);
    const customerName = customer?.name || selected[0].invoice.registeredName;
    setIsGeneratingBilling(true);
    try {
      await generateBillingPDF(customerName, billingLines, billingDate);
      // Mark selected invoices as BILLED
      const ids = selected.map((l) => l.invoice.id).filter(Boolean) as number[];
      if (ids.length > 0) {
        await fetch("/api/sales-invoices/bulk-status", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids, status: "BILLED" }),
        });
      }
      // Save billing collection to DB
      const totalAmount = selected.reduce((s, l) => s + Number(l.invoice.totalAmount_Due), 0);
      await fetch("/api/billing-collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collection: {
            customerName,
            customerTin: customer?.tin || null,
            customerAddress: customer?.address || null,
            billingDate,
            totalAmount: String(totalAmount),
            amountPaid: "0",
            status: "ACTIVE",
          },
          items: selected.map((l) => ({
            salesInvoiceId: l.invoice.id,
            drNo: l.drNo || null,
            poNo: l.poNo || null,
            amount: String(l.invoice.totalAmount_Due),
          })),
        }),
      });
      fetchInvoices();
      fetchBillingVault();
      setCustomerSearch("");
      setSelectedCustomerId(null);
      setBillingLines([]);
      toast({ title: "Billing Collection saved & PDF generated", description: "Invoices marked as BILLED." });
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
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setEditingBill(bill)} className="p-1 text-gray-400 hover:text-blue-600 transition-colors" data-testid={`edit-ap-${bill.id}`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeletingBill(bill)} className="p-1 text-gray-400 hover:text-red-600 transition-colors" data-testid={`delete-ap-${bill.id}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
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
          {/* New Billing Form */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4 text-blue-600" /> New Billing Collection
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Customer</label>
                <select data-testid="select-billing-customer"
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  value={selectedCustomerId ?? ""}
                  onChange={(e) => {
                    const id = Number(e.target.value) || null;
                    setSelectedCustomerId(id);
                    const cust = customers.find((c) => c.id === id);
                    setCustomerSearch(cust?.name || "");
                  }}>
                  <option value="">— Select customer —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}{c.tin ? ` (TIN: ${c.tin})` : ""}</option>
                  ))}
                </select>
                {(() => {
                  const cust = customers.find((c) => c.id === selectedCustomerId);
                  return cust?.address ? <p className="text-xs text-gray-400 mt-1 truncate">{cust.address}</p> : null;
                })()}
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
                  Save & Generate PDF ({selectedCount})
                </button>
              </div>
            </div>
          </div>

          {/* Invoice Lines */}
          {billingLines.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400">
              {customerSearch.trim() ? `No UNPAID invoices found for "${customerSearch}".` : "Select a customer above to load their unpaid invoices."}
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

          {/* Billing Collection Vault */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                <Archive className="h-4 w-4 text-blue-600" /> Billing Collection Vault
                {billingVault.length > 0 && <span className="bg-blue-100 text-blue-700 rounded-full text-xs px-2 py-0.5">{billingVault.length}</span>}
              </h3>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                  <input type="checkbox" checked={showArchivedBilling}
                    onChange={(e) => { setShowArchivedBilling(e.target.checked); fetchBillingVault(e.target.checked); }}
                    className="rounded" />
                  Show Archived
                </label>
                <button onClick={() => fetchBillingVault(showArchivedBilling)} disabled={billingVaultLoading}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md flex items-center gap-2 text-xs font-medium">
                  {billingVaultLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Refresh
                </button>
              </div>
            </div>
            {billingVaultLoading ? (
              <div className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-gray-400" /></div>
            ) : billingVault.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">No billing collections yet. Generate one above.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b text-xs uppercase tracking-wider text-gray-500 font-bold">
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Customer</th>
                      <th className="px-4 py-2 text-left">TIN</th>
                      <th className="px-4 py-2 text-center">Items</th>
                      <th className="px-4 py-2 text-right">Total</th>
                      <th className="px-4 py-2 text-right">Paid</th>
                      <th className="px-4 py-2 text-right">Balance</th>
                      <th className="px-4 py-2 text-center">Status</th>
                      <th className="px-4 py-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {billingVault.map((bc) => {
                      const balance = Number(bc.totalAmount) - Number(bc.amountPaid || 0);
                      return (
                        <tr key={bc.id} className={`hover:bg-gray-50 transition-colors ${bc.status === "ARCHIVED" ? "opacity-60" : ""}`}>
                          <td className="px-4 py-3 text-gray-600 text-xs">{bc.billingDate ? new Date(bc.billingDate).toLocaleDateString("en-PH") : "-"}</td>
                          <td className="px-4 py-3 font-medium text-gray-800">{bc.customerName}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs font-mono">{bc.customerTin || "-"}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{bc.items?.length ?? 0}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-gray-900">₱{Number(bc.totalAmount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-right text-green-700 font-semibold">₱{Number(bc.amountPaid || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-right font-bold text-red-700">₱{balance.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${bc.status === "ARCHIVED" ? "bg-gray-100 text-gray-500" : "bg-green-100 text-green-700"}`}>
                              {bc.status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setPaymentModal({ type: "bc", id: bc.id, label: bc.customerName, totalAmount: Number(bc.totalAmount), amountPaid: Number(bc.amountPaid || 0) })}
                                title="Record Payment"
                                className="p-1.5 text-green-500 hover:bg-green-50 hover:text-green-700 rounded-md transition-colors text-xs font-medium"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleArchiveToggle("bc", bc.id, bc.status)}
                                title={bc.status === "ARCHIVED" ? "Restore" : "Archive"}
                                className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-md transition-colors"
                              >
                                <Archive className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t border-gray-200">
                      <td colSpan={4} className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">Total ({billingVault.length})</td>
                      <td className="px-4 py-2 text-right font-bold text-gray-900">₱{billingVault.reduce((s, bc) => s + Number(bc.totalAmount || 0), 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-2 text-right font-bold text-green-700">₱{billingVault.reduce((s, bc) => s + Number(bc.amountPaid || 0), 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
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
                <label className="block text-xs font-semibold text-gray-500 mb-1">Vendor / Supplier</label>
                <select data-testid="input-cr-vendor"
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  value={selectedVendorId ?? ""}
                  onChange={(e) => {
                    const id = Number(e.target.value) || null;
                    setSelectedVendorId(id);
                    const v = vendors.find((x) => x.id === id);
                    setCrVendorInput(v?.name || "");
                  }}>
                  <option value="">— Select vendor —</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}{v.tin ? ` (TIN: ${v.tin})` : ""}</option>
                  ))}
                </select>
                {(() => {
                  const v = vendors.find((x) => x.id === selectedVendorId);
                  return v?.address ? <p className="text-xs text-gray-400 mt-1">{v.address}</p> : null;
                })()}
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
                  <th className="px-4 py-3 text-center w-16">Print</th>
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
                      <button
                        onClick={() => setPrintCheckData({ check: chk, payee: crVendor || "Payee" })}
                        data-testid={`print-check-${idx}`}
                        title="Print Check"
                        className="p-1.5 rounded-md text-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
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

          {/* ── Counter Receipt Vault ── */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                <Archive className="h-4 w-4 text-indigo-600" /> Counter Receipt Vault
                {crVault.length > 0 && (
                  <span className="bg-indigo-100 text-indigo-700 rounded-full text-xs px-2 py-0.5">{crVault.length}</span>
                )}
              </h3>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                  <input type="checkbox" checked={showArchivedCr}
                    onChange={(e) => { setShowArchivedCr(e.target.checked); fetchCrVault(e.target.checked); }}
                    className="rounded" />
                  Show Archived
                </label>
                <button onClick={() => fetchCrVault(showArchivedCr)} disabled={crVaultLoading}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md flex items-center gap-2 text-xs font-medium">
                  {crVaultLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Refresh
                </button>
              </div>
            </div>
            {crVaultLoading ? (
              <div className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-gray-400" /></div>
            ) : crVault.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">No saved counter receipts yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b text-xs uppercase tracking-wider text-gray-500 font-bold">
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Vendor</th>
                      <th className="px-4 py-2 text-left">Ref No.</th>
                      <th className="px-4 py-2 text-center">Checks</th>
                      <th className="px-4 py-2 text-right">Total</th>
                      <th className="px-4 py-2 text-right">Paid</th>
                      <th className="px-4 py-2 text-right">Balance</th>
                      <th className="px-4 py-2 text-center">Status</th>
                      <th className="px-4 py-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {crVault.map((cr) => {
                      const balance = Number(cr.totalAmount) - Number(cr.amountPaid || 0);
                      return (
                        <tr key={cr.id} className={`hover:bg-gray-50 transition-colors ${cr.status === "ARCHIVED" ? "opacity-60" : ""}`}>
                          <td className="px-4 py-3 text-gray-600 text-xs">
                            {cr.receiptDate ? new Date(cr.receiptDate).toLocaleDateString("en-PH") : "-"}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-800">{cr.vendorName}</td>
                          <td className="px-4 py-3 text-gray-500 font-mono text-xs">{cr.refNo || "-"}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
                              {cr.checks?.length ?? cr.numberOfChecks}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-gray-900">
                            ₱{Number(cr.totalAmount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right text-green-700 font-semibold">
                            ₱{Number(cr.amountPaid || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-red-700">
                            ₱{balance.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cr.status === "ARCHIVED" ? "bg-gray-100 text-gray-500" : "bg-green-100 text-green-700"}`}>
                              {cr.status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => setViewingReceipt(cr)} title="View"
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setPaymentModal({ type: "cr", id: cr.id, label: cr.vendorName, totalAmount: Number(cr.totalAmount), amountPaid: Number(cr.amountPaid || 0) })}
                                title="Record Payment"
                                className="p-1.5 text-green-500 hover:bg-green-50 hover:text-green-700 rounded-md transition-colors">
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => { setEditingReceipt({ ...cr }); setEditingReceiptChecks(cr.checks ? [...cr.checks] : []); }} title="Edit"
                                className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleArchiveToggle("cr", cr.id, cr.status)}
                                title={cr.status === "ARCHIVED" ? "Restore" : "Archive"}
                                className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-md transition-colors">
                                <Archive className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => setDeletingReceipt(cr)} title="Delete"
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t border-gray-200">
                      <td colSpan={4} className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">
                        Total ({crVault.length} receipts)
                      </td>
                      <td className="px-4 py-2 text-right font-bold text-gray-900">
                        ₱{crVault.reduce((s, cr) => s + Number(cr.totalAmount || 0), 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-2 text-right font-bold text-green-700">
                        ₱{crVault.reduce((s, cr) => s + Number(cr.amountPaid || 0), 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ SUPPLIER CHECK SUMMARY (inside receipt tab) ══════════════════════ */}
      {activeTab === "receipt" && (() => {
        // Group the supplierChecks data client-side based on checkGroupBy
        const grandTotal = supplierChecks.reduce((s, c) => s + Number(c.amount), 0);

        const renderRows = (rows: any[]) => rows.map((c) => (
          <tr key={c.checkId} className="hover:bg-gray-50 transition-colors text-sm">
            <td className="px-4 py-2.5 text-gray-600 text-xs">{c.checkDate ? new Date(c.checkDate + "T00:00:00").toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "—"}</td>
            <td className="px-4 py-2.5 font-medium text-gray-800">{c.vendorName}</td>
            <td className="px-4 py-2.5 text-gray-600">{c.bank || "—"}</td>
            <td className="px-4 py-2.5 font-mono text-indigo-700 font-semibold">{c.checkNo || "—"}</td>
            <td className="px-4 py-2.5 text-right font-bold text-gray-900">₱{Number(c.amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
          </tr>
        ));

        let groupedContent: JSX.Element | null = null;
        if (checkGroupBy === "none") {
          groupedContent = (
            <tbody className="divide-y divide-gray-100">
              {supplierChecks.length === 0
                ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No checks found for the selected period.</td></tr>
                : renderRows(supplierChecks)}
            </tbody>
          );
        } else {
          const groupKey = checkGroupBy === "supplier" ? "vendorName" : checkGroupBy === "date" ? "checkDate" : "amount";
          const groups = new Map<string, any[]>();
          supplierChecks.forEach((c) => {
            const key = checkGroupBy === "amount"
              ? (Number(c.amount) >= 100000 ? "≥ ₱100,000" : Number(c.amount) >= 50000 ? "₱50,000–₱99,999" : Number(c.amount) >= 10000 ? "₱10,000–₱49,999" : "< ₱10,000")
              : (c[groupKey] || "Unknown");
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(c);
          });
          groupedContent = (
            <tbody className="divide-y divide-gray-100">
              {groups.size === 0
                ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No checks found for the selected period.</td></tr>
                : Array.from(groups.entries()).map(([groupLabel, rows]) => {
                  const subtotal = rows.reduce((s, c) => s + Number(c.amount), 0);
                  return (
                    <>
                      <tr key={`hdr-${groupLabel}`} className="bg-indigo-50 border-t border-indigo-100">
                        <td colSpan={4} className="px-4 py-2 text-xs font-bold text-indigo-700 uppercase tracking-wider">
                          {checkGroupBy === "date" && groupLabel !== "Unknown"
                            ? new Date(groupLabel + "T00:00:00").toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
                            : groupLabel}
                          <span className="ml-2 text-indigo-400 font-normal">({rows.length} check{rows.length !== 1 ? "s" : ""})</span>
                        </td>
                        <td className="px-4 py-2 text-right font-bold text-indigo-800 text-sm">₱{subtotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                      </tr>
                      {renderRows(rows)}
                    </>
                  );
                })}
            </tbody>
          );
        }

        return (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-indigo-600" /> Supplier Check Summary
                  {supplierChecks.length > 0 && <span className="bg-indigo-100 text-indigo-700 rounded-full text-xs px-2 py-0.5">{supplierChecks.length}</span>}
                </h3>
                <button onClick={() => fetchSupplierChecks()} disabled={isLoadingSupplierChecks}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md flex items-center gap-2 text-xs font-medium">
                  {isLoadingSupplierChecks ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Refresh
                </button>
              </div>

              {/* Period Filter */}
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Period</p>
                  <div className="flex rounded-lg overflow-hidden border border-gray-200">
                    {(["today", "week", "month", "custom"] as const).map((p) => (
                      <button key={p} data-testid={`button-check-period-${p}`}
                        onClick={() => { setCheckPeriod(p); if (p !== "custom") fetchSupplierChecks(p); }}
                        className={`px-3 py-1.5 text-xs font-semibold transition-colors ${checkPeriod === p ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                        {p === "today" ? "Today" : p === "week" ? "This Week" : p === "month" ? "This Month" : "Custom"}
                      </button>
                    ))}
                  </div>
                </div>

                {checkPeriod === "custom" && (
                  <>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1.5">From</p>
                      <input type="date" data-testid="input-check-start"
                        className="border border-gray-200 rounded-md px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={checkCustomStart} onChange={(e) => setCheckCustomStart(e.target.value)} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 mb-1.5">To</p>
                      <input type="date" data-testid="input-check-end"
                        className="border border-gray-200 rounded-md px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={checkCustomEnd} onChange={(e) => setCheckCustomEnd(e.target.value)} />
                    </div>
                    <button onClick={() => fetchSupplierChecks("custom")}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-md text-xs font-bold">
                      Apply
                    </button>
                  </>
                )}

                {/* Group By */}
                <div className="ml-auto">
                  <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Group By</p>
                  <div className="flex rounded-lg overflow-hidden border border-gray-200">
                    {(["none", "supplier", "date", "amount"] as const).map((g) => (
                      <button key={g} data-testid={`button-check-group-${g}`}
                        onClick={() => setCheckGroupBy(g)}
                        className={`px-3 py-1.5 text-xs font-semibold transition-colors ${checkGroupBy === g ? "bg-gray-700 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
                        {g === "none" ? "None" : g === "supplier" ? "Supplier" : g === "date" ? "Date" : "Amount"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            {supplierChecks.length > 0 && (
              <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border border-indigo-100 px-5 py-4 shadow-sm text-center">
                    <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Total Issued Amount</p>
                    <p data-testid="stat-total-check-amount" className="text-2xl font-extrabold text-indigo-700 tracking-tight">
                      ₱{grandTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 px-5 py-4 shadow-sm text-center">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Checks Issued</p>
                    <p data-testid="stat-total-check-count" className="text-2xl font-extrabold text-gray-800">
                      {supplierChecks.length}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-100 px-5 py-4 shadow-sm text-center">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Suppliers</p>
                    <p data-testid="stat-total-check-suppliers" className="text-2xl font-extrabold text-gray-800">
                      {new Set(supplierChecks.map((c) => c.vendorName)).size}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Table */}
            {isLoadingSupplierChecks ? (
              <div className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-gray-400" /></div>
            ) : (
              <div className="overflow-x-auto" id="supplier-check-summary-print">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b text-xs uppercase tracking-wider text-gray-500 font-bold">
                      <th className="px-4 py-2.5 text-left">Check Date</th>
                      <th className="px-4 py-2.5 text-left">Supplier</th>
                      <th className="px-4 py-2.5 text-left">Bank</th>
                      <th className="px-4 py-2.5 text-left">Check No.</th>
                      <th className="px-4 py-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  {groupedContent}
                  {supplierChecks.length > 0 && (
                    <tfoot>
                      <tr className="bg-yellow-50 border-t-2 border-yellow-200">
                        <td colSpan={4} className="px-4 py-2.5 text-right font-bold text-yellow-800 text-sm">
                          GRAND TOTAL ({supplierChecks.length} check{supplierChecks.length !== 1 ? "s" : ""})
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-yellow-900 text-sm">
                          ₱{grandTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}

            {/* ── Below-table Summary ── */}
            <div className="px-5 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 text-sm text-gray-500">
                  <span>
                    <span className="font-semibold text-gray-700">{supplierChecks.length}</span> check{supplierChecks.length !== 1 ? "s" : ""}
                  </span>
                  <span>
                    <span className="font-semibold text-gray-700">{new Set(supplierChecks.map((c) => c.vendorName)).size}</span> supplier{new Set(supplierChecks.map((c) => c.vendorName)).size !== 1 ? "s" : ""}
                  </span>
                  <span className="text-gray-300">|</span>
                  <span className="text-xs text-gray-400 italic">
                    {(() => {
                      const { start, end } = getDateRange(checkPeriod);
                      if (checkPeriod === "today") return `Today (${start})`;
                      if (checkPeriod === "month") return `${new Date(start + "T00:00:00").toLocaleDateString("en-PH", { month: "long", year: "numeric" })}`;
                      return `${start} → ${end}`;
                    })()}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-600 uppercase tracking-wide">Total Issued</span>
                  <div className="bg-indigo-700 text-white px-6 py-2.5 rounded-xl shadow font-extrabold text-lg tracking-tight" data-testid="total-issued-below">
                    ₱{grandTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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

      {/* ── CHECK PRINTER MODAL ── */}
      {printCheckData && (() => {
        const { check, payee } = printCheckData;
        const amount = Number(check.amount || 0);
        const amountWords = amountToWords(amount);
        const formattedDate = check.date
          ? new Date(check.date + "T00:00:00").toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
          : "";
        const formattedAmount = amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        const doPrint = () => {
          document.body.classList.add("check-printing");
          window.print();
          setTimeout(() => document.body.classList.remove("check-printing"), 1500);
        };

        return (
          <>
            {/* Screen preview modal */}
            <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden">
                {/* Modal header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
                      <Printer className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900">Check Printer Preview</h2>
                      <p className="text-xs text-gray-500">Review the check before printing</p>
                    </div>
                  </div>
                  <button onClick={() => setPrintCheckData(null)} className="p-2 rounded-lg hover:bg-gray-200 text-gray-500">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Check preview card */}
                <div className="p-6">
                  {/* The check visual */}
                  <div className="relative border-2 border-gray-300 rounded-lg overflow-hidden shadow-lg"
                    style={{ background: "linear-gradient(135deg, #f0f7ff 0%, #e8f4e8 50%, #f0f7ff 100%)", minHeight: "200px" }}>
                    {/* Subtle watermark lines */}
                    <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "repeating-linear-gradient(45deg, #1a56db 0px, #1a56db 1px, transparent 1px, transparent 20px)" }} />

                    <div className="relative p-6">
                      {/* Top row: company + check no + date */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-base font-black text-blue-800 tracking-wider">Truckgear Truck Parts Store</p>
                          <p className="text-xs text-gray-500 font-medium">1032 A. Bonifacio St. Brgy Balingasa Q.C,</p>
                          <p className="text-xs text-gray-500">Tel: (02)85513863 | CP: 09285066385</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">Check No.</p>
                          <p className="text-sm font-mono font-bold text-gray-800 border-b border-gray-400 pb-0.5 min-w-[120px] text-right">
                            {check.checkNo || "___________"}
                          </p>
                        </div>
                      </div>

                      {/* Date row */}
                      <div className="flex justify-end mb-5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-600 uppercase">Date:</span>
                          <span className="text-sm font-semibold text-gray-800 border-b border-gray-400 pb-0.5 min-w-[180px] text-right">
                            {formattedDate || "_______________"}
                          </span>
                        </div>
                      </div>

                      {/* Pay to row */}
                      <div className="flex items-end gap-3 mb-4">
                        <span className="text-xs font-bold text-gray-600 uppercase whitespace-nowrap">Pay to the Order of:</span>
                        <div className="flex-1 border-b-2 border-gray-500 pb-0.5">
                          <p className="text-sm font-bold text-gray-900">{payee || "___________________________"}</p>
                        </div>
                        <div className="flex items-center gap-1 border-2 border-gray-500 rounded px-3 py-1 bg-white/60 min-w-[140px]">
                          <span className="text-sm font-bold text-gray-700">₱</span>
                          <span className="text-sm font-mono font-bold text-gray-900 text-right flex-1">{formattedAmount}</span>
                        </div>
                      </div>

                      {/* Amount in words */}
                      <div className="mb-5">
                        <div className="border-b-2 border-gray-500 pb-0.5">
                          <p className="text-xs font-bold text-gray-900 tracking-wide uppercase">{amountWords}</p>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">Amount in words</p>
                      </div>

                      {/* Bottom row: bank + signature */}
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-xs font-bold text-gray-500 uppercase mb-1">Bank</p>
                          <p className="text-sm font-semibold text-gray-800 border-b border-gray-400 pb-0.5 min-w-[160px]">
                            {check.bank || "_______________"}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="border-t-2 border-gray-600 mt-8 pt-1 min-w-[180px]">
                            <p className="text-xs text-gray-500 font-semibold uppercase">Authorized Signature</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fields summary */}
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Amount in Words</p>
                      <p className="text-xs font-bold text-gray-800 leading-relaxed">{amountWords}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Print Instructions</p>
                      <p className="text-xs text-gray-600">Load check paper in printer. Click <strong>Print Check</strong> below. Printer will output to the check at 190×83mm.</p>
                    </div>
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <button onClick={() => setPrintCheckData(null)}
                    className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-100">
                    Close
                  </button>
                  <button onClick={doPrint}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 shadow-lg shadow-blue-200">
                    <Printer className="h-4 w-4" />
                    Print Check
                  </button>
                </div>
              </div>
            </div>

            {/* Hidden check print area — rendered into DOM for browser print */}
            <div id="check-print-area" style={{
              width: "190mm", height: "83mm", padding: "5mm 8mm",
              fontFamily: "'Arial', sans-serif", fontSize: "9pt",
              background: "transparent", boxSizing: "border-box",
              display: "flex", flexDirection: "column", justifyContent: "space-between",
            }}>
              {/* Top: company + check no */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: "10pt", fontWeight: 900, letterSpacing: "0.5px", color: "#1a3c8f" }}>Truckgear Truck Parts Store</div>
                  <div style={{ fontSize: "6.5pt", color: "#555" }}>1032 A. Bonifacio St. Brgy Balingasa Q.C,</div>
                  <div style={{ fontSize: "6.5pt", color: "#555" }}>Tel: (02)85513863 | CP: 09285066385</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "7pt", fontWeight: 700, color: "#555", textTransform: "uppercase" }}>Check No.</div>
                  <div style={{ fontSize: "9pt", fontFamily: "monospace", fontWeight: 700, borderBottom: "1px solid #333", paddingBottom: "1px", minWidth: "90px", textAlign: "right" }}>
                    {check.checkNo || ""}
                  </div>
                </div>
              </div>

              {/* Date */}
              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "7pt", fontWeight: 700, textTransform: "uppercase", color: "#444" }}>Date:</span>
                <span style={{ fontSize: "9pt", fontWeight: 600, borderBottom: "1px solid #333", paddingBottom: "1px", minWidth: "140px", textAlign: "right" }}>
                  {formattedDate}
                </span>
              </div>

              {/* Pay to + Amount box */}
              <div style={{ display: "flex", alignItems: "flex-end", gap: "8px" }}>
                <span style={{ fontSize: "7pt", fontWeight: 700, textTransform: "uppercase", color: "#444", whiteSpace: "nowrap" }}>Pay to the Order of:</span>
                <div style={{ flex: 1, borderBottom: "1.5px solid #222", paddingBottom: "1px" }}>
                  <span style={{ fontSize: "9pt", fontWeight: 700 }}>{payee}</span>
                </div>
                <div style={{ border: "1.5px solid #222", borderRadius: "3px", padding: "1px 6px", minWidth: "110px", display: "flex", alignItems: "center", gap: "3px", background: "rgba(255,255,255,0.5)" }}>
                  <span style={{ fontSize: "9pt", fontWeight: 700 }}>₱</span>
                  <span style={{ fontSize: "9pt", fontFamily: "monospace", fontWeight: 700, flex: 1, textAlign: "right" }}>{formattedAmount}</span>
                </div>
              </div>

              {/* Amount in words */}
              <div>
                <div style={{ borderBottom: "1.5px solid #222", paddingBottom: "1px" }}>
                  <span style={{ fontSize: "8pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3px" }}>{amountWords}</span>
                </div>
                <div style={{ fontSize: "6.5pt", color: "#888", marginTop: "1px" }}>Amount in words</div>
              </div>

              {/* Bank + Signature */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                  <div style={{ fontSize: "7pt", fontWeight: 700, color: "#555", textTransform: "uppercase", marginBottom: "2px" }}>Bank</div>
                  <div style={{ fontSize: "9pt", fontWeight: 600, borderBottom: "1px solid #333", paddingBottom: "1px", minWidth: "130px" }}>
                    {check.bank || ""}
                  </div>
                </div>
                <div style={{ textAlign: "center", minWidth: "160px" }}>
                  <div style={{ borderTop: "1.5px solid #333", paddingTop: "3px" }}>
                    <div style={{ fontSize: "7pt", fontWeight: 700, color: "#555", textTransform: "uppercase" }}>Authorized Signature</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* ── VIEW COUNTER RECEIPT MODAL ── */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Supplier Counter Receipt</h2>
                <p className="text-sm text-gray-500">{viewingReceipt.vendorName} · {viewingReceipt.receiptDate ? new Date(viewingReceipt.receiptDate).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : ""}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setEditingReceipt({ ...viewingReceipt }); setEditingReceiptChecks(viewingReceipt.checks ? [...viewingReceipt.checks] : []); setViewingReceipt(null); }}
                  className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-medium hover:bg-amber-100">
                  <Pencil className="h-4 w-4" /> Edit
                </button>
                <button onClick={() => { setDeletingReceipt(viewingReceipt); setViewingReceipt(null); }}
                  className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100">
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
                <button onClick={() => setViewingReceipt(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-3 gap-4 bg-gray-50 rounded-xl p-4">
                <div><p className="text-xs font-bold text-gray-500 uppercase mb-1">Vendor</p><p className="text-sm font-semibold text-gray-800">{viewingReceipt.vendorName}</p></div>
                <div><p className="text-xs font-bold text-gray-500 uppercase mb-1">Date</p><p className="text-sm font-semibold text-gray-800">{viewingReceipt.receiptDate ? new Date(viewingReceipt.receiptDate).toLocaleDateString("en-PH") : "-"}</p></div>
                <div><p className="text-xs font-bold text-gray-500 uppercase mb-1">Ref No.</p><p className="text-sm font-mono font-semibold text-gray-800">{viewingReceipt.refNo || "-"}</p></div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Check Details</h4>
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b text-xs uppercase text-gray-500 font-bold">
                        <th className="px-3 py-2 text-left">#</th>
                        <th className="px-3 py-2 text-left">Bank</th>
                        <th className="px-3 py-2 text-left">Check No.</th>
                        <th className="px-3 py-2 text-left">Date</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(viewingReceipt.checks || []).map((c: any, i: number) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                          <td className="px-3 py-2 text-gray-700">{c.bank || "-"}</td>
                          <td className="px-3 py-2 font-mono text-gray-700">{c.checkNo || "-"}</td>
                          <td className="px-3 py-2 text-gray-600 text-xs">{c.checkDate ? new Date(c.checkDate).toLocaleDateString("en-PH") : "-"}</td>
                          <td className="px-3 py-2 text-right font-bold text-gray-900">₱{Number(c.amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-yellow-50 border-t-2 border-yellow-200">
                        <td colSpan={4} className="px-3 py-2 text-right text-sm font-bold text-yellow-800">TOTAL</td>
                        <td className="px-3 py-2 text-right font-bold text-yellow-900">₱{Number(viewingReceipt.totalAmount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT COUNTER RECEIPT MODAL ── */}
      {editingReceipt && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900">Edit Counter Receipt</h2>
              <button onClick={() => setEditingReceipt(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Vendor Name</label>
                  <input className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={editingReceipt.vendorName || ""}
                    onChange={(e) => setEditingReceipt({ ...editingReceipt, vendorName: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Receipt Date</label>
                  <input type="date" className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={editingReceipt.receiptDate || ""}
                    onChange={(e) => setEditingReceipt({ ...editingReceipt, receiptDate: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Ref No.</label>
                  <input className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={editingReceipt.refNo || ""}
                    onChange={(e) => setEditingReceipt({ ...editingReceipt, refNo: e.target.value })} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-gray-500 uppercase">Check Details</h4>
                  <button onClick={() => setEditingReceiptChecks(prev => [...prev, { checkNo: "", bank: "", checkDate: new Date().toISOString().split("T")[0], amount: "" }])}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                    <Plus className="h-3.5 w-3.5" /> Add Check
                  </button>
                </div>
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b text-xs uppercase text-gray-500 font-bold">
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">Bank</th>
                        <th className="px-3 py-2">Check No.</th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Amount (₱)</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {editingReceiptChecks.map((c, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 text-gray-500 text-center">{i + 1}</td>
                          <td className="px-3 py-2">
                            <input className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-400 outline-none"
                              value={c.bank || ""} onChange={(e) => setEditingReceiptChecks(prev => prev.map((x, j) => j === i ? { ...x, bank: e.target.value } : x))} />
                          </td>
                          <td className="px-3 py-2">
                            <input className="w-full border border-gray-200 rounded px-2 py-1 text-xs font-mono focus:ring-1 focus:ring-blue-400 outline-none"
                              value={c.checkNo || ""} onChange={(e) => setEditingReceiptChecks(prev => prev.map((x, j) => j === i ? { ...x, checkNo: e.target.value } : x))} />
                          </td>
                          <td className="px-3 py-2">
                            <input type="date" className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-400 outline-none"
                              value={c.checkDate || ""} onChange={(e) => setEditingReceiptChecks(prev => prev.map((x, j) => j === i ? { ...x, checkDate: e.target.value } : x))} />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" step="0.01" className="w-full border border-gray-200 rounded px-2 py-1 text-xs text-right focus:ring-1 focus:ring-blue-400 outline-none"
                              value={c.amount || ""} onChange={(e) => setEditingReceiptChecks(prev => prev.map((x, j) => j === i ? { ...x, amount: e.target.value } : x))} />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button onClick={() => setEditingReceiptChecks(prev => prev.filter((_, j) => j !== i))}
                              className="text-red-400 hover:text-red-600">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-yellow-50 border-t-2 border-yellow-200">
                        <td colSpan={4} className="px-3 py-2 text-right text-sm font-bold text-yellow-800">TOTAL</td>
                        <td className="px-3 py-2 text-right font-bold text-yellow-900">
                          ₱{editingReceiptChecks.reduce((s, c) => s + Number(c.amount || 0), 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setEditingReceipt(null)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button onClick={handleSaveReceiptEdit} disabled={isSavingReceiptEdit}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {isSavingReceiptEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE COUNTER RECEIPT CONFIRMATION ── */}
      {deletingReceipt && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Delete Counter Receipt</h3>
                <p className="text-sm text-gray-500">This cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-6">
              Delete the counter receipt for <span className="font-bold text-gray-900">{deletingReceipt.vendorName}</span> amounting to{" "}
              <span className="font-bold">₱{Number(deletingReceipt.totalAmount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>?
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeletingReceipt(null)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button onClick={handleDeleteReceipt} disabled={isDeletingReceipt}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {isDeletingReceipt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE AP CONFIRMATION ── */}
      {deletingBill && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Delete Invoice</h3>
                <p className="text-sm text-gray-500">This cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-6">
              Delete invoice <span className="font-bold text-gray-900">#{deletingBill.invoiceNumber}</span> from{" "}
              <span className="font-semibold">{deletingBill.vendorName}</span> amounting to{" "}
              <span className="font-bold">₱{Number(deletingBill.amountDue).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingBill(null)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBill}
                disabled={isDeletingBill}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                data-testid="button-confirm-delete-ap"
              >
                {isDeletingBill ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── PAYMENT RECORDING MODAL ── */}
      {paymentModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Record Payment</h2>
                <p className="text-sm text-gray-500 mt-0.5">{paymentModal.label}</p>
              </div>
              <button onClick={() => setPaymentModal(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-xl p-4">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Total Amount</p>
                  <p className="text-base font-bold text-gray-900">₱{paymentModal.totalAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Balance</p>
                  <p className="text-base font-bold text-red-700">₱{(paymentModal.totalAmount - paymentModal.amountPaid).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Payment Date</label>
                <input type="date" className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={pmDate} onChange={(e) => setPmDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Reference / Check No. (optional)</label>
                <input type="text" placeholder="e.g. Check No. 12345 or GCash ref"
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={pmRef} onChange={(e) => setPmRef(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Amount (₱)</label>
                <input type="number" step="0.01" min="0.01" placeholder="0.00"
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-right"
                  value={pmAmount} onChange={(e) => setPmAmount(e.target.value)} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setPaymentModal(null)}
                  className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 px-4 py-2 rounded-md text-sm font-medium">
                  Cancel
                </button>
                <button onClick={handleRecordPayment} disabled={isSavingPayment || !pmAmount || !pmDate}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2">
                  {isSavingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
                  Record Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
