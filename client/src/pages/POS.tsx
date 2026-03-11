import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import {
  Printer,
  Plus,
  Trash2,
  Save,
  Loader2,
  Search,
  Banknote,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Product } from "@shared/schema";

export default function POS() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);

  // MODAL STATES
  const [isDrawerModalOpen, setIsDrawerModalOpen] = useState(false);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);

  // DATA STATES
  const [invoiceNo, setInvoiceNo] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState("CASH SALES");
  const [customer, setCustomer] = useState({ name: "", tin: "", address: "" });
  const [items, setItems] = useState([{ description: "", qty: 1, price: 0 }]);
  const [openingBalance, setOpeningBalance] = useState("0");
  const [searchTerm, setSearchTerm] = useState("");

  // INVENTORY QUERY WITH ARRAY GUARD
  const { data: productsData } = useQuery<Product[]>({
    queryKey: ["/api/products", searchTerm],
    queryFn: () =>
      fetch(`/api/products?search=${searchTerm}`).then((res) => res.json()),
    enabled: searchTerm.length > 0,
  });

  // SOP FIX: Ensure products is always an array to prevent .map() errors
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

  // --- MATH ENGINE (98% PAPER ACCURATE) ---
  const totalSales = items.reduce(
    (sum, item) => sum + Number(item.qty) * Number(item.price),
    0,
  );
  const vatableSales = totalSales / 1.12;
  const vatAmount = totalSales - vatableSales;
  const withholdingTax = vatableSales * 0.01;
  const totalAmountDue = totalSales - withholdingTax;

  const handleOpenDrawer = async (bal: string) => {
    try {
      const res = await fetch("/api/pos/drawer-open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openingBalance: bal }),
      });
      const data = await res.json();
      setActiveSession(data);
      setIsDrawerModalOpen(false);
    } catch (e) {
      toast({ title: "Connection Error", variant: "destructive" });
    }
  };

  const handleSaveAndPrint = async () => {
    const validItems = items.filter((i) => i.description.trim() !== "");
    if (!activeSession)
      return toast({ title: "Drawer Closed", variant: "destructive" });
    if (!customer.name || !invoiceNo)
      return toast({
        title: "Missing Customer/Invoice#",
        variant: "destructive",
      });
    if (validItems.length === 0)
      return toast({ title: "No Items Added", variant: "destructive" });

    setIsSaving(true);
    try {
      const res = await fetch("/api/vat-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice: {
            invoiceNo,
            customer: { ...customer, type: paymentMethod },
            totalAmountDue: totalAmountDue.toString(),
            drawerSessionId: activeSession.id,
            paymentMethod: paymentMethod === "CASH SALES" ? "CASH" : "CHARGE",
          },
          items: validItems.map((i) => ({
            description: i.description.toUpperCase(),
            qty: i.qty,
            price: i.price.toString(),
          })),
        }),
      });

      if (!res.ok) throw new Error();
      toast({ title: "Success", description: "Saved & Printing..." });

      setTimeout(() => {
        window.print();
        setItems([{ description: "", qty: 1, price: 0 }]);
        setInvoiceNo("");
        setCustomer({ name: "", tin: "", address: "" });
      }, 500);
    } catch (e) {
      toast({
        title: "Error",
        description: "Database rejected the invoice.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto animate-in fade-in duration-500 print:p-0 print:m-0">
        {/* TOP INTERFACE */}
        <div className="print:hidden space-y-6">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 uppercase">
                Sales Invoice Terminal
              </h1>
              <p className="text-sm text-gray-500 mt-1 uppercase font-bold tracking-widest">
                Session:{" "}
                <span className="text-blue-600">
                  #{activeSession?.id || "----"}
                </span>
              </p>
            </div>
            <div className="space-x-3">
              <button
                onClick={() => setIsInventoryModalOpen(true)}
                className="bg-white border-2 border-black text-black px-4 py-2 rounded-md font-black hover:bg-gray-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] inline-flex items-center transition-all"
              >
                <Search className="w-4 h-4 mr-2" /> Find Part
              </button>
              <button
                onClick={handleSaveAndPrint}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-black transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] inline-flex items-center"
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

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex gap-4">
                {["CASH SALES", "CHARGE SALES"].map((term) => (
                  <button
                    key={term}
                    onClick={() => setPaymentMethod(term)}
                    className={`text-[10px] font-black px-4 py-1.5 rounded border-2 transition-all ${paymentMethod === term ? "border-black bg-black text-white" : "border-gray-200 text-gray-400"}`}
                  >
                    {term}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Registered Name
                </label>
                <input
                  type="text"
                  className="w-full border p-2 rounded outline-none uppercase font-black"
                  value={customer.name}
                  onChange={(e) =>
                    setCustomer({ ...customer, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Address
                </label>
                <input
                  type="text"
                  className="w-full border p-2 rounded outline-none uppercase font-medium"
                  value={customer.address}
                  onChange={(e) =>
                    setCustomer({ ...customer, address: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 pt-10">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Invoice #
                  </label>
                  <input
                    type="text"
                    className="w-full border-2 border-gray-100 p-2 rounded font-mono text-red-600 font-black outline-none"
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
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  TIN
                </label>
                <input
                  type="text"
                  className="w-full border p-2 rounded outline-none font-bold"
                  value={customer.tin}
                  onChange={(e) =>
                    setCustomer({ ...customer, tin: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr className="text-[10px] uppercase font-black text-gray-500">
                  <th className="p-4 w-1/2">Item Description</th>
                  <th className="p-4">Qty</th>
                  <th className="p-4">Unit Price</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4 text-center"></th>
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
                    <td className="p-4 text-right font-mono font-bold text-blue-800">
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
                        className="text-red-300 hover:text-red-600 transition-colors"
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
                className="text-xs font-black text-blue-600 uppercase flex items-center hover:underline"
              >
                <Plus className="w-4 h-4 mr-1" /> Manual Entry
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <div className="w-96 bg-white p-6 rounded-lg shadow-sm border-2 border-gray-100 space-y-3">
              <div className="flex justify-between text-xs font-bold uppercase text-gray-400">
                <span>VATable Sales:</span>
                <span className="text-black font-black">
                  ₱
                  {vatableSales.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between text-xs font-bold uppercase text-gray-400">
                <span>VAT (12%):</span>
                <span className="text-black font-black">
                  ₱
                  {vatAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between text-xs font-bold uppercase text-red-500">
                <span>Less: WHT (1%):</span>
                <span className="font-black">
                  - ₱
                  {withholdingTax.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="border-t-2 border-black pt-3 flex justify-between font-black text-3xl uppercase tracking-tighter">
                <span>Total Due:</span>
                <span className="text-blue-700 font-mono">
                  ₱
                  {totalAmountDue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* INVENTORY MODAL (SOP FIX APPLIED HERE) */}
        {isInventoryModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white p-10 rounded-2xl w-full max-w-2xl shadow-2xl border-4 border-black">
              <div className="flex gap-4 border-b-2 border-black pb-4 items-center">
                <Search className="text-blue-600 w-8 h-8" />
                <input
                  placeholder="SEARCH TRUCK GEAR..."
                  className="flex-1 outline-none font-black uppercase text-2xl"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="max-h-[400px] overflow-y-auto space-y-1 mt-4">
                {products.length > 0 ? (
                  products.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        const selected = {
                          description: p.name.toUpperCase(),
                          qty: 1,
                          price: Number(p.sellingPrice),
                        };
                        setItems((prev) =>
                          prev.length === 1 && prev[0].description === ""
                            ? [selected]
                            : [...prev, selected],
                        );
                        setIsInventoryModalOpen(false);
                        setSearchTerm("");
                      }}
                      className="w-full p-4 text-left border rounded hover:bg-black hover:text-white transition-all flex justify-between font-bold uppercase text-xs"
                    >
                      <span>
                        {p.sku} — {p.name}
                      </span>
                      <span>₱{Number(p.sellingPrice).toLocaleString()}</span>
                    </button>
                  ))
                ) : (
                  <p className="p-10 text-center text-gray-400 font-bold uppercase text-xs tracking-widest">
                    No matching parts found.
                  </p>
                )}
              </div>
              <button
                onClick={() => setIsInventoryModalOpen(false)}
                className="w-full mt-6 py-2 text-[10px] font-black uppercase text-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* DRAWER MODAL */}
        {isDrawerModalOpen && (
          <div className="fixed inset-0 bg-slate-950 z-[300] flex items-center justify-center">
            <div className="bg-white p-12 rounded-[2.5rem] text-center space-y-8 w-[450px] shadow-2xl border-b-8 border-black">
              <Banknote className="mx-auto h-20 w-20 text-black" />
              <h2 className="text-3xl font-black uppercase tracking-tighter">
                Initialize Terminal
              </h2>
              <input
                type="number"
                className="w-full p-6 border-4 border-black text-center text-6xl font-black rounded-3xl"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
              />
              <button
                onClick={() => handleOpenDrawer(openingBalance)}
                className="w-full bg-black text-white py-8 rounded-3xl font-black uppercase tracking-widest text-xl"
              >
                Open Terminal
              </button>
            </div>
          </div>
        )}

        {/* --- PRESERVED CALIBRATED PRINT AREA --- */}
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
