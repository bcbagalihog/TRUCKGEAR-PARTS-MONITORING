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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Product } from "@shared/schema";

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

          {/* --- ORIGINAL FORM SECTION (UNTOUCHED) --- */}
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
        </div>

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

        <div
          id="print-area"
          className="hidden print:block font-sans text-black text-[13px] relative"
        >
          <div
            style={{
              position: "absolute",
              top: "34mm",
              left: "35mm",
              width: "80mm",
            }}
          >
            {customer.name}
          </div>
          <div
            style={{
              position: "absolute",
              top: "40mm",
              left: "35mm",
              width: "80mm",
            }}
          >
            {customer.tin}
          </div>
          <div
            style={{
              position: "absolute",
              top: "46mm",
              left: "35mm",
              width: "85mm",
              lineHeight: "6mm",
            }}
          >
            {customer.address}
          </div>
          <div style={{ position: "absolute", top: "33mm", left: "115mm" }}>
            {date}
          </div>
          {items.map((item, index) => (
            <div
              key={index}
              style={{
                position: "absolute",
                width: "100%",
                top: `${69 + index * 6.5}mm`,
              }}
            >
              <div style={{ position: "absolute", left: "5mm", width: "70mm" }}>
                {item.description}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: "85mm",
                  width: "15mm",
                  textAlign: "center",
                }}
              >
                {item.qty}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: "105mm",
                  width: "20mm",
                  textAlign: "right",
                }}
              >
                {Number(item.price).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: "130mm",
                  width: "18mm",
                  textAlign: "right",
                }}
              >
                {(item.qty * item.price).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </div>
            </div>
          ))}
          <div
            style={{
              position: "absolute",
              top: "123mm",
              left: "40mm",
              width: "25mm",
              textAlign: "right",
            }}
          >
            {vatableSales.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </div>
          <div
            style={{
              position: "absolute",
              top: "129mm",
              left: "40mm",
              width: "25mm",
              textAlign: "right",
            }}
          >
            {vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div
            style={{
              position: "absolute",
              top: "161mm",
              left: "130mm",
              width: "18mm",
              textAlign: "right",
              fontWeight: "bold",
            }}
          >
            {totalAmount_Due.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}
