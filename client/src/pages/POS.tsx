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

  // --- MATH ENGINE (MATCHED TO DB COLUMN NAMES) ---
  const totalSales = items.reduce(
    (sum, item) => sum + Number(item.qty) * Number(item.price),
    0,
  );
  const vatableSales = totalSales / 1.12;
  const vatAmount = totalSales - vatableSales;
  const withholdingTax = vatableSales * 0.01;
  // SOP FIX: Ensure this variable name matches the print-area call
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
      return toast({ title: "Required Info Missing", variant: "destructive" });

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
      toast({ title: "Success", description: "Vaulted and Printing..." });

      setTimeout(() => {
        window.print();
        setItems([{ description: "", qty: 1, price: 0 }]);
        setInvoiceNo("");
        setCustomer({ name: "", tin: "", address: "" });
      }, 500);
    } catch (e) {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto animate-in fade-in duration-500 print:p-0 print:m-0">
        {/* SCREEN UI (PRINT HIDDEN) */}
        <div className="print:hidden space-y-6">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 uppercase">
                Sales Terminal
              </h1>
              <p className="text-xs text-gray-500 font-black uppercase">
                Shift: {activeSession?.id || "N/A"}
              </p>
            </div>
            <div className="space-x-3">
              <button
                onClick={() => setIsInventoryModalOpen(true)}
                className="bg-white border-2 border-black text-black px-4 py-2 rounded font-black hover:bg-gray-50"
              >
                Find Part
              </button>
              <button
                onClick={handleSaveAndPrint}
                disabled={isSaving}
                className="bg-blue-600 text-white px-6 py-2 rounded font-black hover:bg-blue-700"
              >
                {isSaving ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  "Finalize & Print"
                )}
              </button>
            </div>
          </div>

          {/* CUSTOMER INFO */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex gap-2">
                {["CASH SALES", "CHARGE SALES"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setPaymentMethod(t)}
                    className={`text-[10px] font-black px-3 py-1 border-2 ${paymentMethod === t ? "bg-black text-white" : "text-gray-400"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <input
                placeholder="REGISTERED NAME"
                className="w-full border p-2 font-black uppercase"
                value={customer.name}
                onChange={(e) =>
                  setCustomer({ ...customer, name: e.target.value })
                }
              />
              <input
                placeholder="ADDRESS"
                className="w-full border p-2 font-medium uppercase"
                value={customer.address}
                onChange={(e) =>
                  setCustomer({ ...customer, address: e.target.value })
                }
              />
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  placeholder="INVOICE #"
                  className="w-full border-2 p-2 font-mono text-red-600 font-black"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                />
                <input
                  type="date"
                  className="w-full border p-2 font-bold"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <input
                placeholder="TIN"
                className="w-full border p-2 font-bold"
                value={customer.tin}
                onChange={(e) =>
                  setCustomer({ ...customer, tin: e.target.value })
                }
              />
            </div>
          </div>

          {/* TABLE */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 font-black text-xs text-gray-500 uppercase">
                <tr>
                  <th className="p-4">Description</th>
                  <th className="p-4">Qty</th>
                  <th className="p-4">Price</th>
                  <th className="p-4 text-right">Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-2">
                      <input
                        className="w-full p-2 uppercase font-bold"
                        value={item.description}
                        onChange={(e) => {
                          const n = [...items];
                          n[index].description = e.target.value;
                          setItems(n);
                        }}
                      />
                    </td>
                    <td className="p-2 w-20">
                      <input
                        type="number"
                        className="w-full p-2 font-bold"
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
                        className="w-full p-2 font-bold"
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
                    <td className="text-center">
                      <button
                        onClick={() =>
                          setItems(items.filter((_, i) => i !== index))
                        }
                      >
                        <Trash2 className="h-4 w-4 text-red-300" />
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
              className="p-4 text-xs font-black text-blue-600 uppercase"
            >
              + Add Row
            </button>
          </div>

          {/* TOTALS */}
          <div className="flex justify-end pt-4">
            <div className="w-96 bg-white p-6 rounded-lg border-2 space-y-3">
              <div className="flex justify-between text-xs font-bold text-gray-400">
                <span>VATable Sales</span>
                <span>
                  ₱
                  {vatableSales.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between text-xs font-bold text-gray-400">
                <span>VAT (12%)</span>
                <span>
                  ₱
                  {vatAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between text-xs font-bold text-red-500">
                <span>WHT (1%)</span>
                <span>
                  -₱
                  {withholdingTax.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="border-t-2 border-black pt-3 flex justify-between font-black text-3xl">
                <span>Total Due</span>
                <span className="text-blue-700 font-mono">
                  ₱
                  {totalAmount_Due.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* INVENTORY MODAL */}
        {isInventoryModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl w-full max-w-2xl border-4 border-black">
              <div className="flex gap-4 border-b-2 border-black pb-4">
                <Search />
                <input
                  placeholder="SEARCH SKU..."
                  className="flex-1 font-black uppercase text-2xl outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="max-h-80 overflow-y-auto mt-4">
                {products.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setItems((prev) =>
                        prev.length === 1 && prev[0].description === ""
                          ? [
                              {
                                description: p.name.toUpperCase(),
                                qty: 1,
                                price: Number(p.sellingPrice),
                              },
                            ]
                          : [
                              ...prev,
                              {
                                description: p.name.toUpperCase(),
                                qty: 1,
                                price: Number(p.sellingPrice),
                              },
                            ],
                      );
                      setIsInventoryModalOpen(false);
                      setSearchTerm("");
                    }}
                    className="w-full p-4 border-b flex justify-between font-bold uppercase text-xs hover:bg-black hover:text-white transition-all"
                  >
                    <span>
                      {p.sku} - {p.name}
                    </span>
                    <span>₱{Number(p.sellingPrice).toLocaleString()}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setIsInventoryModalOpen(false)}
                className="w-full mt-4 text-[10px] font-black uppercase text-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* DRAWER MODAL */}
        {isDrawerModalOpen && (
          <div className="fixed inset-0 bg-black z-[300] flex items-center justify-center">
            <div className="bg-white p-12 rounded-[3rem] text-center space-y-8 w-96 shadow-2xl border-4 border-black/10">
              <Banknote className="mx-auto h-20 w-20 text-blue-600" />
              <h2 className="text-2xl font-black uppercase">Open Terminal</h2>
              <input
                type="number"
                className="w-full p-4 border-4 border-black text-center text-5xl font-black rounded-3xl"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
              />
              <button
                onClick={() => handleOpenDrawer(openingBalance)}
                className="w-full bg-black text-white py-6 rounded-2xl font-black uppercase tracking-widest text-lg"
              >
                Start Shift
              </button>
            </div>
          </div>
        )}

        {/* CALIBRATED PRINT AREA */}
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
          {/* SOP FIX: This now points to totalAmount_Due defined in the Math Engine */}
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
