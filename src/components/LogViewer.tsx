"use client";

import { useState, useEffect, useRef } from "react";
import { Terminal, X, AlertCircle, Info, AlertTriangle } from "lucide-react";

export type LogEntry = {
  id: string;
  type: "log" | "warn" | "error";
  message: string;
  timestamp: Date;
};

export default function LogViewer() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewError, setHasNewError] = useState(false);
  const endOfLogsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    const addLog = (type: "log" | "warn" | "error", args: any[]) => {
      // Don't intercept next.js internal spam if needed, but we'll take all for now
      const message = args.map(arg => {
        if (arg instanceof Error) return arg.stack || arg.message;
        return typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg);
      }).join(" ");
      
      setLogs(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), type, message, timestamp: new Date() }]);
      if (type === "error") {
        setHasNewError(true);
      }
    };

    console.log = (...args) => { addLog("log", args); originalLog(...args); };
    console.warn = (...args) => { addLog("warn", args); originalWarn(...args); };
    console.error = (...args) => { addLog("error", args); originalError(...args); };

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      endOfLogsRef.current?.scrollIntoView({ behavior: "smooth" });
      setHasNewError(false);
    }
  }, [logs, isOpen]);

  const errorCount = logs.filter(l => l.type === "error").length;

  return (
    <>
      <button 
        onClick={() => { setIsOpen(true); setHasNewError(false); }}
        className={`fixed bottom-4 right-4 md:top-4 md:bottom-auto p-3 rounded-full shadow-lg z-40 transition-colors flex items-center justify-center ${hasNewError ? 'bg-red-500 hover:bg-red-600 text-white animate-bounce' : 'bg-gray-800 hover:bg-gray-700 text-gray-200'}`}
        title="View Application Logs"
      >
        <Terminal className="w-5 h-5" />
        {errorCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 border-2 border-white text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {errorCount > 99 ? '99+' : errorCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 w-full max-w-3xl h-[80vh] rounded-xl shadow-2xl flex flex-col border border-gray-700 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-800 bg-gray-900 text-gray-200">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5" />
                <h2 className="font-semibold text-lg">Live Application Logs</h2>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => setLogs([])} className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-400">Clear</button>
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-3 font-mono text-sm">
              {logs.length === 0 ? (
                <div className="text-gray-500 text-center h-full flex items-center justify-center">No logs recorded yet.</div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className={`p-3 rounded border flex gap-3 items-start ${log.type === "error" ? "bg-red-950/30 border-red-900 text-red-400" : log.type === "warn" ? "bg-amber-950/30 border-amber-900 text-amber-400" : "bg-gray-800/30 border-gray-800 text-gray-300"}`}>
                    <div className="mt-0.5">
                      {log.type === "error" ? <AlertCircle className="w-4 h-4" /> : log.type === "warn" ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 whitespace-pre-wrap break-words leading-relaxed">
                      <span className="text-gray-600 text-xs mr-2 select-none">[{log.timestamp.toLocaleTimeString()}]</span>
                      {log.message}
                    </div>
                  </div>
                ))
              )}
              <div ref={endOfLogsRef} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
