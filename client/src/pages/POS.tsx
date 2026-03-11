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
  const [isInitialized, setIsInitialized] = useState(false); // New: Prevents blank screen hang

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

  // INVENTORY QUERY
  const { data: productsData } = useQuery<Product[]>({
    queryKey: ["/api/products", searchTerm],
    queryFn: () =>
      fetch(`/api/products?search=${searchTerm}`).then((res) => res.json()),
    enabled: searchTerm.length > 0,
  });

  const products = Array.isArray(productsData) ? productsData : [];

  // DRAWER SYNC (SOP CORRECTIVE FOR VITE 7)
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/pos/drawer-status");
        if (res.ok) {
          const data = await res.json();
          if (data.active) {
            setActiveSession(data.session);
          } else {
            setIsDrawerModalOpen(true);
          }
        }
      } catch (e) {
        setIsDrawerModalOpen(true);
      } finally {
        setIsInitialized(true); // Ensure the app renders regardless of fetch result
      }
    };
    checkStatus();
  }, []);

  // --- MATH ENGINE ---
  const totalSales = items.reduce(
    (sum, item) => sum + Number(item.qty || 0) * Number(item.price || 0),
    0,
  );
  const vatableSales = totalSales / 1.12;
  const vatAmount = totalSales - vatableSales;
  const withholdingTax = vatableSales * 0.01;
  const totalAmount_Due = totalSales - withholdingTax;

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
      toast({ title: "Drawer Error", variant: "destructive" });
    }
  };

  const handleSaveAndPrint = async () => {
    const validItems = items.filter((i) => i.description.trim() !== "");
    if (!activeSession)
      return toast({ title: "Open Drawer", variant: "destructive" });
    if (!customer.name || !invoiceNo)
      return toast({ title: "Info Missing", variant: "destructive" });

    setIsSaving(true);
    try {
      const res = await fetch("/api/vat-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice: {
            invoiceNo,
            customer: { ...customer, type: paymentMethod },
            totalAmountDue: totalAmount_Due.toString(),
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
      toast({ title: "Success" });

      setTimeout(() => {
        window.print();
        setItems([{ description: "", qty: 1, price: 0 }]);
        setInvoiceNo("");
        setCustomer({ name: "", tin: "", address: "" });
      }, 500);
    } catch (e) {
      toast({ title: "Save Failed", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // SOP FIX: If not initialized, show a simple loader to prevent white screen hang
  if (!isInitialized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white uppercase font-black text-xs tracking-widest">
        Booting Terminal...
      </div>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-4 md:p-10">
        {/* VIEW 1: SCREEN UI */}
        <div className="print:hidden space-y-6">
          <div className="flex justify-between items-end border-b-4 border-black pb-6">
            <h1 className="text-4xl font-black uppercase tracking-tighter">
              Terminal V3
            </h1>
            <div className="flex gap-4">
              <button
                onClick={() => setIsInventoryModalOpen(true)}
                className="border-2 border-black px-4 py-2 font-black uppercase text-xs hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none"
              >
                Find Part
              </button>
              <button
                onClick={handleSaveAndPrint}
                disabled={isSaving}
                className="bg-blue-600 border-2 border-blue-600 text-white px-4 py-2 font-black uppercase text-xs hover:bg-blue-700 shadow-[4px_4px_0px_0px_rgba(37,99,235,0.3)]"
              >
                {isSaving ? (
                  <Loader2 className="animate-spin w-4 h-4" />
                ) : (
                  "Finalize & Print"
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-10 bg-gray-50 p-8 border-2 border-gray-100 rounded-2xl">
            <div className="space-y-4">
              <div className="flex gap-2">
                {["CASH SALES", "CHARGE SALES"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setPaymentMethod(t)}
                    className={`px-4 py-1 text-[10px] font-black border-2 transition-all ${paymentMethod === t ? "bg-black text-white border-black" : "text-gray-400 border-gray-200"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <input
                placeholder="REGISTERED NAME"
                className="w-full bg-transparent border-b-2 border-black/10 p-2 font-black uppercase outline-none focus:border-black"
                value={customer.name}
                onChange={(e) =>
                  setCustomer({ ...customer, name: e.target.value })
                }
              />
              <input
                placeholder="ADDRESS"
                className="w-full bg-transparent border-b-2 border-black/10 p-2 font-medium uppercase outline-none"
                value={customer.address}
                onChange={(e) =>
                  setCustomer({ ...customer, address: e.target.value })
                }
              />
            </div>
            <div className="space-y-4 pt-10">
              <div className="grid grid-cols-2 gap-4">
                <input
                  placeholder="INV #"
                  className="w-full bg-transparent border-b-2 border-black/10 p-2 font-mono text-red-600 font-black outline-none"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                />
                <input
                  type="date"
                  className="w-full bg-transparent border-b-2 border-black/10 p-2 font-bold outline-none"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <input
                placeholder="TIN"
                className="w-full bg-transparent border-b-2 border-black/10 p-2 font-bold outline-none"
                value={customer.tin}
                onChange={(e) =>
                  setCustomer({ ...customer, tin: e.target.value })
                }
              />
            </div>
          </div>

          <table className="w-full text-left">
            <thead className="border-b-4 border-black text-[10px] font-black uppercase text-gray-400">
              <tr>
                <th className="p-4">Description</th>
                <th className="p-4">Qty</th>
                <th className="p-4">Price</th>
                <th className="p-4 text-right">Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-gray-50">
              {items.map((item, index) => (
                <tr key={index}>
                  <td className="p-2">
                    <input
                      className="w-full p-2 uppercase font-bold text-sm bg-transparent outline-none"
                      value={item.description}
                      onChange={(e) => {
                        const n = [...items];
                        n[index].description = e.target.value;
                        setItems(n);
                      }}
                    />
                  </td>
                  <td className="p-2 w-24">
                    <input
                      type="number"
                      className="w-full p-2 font-bold bg-transparent outline-none"
                      value={item.qty}
                      onChange={(e) => {
                        const n = [...items];
                        n[index].qty = Number(e.target.value);
                        setItems(n);
                      }}
                    />
                  </td>
                  <td className="p-2 w-32">
                    <input
                      type="number"
                      className="w-full p-2 font-bold bg-transparent outline-none"
                      value={item.price}
                      onChange={(e) => {
                        const n = [...items];
                        n[index].price = Number(e.target.value);
                        setItems(n);
                      }}
                    />
                  </td>
                  <td className="p-4 text-right font-mono font-black text-blue-600">
                    ₱
                    {(item.qty * item.price).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="p-2">
                    <button
                      onClick={() =>
                        setItems(items.filter((_, i) => i !== index))
                      }
                      className="text-red-300 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={() =>
              setItems([...items, { description: "", qty: 1, price: 0 }])
            }
            className="text-xs font-black text-blue-600 uppercase hover:underline"
          >
            + Add Entry
          </button>

          <div className="flex justify-end pt-10">
            <div className="w-96 space-y-2 border-t-4 border-black pt-6">
              <div className="flex justify-between text-xs font-bold text-gray-400 uppercase">
                <span>VATable Sales</span>
                <span>
                  ₱
                  {vatableSales.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between text-xs font-bold text-gray-400 uppercase">
                <span>VAT (12%)</span>
                <span>
                  ₱
                  {vatAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between text-xs font-bold text-red-500 uppercase">
                <span>WHT (1%)</span>
                <span>
                  -₱
                  {withholdingTax.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between font-black text-4xl tracking-tighter uppercase pt-2">
                <span>Total Due</span>
                <span className="text-blue-700">
                  ₱
                  {totalAmount_Due.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* MODALS */}
        {isInventoryModalOpen && (
          <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-white p-10 border-4 border-black w-full max-w-2xl">
              <div className="flex gap-4 border-b-4 border-black pb-4">
                <Search className="w-8 h-8" />
                <input
                  placeholder="SEARCH SKU..."
                  className="flex-1 font-black uppercase text-3xl outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="max-h-80 overflow-y-auto mt-6">
                {products.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      const sel = {
                        description: p.name.toUpperCase(),
                        qty: 1,
                        price: Number(p.sellingPrice),
                      };
                      setItems((prev) =>
                        prev.length === 1 && prev[0].description === ""
                          ? [sel]
                          : [...prev, sel],
                      );
                      setIsInventoryModalOpen(false);
                      setSearchTerm("");
                    }}
                    className="w-full p-4 border-b flex justify-between font-black uppercase text-xs hover:bg-black hover:text-white transition-all"
                  >
                    <span>
                      {p.sku} — {p.name}
                    </span>
                    <span>₱{Number(p.sellingPrice).toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {isDrawerModalOpen && (
          <div className="fixed inset-0 bg-black z-[300] flex items-center justify-center">
            <div className="bg-white p-12 border-8 border-black text-center space-y-8 w-96 shadow-[20px_20px_0px_0px_rgba(37,99,235,1)]">
              <Banknote className="mx-auto h-20 w-20" />
              <h2 className="text-2xl font-black uppercase tracking-tighter">
                Open Terminal
              </h2>
              <input
                type="number"
                className="w-full p-4 border-4 border-black text-center text-5xl font-black outline-none"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
              />
              <button
                onClick={() => handleOpenDrawer(openingBalance)}
                className="w-full bg-black text-white py-6 font-black uppercase tracking-widest text-lg"
              >
                Start Shift
              </button>
            </div>
          </div>
        )}

        {/* --- PRINT AREA --- */}
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
