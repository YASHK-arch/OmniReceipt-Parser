"use client";

import { useState, useRef } from "react";
import { Upload, X, Plus, AlertTriangle, Save, Loader2 } from "lucide-react";

type LineItem = {
  id: string; // for React key
  description: string;
  amount: number;
};

type ReceiptData = {
  merchant: string;
  date: string;
  totalAmount: number;
  lineItems: LineItem[];
};

export default function Home() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReceiptData | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setPreviewUrl(URL.createObjectURL(selected));
      await processImage(selected);
    }
  };

  const processImage = async (selectedFile: File) => {
    setLoading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      
      // Add unique IDs to line items for the form
      const itemsWithIds = (result.lineItems || []).map((item: Omit<LineItem, "id">) => ({
        ...item,
        id: Math.random().toString(36).substr(2, 9),
      }));

      setData({
        merchant: result.merchant || "",
        date: result.date || new Date().toISOString().split("T")[0],
        totalAmount: result.totalAmount || 0,
        lineItems: itemsWithIds,
      });
    } catch (err) {
      console.error(err);
      setData({
        merchant: "",
        date: new Date().toISOString().split("T")[0],
        totalAmount: 0,
        lineItems: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const sumOfLineItems = data?.lineItems.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0;
  // A small tolerance for floating point issues
  const mathMismatch = data ? Math.abs(sumOfLineItems - (data.totalAmount || 0)) > 0.01 : false;

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const res = await fetch("/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) throw new Error("Failed to save");

      // Reset
      setPreviewUrl(null);
      setData(null);
      alert("Receipt saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save receipt.");
    } finally {
      setSaving(false);
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        lineItems: prev.lineItems.map((item) =>
          item.id === id ? { ...item, [field]: value } : item
        ),
      };
    });
  };

  const removeLineItem = (id: string) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        lineItems: prev.lineItems.filter((item) => item.id !== id),
      };
    });
  };

  const addLineItem = () => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        lineItems: [
          ...prev.lineItems,
          { id: Math.random().toString(36).substr(2, 9), description: "", amount: 0 },
        ],
      };
    });
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">OmniReceipt Parser</h1>
          <p className="text-gray-500 mt-2">Upload a receipt and verify the extracted data.</p>
        </header>

        {!previewUrl ? (
          <div 
            className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center bg-white cursor-pointer hover:bg-gray-50 transition"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg text-gray-600 font-medium">Click or drag receipt to upload</p>
            <p className="text-sm text-gray-400 mt-1">Supports JPG, PNG</p>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
            />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left Pane: Image */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h2 className="font-semibold text-gray-700">Original Receipt</h2>
                <button 
                  onClick={() => { setPreviewUrl(null); setData(null); }}
                  className="p-1 hover:bg-gray-200 rounded text-gray-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 flex-1 overflow-auto bg-gray-100 flex items-start justify-center min-h-[500px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Receipt" className="max-w-full h-auto rounded shadow-sm" />
              </div>
            </div>

            {/* Right Pane: Form */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h2 className="font-semibold text-gray-700">Extracted Data</h2>
                {loading && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
              </div>
              
              <div className="p-6 flex-1 overflow-auto">
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <p>Parsing receipt with AI...</p>
                  </div>
                ) : data ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Merchant Name</label>
                        <input 
                          type="text" 
                          value={data.merchant} 
                          onChange={(e) => setData({ ...data, merchant: e.target.value })}
                          className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                        <input 
                          type="date" 
                          value={data.date} 
                          onChange={(e) => setData({ ...data, date: e.target.value })}
                          className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <label className="block text-sm font-medium text-gray-700">Line Items</label>
                        <button onClick={addLineItem} className="text-sm text-blue-600 hover:text-blue-700 flex items-center font-medium">
                          <Plus className="w-4 h-4 mr-1" /> Add Item
                        </button>
                      </div>
                      <div className="space-y-3">
                        {data.lineItems.map((item) => (
                          <div key={item.id} className="flex gap-2 items-start">
                            <input 
                              type="text" 
                              value={item.description}
                              onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                              placeholder="Item description"
                              className="flex-1 p-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                            />
                            <div className="relative w-32">
                              <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                              <input 
                                type="number" 
                                value={item.amount}
                                onChange={(e) => updateLineItem(item.id, "amount", parseFloat(e.target.value) || 0)}
                                className="w-full p-2 pl-7 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                              />
                            </div>
                            <button 
                              onClick={() => removeLineItem(item.id)}
                              className="p-2 text-gray-400 hover:text-red-500 transition-colors mt-0.5"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                        {data.lineItems.length === 0 && (
                          <div className="text-center p-4 border-2 border-dashed rounded-md text-gray-400 text-sm">
                            No items found. Add manually if needed.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border">
                        <span className="font-semibold text-gray-700">Total Amount</span>
                        <div className="flex items-center gap-4">
                          {mathMismatch && (
                            <div className="flex items-center text-amber-600 text-sm font-medium" title={`Sum of items (${sumOfLineItems.toFixed(2)}) does not match Total (${data.totalAmount})`}>
                              <AlertTriangle className="w-4 h-4 mr-1" />
                              Math mismatch
                            </div>
                          )}
                          <div className="relative w-32">
                            <span className="absolute left-3 top-2.5 text-gray-700 font-semibold">$</span>
                            <input 
                              type="number" 
                              value={data.totalAmount}
                              onChange={(e) => setData({ ...data, totalAmount: parseFloat(e.target.value) || 0 })}
                              className="w-full p-2 pl-7 border rounded-md font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {data && !loading && (
                <div className="p-4 border-t border-gray-200 bg-white">
                  <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg flex justify-center items-center transition disabled:opacity-70"
                  >
                    {saving ? (
                      <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Saving...</>
                    ) : (
                      <><Save className="w-5 h-5 mr-2" /> Save Receipt</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
