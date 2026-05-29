"use client";

import { useState, useRef, useCallback } from "react";

interface CheckResult {
  username: string;
  status: "active" | "inactive" | "not_found" | "blocked" | "error";
  message: string;
  details?: string;
  fullName?: string;
  isVerified?: boolean;
  isPrivate?: boolean;
  hasProfilePic?: boolean;
  profilePicUrl?: string;
  followers?: number;
  following?: number;
  posts?: number;
  bio?: string;
}

interface StreamMessage {
  type: "total" | "result" | "done";
  count?: number;
  result?: CheckResult;
  progress?: { done: number; total: number };
}

function fmt(n?: number): string {
  if (n === undefined) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString();
}

/* ─────────────────────────────────────────────────────────────
   Profile card — Active accounts only
───────────────────────────────────────────────────────────── */
function ActiveCard({ result }: { result: CheckResult }) {
  // Use hasProfilePic as the single source of truth for whether there's a real pic
  const showPic = result.hasProfilePic === true && !!result.profilePicUrl;

  const hasStats =
    result.followers !== undefined ||
    result.following !== undefined ||
    result.posts !== undefined;

  return (
    <div className="card-row px-5 py-4 flex items-start gap-4">
      {/* Avatar */}
      <div className="relative shrink-0">
        {showPic ? (
          <img
            src={result.profilePicUrl}
            alt={result.username}
            className="w-14 h-14 rounded-full object-cover ring-2 ring-purple-500/40"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center ring-2 ring-slate-600/40">
            <svg className="w-7 h-7 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
          </div>
        )}
        {/* Pic indicator dot */}
        <div
          className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-slate-900 ${showPic ? "bg-emerald-500" : "bg-slate-500"}`}
          title={showPic ? "Has profile picture" : "No profile picture"}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <a
            href={`https://instagram.com/${result.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-white hover:text-purple-400 transition-colors"
          >
            @{result.username}
          </a>
          {result.isVerified && (
            <span title="Verified" className="text-blue-400">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
            </span>
          )}
          {result.isPrivate && (
            <span className="text-xs px-1.5 py-0.5 bg-slate-700 text-slate-300 rounded-md">🔒 Private</span>
          )}
        </div>

        {result.fullName && (
          <p className="text-sm text-slate-400 font-medium mt-0.5">{result.fullName}</p>
        )}

        {result.bio && (
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{result.bio}</p>
        )}

        {hasStats && (
          <div className="flex items-center gap-3 mt-2">
            {[
              { label: "Posts", val: fmt(result.posts) },
              { label: "Followers", val: fmt(result.followers) },
              { label: "Following", val: fmt(result.following) },
            ].map(({ label, val }, i) => (
              <span key={label} className="flex items-center gap-3">
                {i > 0 && <span className="w-px h-4 bg-slate-700" />}
                <span>
                  <span className="text-sm font-bold text-white">{val}</span>
                  <span className="text-xs text-slate-500 ml-1">{label}</span>
                </span>
              </span>
            ))}
            <span className="w-px h-4 bg-slate-700" />
            <span>
              <span className={`text-sm font-bold ${showPic ? "text-emerald-400" : "text-slate-500"}`}>
                {showPic ? "Yes" : "No"}
              </span>
              <span className="text-xs text-slate-500 ml-1">Pic</span>
            </span>
          </div>
        )}

        {!hasStats && result.details && (
          <p className="text-xs text-slate-500 mt-1">{result.details}</p>
        )}
      </div>

      {/* Badge */}
      <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        Active
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Not-Active row (blocked / not_found / error / inactive)
───────────────────────────────────────────────────────────── */
function InactiveRow({ result }: { result: CheckResult }) {
  const label =
    result.status === "blocked" ? "Unverified" :
    result.status === "error"   ? "Error" :
    "Not Found";

  return (
    <div className="card-row px-5 py-3 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <a
          href={`https://instagram.com/${result.username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-slate-300 hover:text-purple-400 transition-colors"
        >
          @{result.username}
        </a>
        {result.details && (
          <p className="text-xs text-slate-600 mt-0.5 truncate">{result.details}</p>
        )}
      </div>
      <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
        {label}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Progress bar
───────────────────────────────────────────────────────────── */
function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-slate-400">
        <span>Checking… <span className="text-white font-semibold">{done}</span> / {total}</span>
        <span className="font-semibold text-purple-400">{pct}%</span>
      </div>
      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   CSV parser — returns { usernames, rows }
   rows = full original lines (all columns) for later export
───────────────────────────────────────────────────────────── */
function parseCsv(text: string): { usernames: string[]; rows: string[] } {
  const rows = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const usernames = rows
    .map((l) => l.split(",")[0].trim().replace(/^@/, "").toLowerCase())
    .filter((u) => u.length > 0);
  return { usernames, rows };
}

/* ─────────────────────────────────────────────────────────────
   Main page
───────────────────────────────────────────────────────────── */
type Tab = "active" | "inactive";

export default function Home() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<CheckResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvUsernames, setCsvUsernames] = useState<string[]>([]);
  // Full original CSV rows kept so we can re-export with only active accounts
  const [csvRows, setCsvRows] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("active");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  /* CSV upload */
  const handleCsvUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { usernames, rows } = parseCsv(text);
      setCsvUsernames(usernames);
      setCsvRows(rows);
      setCsvFileName(file.name);
      setInput("");
    };
    reader.readAsText(file);
  }, []);

  const clearCsv = () => {
    setCsvUsernames([]);
    setCsvRows([]);
    setCsvFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* Download cleaned CSV — only rows whose username is active */
  const handleDownloadCleanedCsv = () => {
    const activeUsernames = new Set(
      results.filter((r) => r.status === "active").map((r) => r.username.toLowerCase())
    );
    const cleanedRows = csvRows.filter((row) => {
      const username = row.split(",")[0].trim().replace(/^@/, "").toLowerCase();
      return activeUsernames.has(username);
    });
    const content = cleanedRows.join("\r\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    // Suggest a filename like "coin mining - anik_active.csv"
    const baseName = csvFileName?.replace(/\.csv$/i, "") ?? "accounts";
    a.download = `${baseName}_active.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* Streaming check */
  const handleCheck = async () => {
    setError("");
    setResults([]);
    setProgress(null);
    setActiveTab("active");

    const usernames =
      csvUsernames.length > 0
        ? csvUsernames
        : input
            .trim()
            .split(/[\s,\n]+/)
            .map((u) => u.replace(/^@/, "").trim().toLowerCase())
            .filter((u) => u.length > 0);

    if (usernames.length === 0) {
      setError("Please enter at least one username or upload a CSV file.");
      return;
    }

    setLoading(true);
    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const response = await fetch("/api/check-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames }),
        signal: abort.signal,
      });

      if (!response.ok || !response.body) throw new Error("Failed to start stream");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const msg: StreamMessage = JSON.parse(trimmed);
            if (msg.type === "total" && msg.count !== undefined) {
              setProgress({ done: 0, total: msg.count });
            } else if (msg.type === "result" && msg.result) {
              setResults((prev) => [...prev, msg.result!]);
              if (msg.progress) setProgress(msg.progress);
            } else if (msg.type === "done") {
              setProgress((p) => (p ? { ...p, done: p.total } : p));
            }
          } catch { /* ignore */ }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setLoading(false);
  };

  const activeAccounts   = results.filter((r) => r.status === "active");
  const inactiveAccounts = results.filter((r) => r.status !== "active");
  // Show download button when: came from CSV, check is finished, and we have some results
  const showDownload = !loading && csvRows.length > 0 && results.length > 0 && activeAccounts.length > 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; }

        body {
          font-family: 'Inter', sans-serif;
          background: #090b11;
          color: #e2e8f0;
          min-height: 100vh;
        }

        .bg-page {
          background: radial-gradient(ellipse 80% 50% at 50% -10%, rgba(139,92,246,0.18) 0%, transparent 60%),
                      radial-gradient(ellipse 60% 40% at 80% 80%, rgba(236,72,153,0.10) 0%, transparent 60%),
                      #090b11;
        }

        .glass {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          backdrop-filter: blur(12px);
        }

        .glass-input {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: #e2e8f0;
          outline: none;
          transition: border-color .2s, box-shadow .2s;
        }
        .glass-input::placeholder { color: #475569; }
        .glass-input:focus {
          border-color: rgba(139,92,246,0.6);
          box-shadow: 0 0 0 3px rgba(139,92,246,0.1);
        }

        .btn-primary {
          background: linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%);
          color: white;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: opacity .2s, transform .1s, box-shadow .2s;
          box-shadow: 0 4px 24px rgba(139,92,246,0.3);
        }
        .btn-primary:hover:not(:disabled) { opacity: .92; transform: translateY(-1px); box-shadow: 0 8px 32px rgba(139,92,246,0.4); }
        .btn-primary:active:not(:disabled) { transform: translateY(0); }
        .btn-primary:disabled { opacity: .5; cursor: not-allowed; }

        .btn-stop {
          background: rgba(239,68,68,0.12);
          color: #f87171;
          border: 1px solid rgba(239,68,68,0.25);
          cursor: pointer;
          font-weight: 600;
          transition: background .2s;
        }
        .btn-stop:hover { background: rgba(239,68,68,0.22); }

        .upload-zone {
          border: 1.5px dashed rgba(139,92,246,0.3);
          background: rgba(139,92,246,0.04);
          transition: border-color .2s, background .2s;
          cursor: pointer;
        }
        .upload-zone:hover {
          border-color: rgba(139,92,246,0.6);
          background: rgba(139,92,246,0.08);
        }

        .csv-loaded {
          border: 1.5px solid rgba(139,92,246,0.4);
          background: rgba(139,92,246,0.08);
        }

        .tab-bar {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          padding: 4px;
          display: inline-flex;
          gap: 4px;
        }
        .tab {
          padding: 8px 24px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all .2s;
          border: none;
          background: transparent;
          color: #64748b;
          white-space: nowrap;
        }
        .tab.active-tab {
          background: rgba(139,92,246,0.2);
          color: #c4b5fd;
          border: 1px solid rgba(139,92,246,0.35);
          box-shadow: 0 2px 12px rgba(139,92,246,0.15);
        }
        .tab:not(.active-tab):hover { color: #94a3b8; background: rgba(255,255,255,0.04); }

        .results-panel {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          overflow: hidden;
        }
        .panel-header {
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .card-row {
          border-bottom: 1px solid rgba(255,255,255,0.04);
          transition: background .15s;
        }
        .card-row:last-child { border-bottom: none; }
        .card-row:hover { background: rgba(255,255,255,0.02); }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .card-row { animation: slideUp .25s ease-out both; }

        .stat-pill {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px;
          padding: 8px 16px;
          text-align: center;
          flex: 1;
        }

        .live-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #34d399;
          animation: pulse 1.4s infinite;
        }
        @keyframes pulse {
          0%,100% { opacity:1; transform:scale(1); }
          50% { opacity:.5; transform:scale(.75); }
        }

        .divider { display:flex; align-items:center; gap:12px; }
        .divider::before,.divider::after { content:''; flex:1; height:1px; background:rgba(255,255,255,0.07); }

        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
      `}</style>

      <div className="bg-page min-h-screen p-6 md:p-10">
        <div style={{ maxWidth: 720, margin: "0 auto" }}>

          {/* ── Header ── */}
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            {/* Instagram gradient icon */}
            <div style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 56, height: 56, borderRadius: 16, marginBottom: 16,
              background: "linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)",
              boxShadow: "0 8px 32px rgba(220,39,67,0.35)"
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: "#f1f5f9", margin: "0 0 8px", letterSpacing: "-0.5px" }}>
              Instagram Checker
            </h1>
            <p style={{ color: "#64748b", fontSize: 15, margin: 0 }}>
              Live streaming results · Unlimited CSV · Profile stats
            </p>
          </div>

          {/* ── Input Card ── */}
          <div className="glass" style={{ borderRadius: 20, padding: 24, marginBottom: 24 }}>

            {/* CSV upload */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                Upload CSV
              </div>

              {csvFileName ? (
                <div className="csv-loaded" style={{ borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(139,92,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#c4b5fd", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{csvFileName}</p>
                    <p style={{ fontSize: 12, color: "#7c3aed", margin: "2px 0 0" }}>{csvUsernames.length} usernames loaded</p>
                  </div>
                  <button onClick={clearCsv} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 4, borderRadius: 6, transition: "color .2s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#64748b")}>
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="upload-zone"
                  style={{ width: "100%", border: "none", padding: "20px 16px", borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <span style={{ fontSize: 14, color: "#94a3b8" }}>Drop or <span style={{ color: "#a78bfa", fontWeight: 600 }}>click to upload</span> a .csv file</span>
                  <span style={{ fontSize: 12, color: "#475569" }}>Format: username,password,… — first column used · No limit</span>
                </button>
              )}
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleCsvUpload} style={{ display: "none" }} />
            </div>

            {/* Divider */}
            {!csvFileName && (
              <div className="divider" style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 12, color: "#334155", fontWeight: 500 }}>OR</span>
              </div>
            )}

            {/* Textarea */}
            {!csvFileName && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                  Paste Usernames
                </div>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="username1 username2 username3&#10;Or one per line…"
                  className="glass-input"
                  style={{ width: "100%", height: 100, padding: "12px 14px", borderRadius: 12, resize: "none", fontSize: 13, fontFamily: "monospace" }}
                />
              </div>
            )}

            {error && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>{error}</p>}

            {/* Progress bar */}
            {loading && progress && (
              <div style={{ marginBottom: 16 }}>
                <ProgressBar done={progress.done} total={progress.total} />
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                id="check-btn"
                onClick={handleCheck}
                disabled={loading}
                className="btn-primary"
                style={{ flex: 1, padding: "13px 20px", borderRadius: 12, fontSize: 15 }}
              >
                {loading ? (
                  <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <svg style={{ animation: "spin 1s linear infinite", width: 18, height: 18 }} viewBox="0 0 24 24">
                      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity=".25"/>
                      <path fill="currentColor" opacity=".75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Checking…
                  </span>
                ) : csvFileName ? `Check all ${csvUsernames.length} accounts` : "Check Accounts"}
              </button>

              {loading && (
                <button onClick={handleStop} className="btn-stop" style={{ padding: "13px 18px", borderRadius: 12, fontSize: 14 }}>
                  Stop
                </button>
              )}
            </div>

            {/* CSV preview */}
            {csvUsernames.length > 0 && !loading && results.length === 0 && (
              <p style={{ fontSize: 12, color: "#475569", marginTop: 12 }}>
                First: <code style={{ color: "#94a3b8" }}>{csvUsernames[0]}</code>
                {csvUsernames.length > 1 && <> · Last: <code style={{ color: "#94a3b8" }}>{csvUsernames[csvUsernames.length - 1]}</code></>}
              </p>
            )}
          </div>

          {/* ── Summary stats ── */}
          {results.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Active", count: activeAccounts.length, color: "#34d399", bg: "rgba(52,211,153,0.1)", border: "rgba(52,211,153,0.2)" },
                { label: "Not Active", count: inactiveAccounts.length, color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.2)" },
              ].map(({ label, count, color, bg, border }) => (
                <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b" }}>{label}</span>
                  <span style={{ fontSize: 28, fontWeight: 800, color }}>{count}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Tab bar ── */}
          {results.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
              <div className="tab-bar">
                <button
                  className={`tab${activeTab === "active" ? " active-tab" : ""}`}
                  onClick={() => setActiveTab("active")}
                >
                  ✅ Active ({activeAccounts.length})
                </button>
                <button
                  className={`tab${activeTab === "inactive" ? " active-tab" : ""}`}
                  onClick={() => setActiveTab("inactive")}
                >
                  ❌ Not Active ({inactiveAccounts.length})
                </button>
              </div>


              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#34d399" }}>
                  <span className="live-dot" />
                  Live
                </span>
              ) : showDownload ? (
                <button
                  onClick={handleDownloadCleanedCsv}
                  title={`Download only the ${activeAccounts.length} active accounts as a new CSV`}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                    background: "linear-gradient(135deg,#059669,#10b981)",
                    color: "white", border: "none", cursor: "pointer",
                    boxShadow: "0 4px 16px rgba(16,185,129,0.3)",
                    transition: "opacity .2s, transform .1s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = ".88"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2" />
                  </svg>
                  Download Active CSV ({activeAccounts.length})
                </button>
              ) : null}
            </div>
          )}


          {/* ── Results panel ── */}
          {results.length > 0 && (
            <div className="results-panel">
              {activeTab === "active" ? (
                activeAccounts.length === 0 ? (
                  <div style={{ padding: "48px 24px", textAlign: "center", color: "#475569" }}>
                    {loading ? "Waiting for active accounts…" : "No active accounts found."}
                  </div>
                ) : (
                  <div>
                    {activeAccounts.map((r) => <ActiveCard key={r.username} result={r} />)}
                  </div>
                )
              ) : (
                inactiveAccounts.length === 0 ? (
                  <div style={{ padding: "48px 24px", textAlign: "center", color: "#475569" }}>
                    {loading ? "Checking…" : "All accounts appear to be active."}
                  </div>
                ) : (
                  <div>
                    {inactiveAccounts.map((r) => <InactiveRow key={r.username} result={r} />)}
                  </div>
                )
              )}
            </div>
          )}

          {/* ── Empty/waiting state ── */}
          {loading && results.length === 0 && (
            <div className="glass" style={{ borderRadius: 20, padding: "48px 24px", textAlign: "center" }}>
              <svg style={{ animation: "spin 1s linear infinite", width: 36, height: 36, color: "#7c3aed", margin: "0 auto 16px" }} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity=".25"/>
                <path fill="currentColor" opacity=".75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <p style={{ color: "#475569", fontSize: 14, margin: 0 }}>Waiting for first result…</p>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
