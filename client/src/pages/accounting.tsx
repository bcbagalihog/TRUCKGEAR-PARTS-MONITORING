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
  PrinterCheck,
  Wallet,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";

export default function Accounting() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- SECURITY STATE ---
  const [isLocked, setIsLocked] = useState(true);
  const [pin, setPin] = useState("");

  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // States for Modals
  const [editingBill, setEditingBill] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [receivingBill, setReceivingBill] = useState<any | null>(null);
  const [vendorDrNumber, setVendorDrNumber] = useState("");
  const [isReceiving, setIsReceiving] = useState(false);

  useEffect(() => {
    if (!isLocked) {
      fetchBills();
    }
  }, [isLocked]);

  const fetchBills = () => {
    fetch(`/api/accounts-payable?t=${new Date().getTime()}`)
      .then((res) => res.json())
      .then((data) => {
        const sortedData = data.sort((a: any, b: any) => b.id - a.id);
        setBills(sortedData);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch bills", err);
        toast({
          title: "Error",
          description: "Failed to load bills.",
          variant: "destructive",
        });
      });
  };

  // PIN LOCK SCREEN
  if (isLocked) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm text-center animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="h-10 w-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Admin Access Only
          </h2>
          <p className="text-sm text-slate-500 mb-8">
            Enter your security PIN to view the Truckgear Ledger.
          </p>

          <input
            type="password"
            autoFocus
            maxLength={4}
            className="w-full text-center text-5xl tracking-[0.5em] font-mono border-b-4 border-blue-200 focus:border-blue-600 outline-none pb-2 mb-10 transition-all bg-transparent"
            placeholder="****"
            value={pin}
            onChange={(e) => {
              const inputPin = e.target.value;
              setPin(inputPin);
              // CHANGE YOUR PIN HERE
              if (inputPin === "8888") {
                setIsLocked(false);
                toast({
                  title: "Unlocked",
                  description: "Access granted to Accounting.",
                });
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

  // --- EXISTING AI SCANNER & SAVE FUNCTIONS ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsScanning(true);
    toast({
      title: "Scanning...",
      description: "AI is reading your invoice...",
    });
    try {
      const formData = new FormData();
      formData.append("invoice", file);
      const res = await fetch("/api/ai/scan-invoice", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Scan failed");
      const extractedData = await res.json();
      setEditingBill({
        invoiceNumber: extractedData.invoiceNumber || "",
        vendorName: extractedData.vendorName || "",
        amountDue: extractedData.amountDue || "0",
        dueDate:
          extractedData.dueDate || new Date().toISOString().split("T")[0],
        status: "UNPAID",
      });
      toast({ title: "Success!", description: "Invoice parsed successfully." });
    } catch (err) {
      toast({
        title: "AI Error",
        description: "Could not read the invoice.",
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const isNewBill = !editingBill.id;
      const url = isNewBill
        ? "/api/accounts-payable"
        : `/api/accounts-payable/${editingBill.id}`;
      const method = isNewBill ? "POST" : "PUT";
      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingBill),
      });
      if (response.ok) {
        toast({ title: "Success", description: "Bill saved successfully." });
        setEditingBill(null);
        setTimeout(fetchBills, 100);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleReceiveBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsReceiving(true);
    try {
      const response = await fetch(
        `/api/accounts-payable/${receivingBill.id}/receive`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vendorDrNumber }),
        },
      );
      if (response.ok) {
        toast({
          title: "DR Received!",
          description: "Spot buy marked as received.",
        });
        setReceivingBill(null);
        setVendorDrNumber("");
        setTimeout(fetchBills, 100);
      }
    } finally {
      setIsReceiving(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* BREADCRUMB NAVIGATION */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-2">
        <Link
          href="/"
          className="hover:text-blue-600 flex items-center gap-1 transition-colors"
        >
          <Home className="h-4 w-4" /> Home
        </Link>
        <ChevronLeft className="h-4 w-4" />
        <span className="font-medium text-gray-900">Accounting</span>
      </nav>

      {/* Header Section */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Accounts Payable
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage unpaid bills and strictly monitor OTC spot buys.
          </p>
        </div>

        <div className="flex gap-3">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            className="bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 px-4 py-2 rounded-md flex items-center text-sm font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            {isScanning ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <ScanLine className="w-4 h-4 mr-2" />
            )}
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
          >
            <Plus className="w-4 h-4 mr-2" />
            New Bill
          </button>
        </div>
      </div>

      {/* Data Table */}
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
              <th className="p-4 text-center">Disburse</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-400">
                  Loading ledger...
                </td>
              </tr>
            ) : bills.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-400">
                  No records found.
                </td>
              </tr>
            ) : (
              bills.map((bill: any) => (
                <tr
                  key={bill.id}
                  className="hover:bg-gray-50 transition-colors group"
                >
                  <td className="p-4 text-gray-900">
                    {bill.dueDate
                      ? new Date(bill.dueDate).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="p-4 text-blue-600 font-mono font-bold">
                    {bill.invoiceNumber}
                  </td>
                  <td className="p-4 text-gray-900 font-semibold">
                    {bill.vendorName}
                  </td>
                  <td className="p-4 text-gray-600 font-mono text-xs">
                    {bill.vendorDrNumber || "Awaiting DR"}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        bill.status === "PAID"
                          ? "bg-green-100 text-green-700"
                          : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {bill.status}
                    </span>
                  </td>
                  <td className="p-4 text-right font-bold text-gray-900">
                    ₱
                    {Number(bill.amountDue).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="p-4 text-center space-x-1">
                    <button
                      className="p-1.5 rounded hover:bg-green-50 text-green-600"
                      title="Write Check"
                      onClick={() =>
                        toast({
                          title: "Disbursement",
                          description: "Check template opening...",
                        })
                      }
                    >
                      <PrinterCheck className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setReceivingBill(bill)}
                      className="p-1.5 rounded hover:bg-purple-50 text-purple-600"
                      title="Receive DR"
                    >
                      <PackageCheck className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingBill(bill)}
                      className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
                      title="Edit"
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

      {/* --- MODALS (RECEIVE & EDIT) AS PER YOUR ORIGINAL CODE --- */}
      {/* (Omitted for brevity, but keep yours in the file) */}
    </div>
  );
}
