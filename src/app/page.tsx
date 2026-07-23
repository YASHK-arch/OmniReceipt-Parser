"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, X, Plus, AlertTriangle, Save, Loader2, Sparkles, Code, Moon, Search, FileText, Activity } from "lucide-react";
import LogViewer from "@/components/LogViewer";

type LineItem = {
  id: string; // for React key
  description: string;
  amount: number;
};

type ReceiptData = {
  merchant: string;
  date: string;
  totalAmount: number;
  currency: string;
  lineItems: LineItem[];
  confidenceScore?: number;
  imageQualityStatus?: string;
  analysisSummary?: string;
  missingFields?: string[];
};

type DBReceipt = {
  id: string;
  merchant: string;
  date: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
  lineItems: Omit<LineItem, 'id'>[];
};

const badTestCases = [
  { folder: "1. The receipt is damaged, i.e. part of the receipt is teared or wet", shortName: "Damaged Receipt", images: ["1.png", "2.png"] },
  { folder: "2. The receipt text is unclear, i.e. printing issues", shortName: "Unclear Text", images: ["1.png", "2.jpg"] },
  { folder: "3. The receipt is placed on backgrounds that could interfere with text extraction, like newspapers, magazine or other receipts", shortName: "Background Interference", images: ["1.png"] },
  { folder: "4. The camera is off focus making the picture visibly blurry", shortName: "Blurry Picture", images: ["1.jpeg", "2.png"] },
  { folder: "5. The camera is too far away from the receipt", shortName: "Camera Too Far", images: ["1.png"] },
  { folder: "6. The picture has more than 1 receipts in the frame", shortName: "Multiple Receipts", images: ["1.png"] },
  { folder: "7. The receipt picture was taken on an angle and placed on uneven surface", shortName: "Angled / Uneven Surface", images: ["1.png", "2.png"] },
  { folder: "8. Pixel resolution related distortion", shortName: "Resolution Distortion", images: ["1.webp", "2.png"] }
];

const goodTestCases = [
  { file: "Amazon_reciept_digital.png", shortName: "Amazon" },
  { file: "Blinkit digital reciept.png", shortName: "Blinkit" },
  { file: "good_quality_unkown_lang.jpg", shortName: "Unknown Lang" },
  { file: "higlighted_text_n_currency_not_specific.jpg", shortName: "Highlighted Text" },
  { file: "Well-Lit_clicked_restaurant_reciept.jpg", shortName: "Restaurant" }
];

export default function Home() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReceiptData | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showAnalysisLog, setShowAnalysisLog] = useState(false);
  const [hoveredTestImg, setHoveredTestImg] = useState<{url: string, x: number, y: number} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // History state
  const [history, setHistory] = useState<DBReceipt[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [selectedHistoryReceipt, setSelectedHistoryReceipt] = useState<DBReceipt | null>(null);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/receipts");
      if (res.ok) {
        const hData = await res.json();
        setHistory(hData);
      }
    } catch (e) {
      console.error("Failed to fetch history:", e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

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
      
      const itemsWithIds = (result.lineItems || []).map((item: Omit<LineItem, "id">) => ({
        ...item,
        id: Math.random().toString(36).substr(2, 9),
      }));

      if (result._backendError) {
        console.error("Backend LLM Error during parsing:", result._backendError);
      }

      setData({
        merchant: result.merchant || "",
        date: result.date || new Date().toISOString().split("T")[0],
        totalAmount: result.totalAmount || 0,
        currency: result.currency || "🪙",
        lineItems: itemsWithIds,
        confidenceScore: result.confidenceScore || 0,
        imageQualityStatus: result.imageQualityStatus || "Extremely Poor",
        analysisSummary: result.analysisSummary || "",
        missingFields: result.missingFields || [],
      });
      
      if (result.confidenceScore !== undefined && result.confidenceScore < 90) {
        setShowAnalysisLog(true);
      } else {
        setShowAnalysisLog(false);
      }
    } catch (err) {
      console.error(err);
      setData({
        merchant: "",
        date: new Date().toISOString().split("T")[0],
        totalAmount: 0,
        currency: "🪙",
        lineItems: [],
        confidenceScore: 0,
        imageQualityStatus: "Extremely Poor",
        analysisSummary: "Failed to process image due to a network or client error.",
        missingFields: ["merchant", "date", "lineItems", "totalAmount"],
      });
      setShowAnalysisLog(true);
    } finally {
      setLoading(false);
    }
  };

  const loadAndProcessTestCase = async (url: string, filename: string) => {
    setLoading(true);
    setPreviewUrl(url);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
      await processImage(file);
    } catch (err) {
      console.error("Failed to load test case image", err);
      showToast("Failed to load test case image", "error");
      setLoading(false);
    }
  };

  const sumOfLineItems = data?.lineItems.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0;
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

      setPreviewUrl(null);
      setData(null);
      showToast("Receipt saved successfully!", "success");
      fetchHistory(); // Refresh history list
    } catch (err) {
      console.error(err);
      showToast("Failed to save receipt.", "error");
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

  // Neo-brutalist style classes
  const brutalContainer = "border-[3px] border-black rounded-xl shadow-[8px_8px_0_0_#000] bg-[#e4d4ff]";
  const brutalBadge = "border-[2px] border-black rounded-md shadow-[2px_2px_0_0_#000] font-bold text-sm bg-[#cfaeff] px-3 py-1 hover:bg-[#b588ff] cursor-pointer transition-colors";

  return (
    <div className="h-screen bg-[#f3edff] flex flex-col font-sans selection:bg-black selection:text-white relative overflow-hidden">
      {/* Background Elements */}
      
      <LogViewer />
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 px-6 py-3 rounded-lg border-[3px] border-black shadow-[4px_4px_0_0_#000] z-50 font-bold transition-all ${toast.type === "success" ? "bg-[#a6f0c6]" : "bg-[#fca5a5]"}`}>
          {toast.message}
        </div>
      )}

      {/* History Detail Modal */}
      {selectedHistoryReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setSelectedHistoryReceipt(null)}
          ></div>
          <div className="relative w-full max-w-xl bg-white border border-zinc-300 rounded shadow-lg flex flex-col max-h-[90vh] font-mono text-zinc-800 text-sm">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-zinc-200 bg-zinc-50">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <span>📄</span> receipt_details.txt
              </h3>
              <button 
                onClick={() => setSelectedHistoryReceipt(null)}
                className="text-zinc-500 hover:text-black transition-colors"
              >
                ✕
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Meta Info */}
              <div className="grid grid-cols-2 gap-6 border-b border-zinc-200 pb-6">
                <div>
                  <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Merchant</div>
                  <div className="font-medium text-base">{selectedHistoryReceipt.merchant || "Unknown"}</div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Date</div>
                  <div className="font-medium text-base">{selectedHistoryReceipt.date}</div>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-widest mb-3 flex justify-between">
                  <span>Line Items</span>
                  <span>Amount</span>
                </div>
                <div className="space-y-2">
                  {selectedHistoryReceipt.lineItems.map((item, i) => (
                    <div key={i} className="flex justify-between items-start py-1 border-b border-dashed border-zinc-200 last:border-0">
                      <span className="flex-1 pr-4">{item.description}</span>
                      <span className="font-medium whitespace-nowrap">{selectedHistoryReceipt.currency || "🪙"}{item.amount.toFixed(2)}</span>
                    </div>
                  ))}
                  {selectedHistoryReceipt.lineItems.length === 0 && (
                    <div className="py-2 text-zinc-400 italic">No line items found.</div>
                  )}
                </div>
              </div>

              <div className="border-t-[2px] border-zinc-800 pt-4 flex justify-between items-center mt-6">
                <span className="font-bold uppercase tracking-widest">Total Amount</span>
                <span className="font-bold text-xl">{selectedHistoryReceipt.currency || "🪙"}{selectedHistoryReceipt.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logo */}
      <div className="absolute top-6 left-8 z-50 flex items-start gap-6">
        <div className="flex items-center font-black text-2xl tracking-tight">
          <span>Omni</span>
          <span className="text-[#9655ff]">Parser</span>
        </div>
        
        {data && (
          <div className="relative">
            <button 
              onClick={() => setShowAnalysisLog(!showAnalysisLog)}
              className="flex items-center gap-2 border-[2px] border-black rounded shadow-[2px_2px_0_0_#000] font-bold text-sm bg-white px-3 py-1 hover:bg-zinc-100 transition-colors"
            >
              <Activity className="w-4 h-4" /> 
              Analysis Log
              {data.confidenceScore !== undefined && (
                <span className={`ml-2 px-1.5 py-0.5 text-xs text-white border-[2px] border-black shadow-[1px_1px_0_0_#000] rounded ${
                  data.confidenceScore >= 90 ? 'bg-green-500' :
                  data.confidenceScore >= 70 ? 'bg-yellow-500' :
                  data.confidenceScore >= 40 ? 'bg-orange-500' : 'bg-red-500'
                }`}>
                  {data.confidenceScore}%
                </span>
              )}
            </button>

            {/* Analysis Log Slide-out */}
            {showAnalysisLog && (
              <div className="absolute top-full left-0 mt-3 w-80 bg-white border-[3px] border-black shadow-[4px_4px_0_0_#000] z-50 flex flex-col font-mono text-sm">
                <div className="p-3 border-b-[3px] border-black bg-[#cfaeff] font-bold uppercase tracking-wider flex justify-between items-center">
                  <span>Analysis Report</span>
                  <button onClick={() => setShowAnalysisLog(false)} className="hover:bg-black/10 p-1 rounded transition-colors"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Quality Status</div>
                    <div className="font-bold">{data.imageQualityStatus || "Unknown"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Summary</div>
                    <div className="text-sm leading-relaxed">{data.analysisSummary || "No summary provided."}</div>
                  </div>
                  {data.missingFields && data.missingFields.length > 0 && (
                    <div>
                      <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Missing Fields</div>
                      <div className="flex flex-wrap gap-1">
                        {data.missingFields.map(f => (
                          <span key={f} className="text-xs bg-[#ffcfcf] border-[2px] border-black shadow-[1px_1px_0_0_#000] font-bold px-1.5 py-0.5 rounded">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {data.confidenceScore !== undefined && data.confidenceScore < 90 && (
                    <div className="bg-[#fff1c7] border-[2px] border-black shadow-[2px_2px_0_0_#000] p-3 text-sm font-medium rounded-lg mt-2">
                      {data.confidenceScore < 40 
                        ? "We couldn't read the receipt because the image quality is too poor. Please upload a clearer photo with the entire receipt visible and in focus."
                        : data.confidenceScore < 70
                          ? "This image appears blurry or distorted. Some information may be inaccurate or incomplete. Please retake the photo using better lighting and keep the camera steady."
                          : "Some portions of your receipt are cropped or unclear. We extracted all visible information, but certain details could not be recovered. For the most accurate results, please upload a clearer image."
                      }
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Layout: Flex Container for Main Content and Sidebars */}
      <div className="flex-1 w-full max-w-[1920px] mx-auto flex flex-col xl:flex-row justify-center gap-8 pt-6 px-4 xl:px-8 pb-6 relative z-10 overflow-hidden">
        
        {/* Left Sidebar: Edge Cases */}
        <aside className="w-full xl:w-72 xl:flex-shrink-0 order-2 xl:order-1 h-full overflow-y-auto custom-scrollbar">
          <div className="border border-zinc-300 bg-white p-6 text-zinc-800 font-mono text-sm shadow-sm xl:mt-14">
            <h2 className="font-semibold text-lg mb-4 border-b border-zinc-200 pb-2">TestCases.txt</h2>
            <p className="mb-4 text-zinc-600">
              Try out the standard sample receipt cases in the upload area, or test the parser's limits with these edge case samples:
            </p>
            <div className="space-y-4 mt-2">
              {badTestCases.map((tc, idx) => (
                <div key={idx} className="flex flex-col gap-1.5">
                  <div className="text-zinc-700 font-bold text-xs" title={tc.folder}>- {tc.shortName}</div>
                  <div className="flex gap-2 pl-4">
                    {tc.images.map((img, imgIdx) => {
                      const url = `/testcases/low_quality_edge_testcases/${encodeURIComponent(tc.folder)}/${encodeURIComponent(img)}`;
                      return (
                        <button
                          key={imgIdx}
                          disabled={loading}
                          onClick={() => loadAndProcessTestCase(url, img)}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredTestImg({ url, x: rect.right + 10, y: rect.top - 20 });
                          }}
                          onMouseLeave={() => setHoveredTestImg(null)}
                          className="text-xs bg-zinc-100 border border-zinc-300 hover:bg-zinc-200 disabled:opacity-50 transition-colors px-2 py-1 rounded shadow-sm font-bold"
                        >
                          Img {imgIdx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Workspace Area */}
        <main className="flex-1 w-full flex flex-col items-center min-w-0 order-1 xl:order-2 h-full overflow-y-auto custom-scrollbar px-2">
          {/* Hero Section */}
          <div className="text-center mb-8 relative z-10 w-full mt-2">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter mb-6 leading-tight">
              Receipt to <br /> structured data
            </h1>
            <p className="text-gray-700 font-medium text-lg max-w-xl mx-auto">
              Turn any physical receipt into structured JSON data. <br/>
              Upload an image or take a picture to extract line items instantly.
            </p>
          </div>

          {!previewUrl ? (
            /* Upload State */
            <div className={`${brutalContainer} w-full max-w-3xl p-8 relative z-10`}>
              <div 
                className="w-full border-[3px] border-dashed border-black bg-white rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-[#f3edff] transition-all mb-8 shadow-[6px_6px_0_0_#000] active:translate-y-[2px] active:translate-x-[2px] active:shadow-[4px_4px_0_0_#000]"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="bg-[#cfaeff] p-4 rounded-full border-[3px] border-black mb-4 shadow-[4px_4px_0_0_#000]">
                  <Upload className="w-8 h-8 text-black" strokeWidth={2.5} />
                </div>
                <p className="text-xl font-black text-black mb-1">Click to upload receipt</p>
                <p className="text-sm font-bold text-gray-500">Supports JPG, PNG</p>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                />
              </div>

              <div className="mb-6">
                <p className="text-sm font-bold text-gray-800 mb-3">Try these example receipts:</p>
                <div className="flex flex-wrap gap-3">
                  {goodTestCases.map((tc, idx) => {
                    const url = `/testcases/good_testcases/${encodeURIComponent(tc.file)}`;
                    return (
                      <button 
                        key={idx} 
                        disabled={loading}
                        onClick={() => loadAndProcessTestCase(url, tc.file)}
                        title={tc.file}
                        className={`${brutalBadge} disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {tc.shortName}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-8 border-[3px] border-black rounded-lg p-4 bg-[#f3edff] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-black text-white font-black rounded-md flex items-center justify-center">
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold tracking-widest text-gray-600 uppercase mb-0.5">OPEN SOURCE</div>
                    <p className="text-sm font-bold"><span className="text-black">YASHK-arch/OmniReceipt-Parser</span> <span className="text-gray-600 font-medium">/ Star the repository to show support.</span></p>
                  </div>
                </div>
                <a href="https://github.com/YASHK-arch/OmniReceipt-Parser.git" target="_blank" rel="noopener noreferrer" className="text-sm font-bold flex items-center gap-1 hover:underline">View Repo ↗</a>
              </div>
            </div>
          ) : (
            /* Result State */
            <div className="w-full relative z-10">
              <button 
                onClick={() => { setPreviewUrl(null); setData(null); }}
                className="border-[3px] border-black rounded-lg hover:bg-gray-100 bg-white px-4 py-2 mb-6 flex items-center gap-2 text-sm font-bold shadow-[4px_4px_0_0_#000]"
              >
                <X className="w-4 h-4" /> Start Over
              </button>
              
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Left Pane: Image */}
                <div className="border-[4px] border-black bg-[#f8f6fc] rounded-xl flex flex-col overflow-hidden shadow-[8px_8px_0_0_#000]">
                  <div className="p-4 border-b-[4px] border-black bg-[#cba8ff] flex justify-between items-center">
                    <h2 className="font-black text-lg flex items-center gap-2"><FileText className="w-5 h-5"/> Original Receipt</h2>
                  </div>
                  <div className="p-6 flex-1 bg-[#f8f6fc] flex items-start justify-center min-h-[500px] overflow-auto">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt="Receipt" className="max-w-full h-auto border-[4px] border-black bg-white p-2 shadow-[6px_6px_0_0_#000]" />
                  </div>
                </div>

                {/* Right Pane: Form (Terminal Style) */}
                <div className="border-[4px] border-black bg-zinc-950 rounded-xl flex flex-col overflow-hidden shadow-[8px_8px_0_0_#000] font-mono text-green-400">
                  <div className="p-4 border-b border-zinc-800 bg-zinc-900 flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      </div>
                      <span className="ml-2 text-zinc-400 uppercase tracking-widest text-xs font-bold">Extracted Data</span>
                    </div>
                    {loading && <Loader2 className="w-4 h-4 animate-spin text-green-400" />}
                  </div>
                  
                  <div className="p-6 flex-1 overflow-auto">
                    {loading ? (
                      <div className="flex flex-col items-center justify-center h-full space-y-4">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <p className="text-sm">root@omni-parser:~$ extracting_data...</p>
                      </div>
                    ) : data ? (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                          <div>
                            <label className="block text-xs uppercase tracking-wider mb-2 text-zinc-500">Merchant Name</label>
                            <input 
                              type="text" 
                              value={data.merchant} 
                              onChange={(e) => setData({ ...data, merchant: e.target.value })}
                              className="w-full p-2 bg-zinc-900 border border-zinc-800 text-green-400 outline-none focus:border-green-500 transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-xs uppercase tracking-wider mb-2 text-zinc-500">Date</label>
                            <input 
                              type="date" 
                              value={data.date} 
                              onChange={(e) => setData({ ...data, date: e.target.value })}
                              className="w-full p-2 bg-zinc-900 border border-zinc-800 text-green-400 outline-none focus:border-green-500 transition-colors"
                              style={{ colorScheme: 'dark' }}
                            />
                          </div>
                        </div>

                        <div className="border border-zinc-800 p-4">
                          <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-2">
                            <label className="text-xs uppercase tracking-wider text-zinc-500">Line Items [Array]</label>
                            <button onClick={addLineItem} className="text-xs text-green-500 hover:text-green-300 hover:bg-green-500/10 active:bg-green-500/20 rounded px-2 py-1 transition-all">
                              [+ add_item]
                            </button>
                          </div>
                          <div className="space-y-3 pt-2 overflow-x-auto pb-2">
                            <div className="min-w-[400px]">
                              {data.lineItems.map((item, idx) => (
                                <div key={item.id} className="flex gap-3 items-center group mb-3 last:mb-0">
                                  <span className="text-zinc-600 text-xs w-4 shrink-0">{idx}:</span>
                                  <input 
                                    type="text" 
                                    value={item.description}
                                    onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                                    placeholder="description"
                                    className="flex-1 min-w-[120px] p-2 bg-zinc-900 border border-zinc-800 text-green-400 outline-none focus:border-green-500 transition-colors text-sm"
                                  />
                                  <div className="relative w-32 flex-shrink-0 flex items-center">
                                    <span className="absolute left-3 font-bold text-zinc-500">{data.currency || "🪙"}</span>
                                    <input 
                                      type="number" 
                                      value={item.amount}
                                      onChange={(e) => updateLineItem(item.id, "amount", parseFloat(e.target.value) || 0)}
                                      className="w-full p-2 pl-8 bg-zinc-900 border border-zinc-800 text-green-400 outline-none focus:border-green-500 transition-colors text-sm"
                                    />
                                  </div>
                                  <button 
                                    onClick={() => removeLineItem(item.id)}
                                    className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 active:bg-red-500/20 rounded px-2 py-1 transition-all font-bold shrink-0"
                                  >
                                    [x]
                                  </button>
                                </div>
                              ))}
                              {data.lineItems.length === 0 && (
                                <div className="text-center p-4 text-xs text-zinc-600 italic">
                                  // no items found
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="border border-zinc-800 p-4 flex justify-between items-center bg-zinc-900/50">
                          <span className="text-xs uppercase tracking-wider text-zinc-500">Total Amount</span>
                          <div className="flex items-center gap-4">
                            {mathMismatch && (
                              <div className="text-red-500 text-xs flex items-center gap-1 border border-red-500/30 bg-red-500/10 px-2 py-1" title={`Sum of items (${sumOfLineItems.toFixed(2)}) does not match Total (${data.totalAmount})`}>
                                <AlertTriangle className="w-3 h-3" />
                                WARN: sum_mismatch
                              </div>
                            )}
                            <div className="relative w-32 flex-shrink-0 flex items-center">
                              <span className="absolute left-3 text-zinc-500">{data.currency || "🪙"}</span>
                              <input 
                                type="number" 
                                value={data.totalAmount}
                                onChange={(e) => setData({ ...data, totalAmount: parseFloat(e.target.value) || 0 })}
                                className="w-full p-2 pl-7 bg-zinc-900 border border-zinc-800 text-green-400 outline-none focus:border-green-500 transition-colors font-bold text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {data && !loading && (
                    <div className="p-4 border-t border-zinc-800 bg-zinc-900">
                      <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full bg-green-500 hover:bg-green-400 text-black text-sm py-3 font-bold uppercase tracking-widest flex justify-center items-center disabled:opacity-50 transition-colors shadow-none"
                      >
                        {saving ? (
                          <><Loader2 className="w-4 h-4 animate-spin mr-2" /> executing...</>
                        ) : (
                          <><Save className="w-4 h-4 mr-2" /> save_record</>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* History Sidebar */}
        <aside className="w-full xl:w-80 xl:flex-shrink-0 border border-zinc-300 bg-white flex flex-col h-full order-3 font-mono text-sm text-zinc-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-zinc-200">
            <h2 className="font-semibold text-lg">History.txt</h2>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1">
            {history.length === 0 ? (
              <p className="text-zinc-500 italic">No history available.</p>
            ) : (
              history.map(h => (
                <div 
                  key={h.id} 
                  onClick={() => setSelectedHistoryReceipt(h)}
                  className="cursor-pointer py-2.5 px-2 border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors flex flex-col gap-1 rounded"
                >
                  <div className="font-medium truncate">{h.merchant || "Unknown Merchant"}</div>
                  <div className="flex justify-between items-center text-zinc-500">
                    <span>{h.date}</span>
                    <span>{h.currency || "🪙"}{h.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {hoveredTestImg && (
          <div 
            className="fixed z-[100] border-[2px] border-black bg-white shadow-[4px_4px_0_0_#000] p-1 pointer-events-none rounded"
            style={{ top: hoveredTestImg.y, left: hoveredTestImg.x, width: '250px' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hoveredTestImg.url} alt="Preview" className="w-full h-auto object-contain" />
          </div>
        )}

      </div>
    </div>
  );
}
