import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Printer, Plus, Trash2, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function VATInvoice() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

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

  // --- MATH ENGINE ---
  const totalSales = items.reduce(
    (sum, item) => sum + item.qty * item.price,
    0,
  );
  const vatableSales = totalSales / 1.12;
  const vatAmount = totalSales - vatableSales;

  const withholdingTax = vatableSales * (withholdingTaxRate / 100);
  const totalAmountDue = totalSales - withholdingTax;

  const addItem = () =>
    setItems([...items, { description: "", qty: 1, price: 0 }]);

  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value } as any;
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // --- SAVE TO DATABASE ---
  const handleSaveToVault = async () => {
    if (!customer.name || !invoiceNo) {
      toast({
        title: "Missing Info",
        description: "Please provide a Registered Name and Invoice Number.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        invoice: {
          invoiceNo,
          date,
          customer,
          type: customer.type,
          vatableSales,
          vatAmount,
          withholdingTax,
          totalAmountDue,
        },
        items: items.filter((i) => i.description.trim() !== ""), // Only save rows that have text
      };

      const res = await fetch("/api/vat-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save");

      toast({
        title: "Success!",
        description: `Invoice #${invoiceNo} securely saved to vault.`,
      });

      // Optional: Clear the form after saving
      // setInvoiceNo("");
      // setItems([{ description: "", qty: 1, price: 0 }]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not save the invoice. Is the backend route set up?",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto animate-in fade-in duration-500 print:p-0 print:m-0">
        {/* ========================================= */}
        {/* VIEW 1: THE SCREEN UI */}
        {/* ========================================= */}
        <div className="print:hidden space-y-6">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                VAT Invoices (Print)
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Generate VATable invoices and print directly onto physical
                forms.
              </p>
            </div>
            <div className="space-x-3">
              <button
                onClick={handleSaveToVault}
                disabled={isSaving}
                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md font-medium hover:bg-gray-50 transition-colors shadow-sm inline-flex items-center disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {isSaving ? "Saving..." : "Save to Vault"}
              </button>
              <button
                onClick={() => window.print()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors shadow-sm inline-flex items-center"
              >
                <Printer className="w-4 h-4 mr-2" /> Print on Paper
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Sold To (Registered Name)
                </label>
                <input
                  type="text"
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
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
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
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
                    className="w-full border p-2 rounded font-mono text-red-600 focus:ring-2 outline-none"
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    placeholder="e.g. 4151"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    className="w-full border p-2 rounded focus:ring-2 outline-none"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    TIN Number
                  </label>
                  <input
                    type="text"
                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    value={customer.tin}
                    onChange={(e) =>
                      setCustomer({ ...customer, tin: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Withholding Tax (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                    value={withholdingTaxRate}
                    onChange={(e) =>
                      setWithholdingTaxRate(Number(e.target.value))
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr className="text-xs uppercase tracking-wider text-gray-500">
                  <th className="p-4 font-bold w-1/2">Item Description</th>
                  <th className="p-4 font-bold">Qty</th>
                  <th className="p-4 font-bold">Unit Price</th>
                  <th className="p-4 font-bold text-right">Amount</th>
                  <th className="p-4 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className="p-2">
                      <input
                        type="text"
                        className="w-full p-2 border rounded"
                        value={item.description}
                        onChange={(e) =>
                          updateItem(index, "description", e.target.value)
                        }
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        className="w-full p-2 border rounded"
                        value={item.qty}
                        onChange={(e) =>
                          updateItem(index, "qty", Number(e.target.value))
                        }
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        className="w-full p-2 border rounded"
                        value={item.price}
                        onChange={(e) =>
                          updateItem(index, "price", Number(e.target.value))
                        }
                      />
                    </td>
                    <td className="p-4 text-right font-mono font-medium">
                      ₱
                      {(item.qty * item.price).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => removeItem(index)}
                        className="text-red-400 hover:text-red-600 p-2"
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
                onClick={addItem}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center"
              >
                <Plus className="w-4 h-4 mr-1" /> Add Item
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="w-80 bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">VATable Sales:</span>
                <span className="font-mono">
                  ₱
                  {vatableSales.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">VAT (12%):</span>
                <span className="font-mono">
                  ₱
                  {vatAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>

              {withholdingTax > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span className="text-gray-500">
                    Withholding ({withholdingTaxRate}%):
                  </span>
                  <span className="font-mono">
                    - ₱
                    {withholdingTax.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              )}

              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>Total Amount:</span>
                <span className="font-mono">
                  ₱
                  {totalAmountDue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================= */}
        {/* VIEW 2: THE PRINT UI */}
        {/* ========================================= */}
        <style>{`
          @media print {
            @page {
              size: A5 portrait;
              margin: 0;
            }
            body {
              -webkit-print-color-adjust: exact;
              margin: 0;
              padding: 0;
            }
            body * { visibility: hidden; }
            #print-area, #print-area * { visibility: visible; }
            #print-area { 
              position: absolute !important; 
              left: 0 !important; 
              top: 0 !important; 
              width: 148mm !important; 
              height: 210mm !important; 
              margin: 0 !important; 
              padding: 0 !important; 
            }
          }
        `}</style>

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
              wordWrap: "break-word",
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
                {item.price.toLocaleString(undefined, {
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
              top: "135mm",
              left: "40mm",
              width: "25mm",
              textAlign: "right",
            }}
          >
            0.00
          </div>
          <div
            style={{
              position: "absolute",
              top: "141mm",
              left: "40mm",
              width: "25mm",
              textAlign: "right",
            }}
          >
            0.00
          </div>

          <div
            style={{
              position: "absolute",
              top: "123mm",
              left: "130mm",
              width: "18mm",
              textAlign: "right",
            }}
          >
            {totalSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div
            style={{
              position: "absolute",
              top: "129mm",
              left: "130mm",
              width: "18mm",
              textAlign: "right",
            }}
          >
            {vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div
            style={{
              position: "absolute",
              top: "135mm",
              left: "130mm",
              width: "18mm",
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
              top: "147mm",
              left: "130mm",
              width: "18mm",
              textAlign: "right",
            }}
          >
            {vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
          <div
            style={{
              position: "absolute",
              top: "153mm",
              left: "130mm",
              width: "18mm",
              textAlign: "right",
            }}
          >
            {withholdingTax > 0
              ? withholdingTax.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })
              : ""}
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
            {totalAmountDue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}
