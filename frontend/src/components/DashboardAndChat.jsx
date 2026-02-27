import { useState, useEffect, useRef } from "react";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer, Cell, CartesianGrid,
} from "recharts";

// ─── API ─────────────────────────────────────────────────────────────────────

const BASE = "http://localhost:8000/api";

async function apiFetch(path, opts = {}) {
    const res = await fetch(BASE + path, {
        headers: { "Content-Type": "application/json" },
        ...opts,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

const API = {
    getTraces: (category) => {
        const qs = category && category !== "All" ? `?category=${encodeURIComponent(category)}` : "";
        return apiFetch(`/traces/${qs}`);
    },
    getAnalytics: () => apiFetch("/analytics/"),
    sendChat: (user_message) =>
        apiFetch("/chat/", {
            method: "POST",
            body: JSON.stringify({ user_message }),
        }),
};

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ["Billing", "Refund", "Account Access", "Cancellation", "General Inquiry"];

const CAT_CONFIG = {
    Billing:          { color: "#60a5fa", light: "#1e3a5f", dot: "#3b82f6" },
    Refund:           { color: "#fbbf24", light: "#3d2e0a", dot: "#f59e0b" },
    "Account Access": { color: "#34d399", light: "#0d3326", dot: "#10b981" },
    Cancellation:     { color: "#f87171", light: "#3b1111", dot: "#ef4444" },
    "General Inquiry":{ color: "#c084fc", light: "#2d1a47", dot: "#a855f7" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(ts) {
    return new Date(ts).toLocaleTimeString("en-US", {
        hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
}

function fmtDate(ts) {
    return new Date(ts).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
    });
}

function truncate(str, n = 60) {
    if (!str) return "";
    return str.length > n ? str.slice(0, n) + "…" : str;
}

// ─── Small reusable pieces ────────────────────────────────────────────────────

function Badge({ category }) {
    const cfg = CAT_CONFIG[category] || { color: "#9ca3af", light: "#1f2937" };
    return (
        <span style={{
            display: "inline-block",
            padding: "2px 9px",
            borderRadius: "99px",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.03em",
            color: cfg.color,
            background: cfg.light,
            border: `1px solid ${cfg.color}44`,
            whiteSpace: "nowrap",
        }}>
      {category}
    </span>
    );
}

function Spinner() {
    return (
        <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      {[0, 1, 2].map(i => (
          <span key={i} style={{
              width: 5, height: 5, borderRadius: "50%",
              background: "#60a5fa",
              animation: `blink 1s ${i * 0.2}s infinite ease-in-out`,
              display: "inline-block",
          }} />
      ))}
    </span>
    );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ title, value, sub, accentColor = "#60a5fa" }) {
    return (
        <div style={{
            background: "#111827",
            border: "1px solid #1f2937",
            borderRadius: 10,
            padding: "18px 20px",
            position: "relative",
        }}>
            <div style={{
                position: "absolute", top: 12, right: 14,
                width: 8, height: 8, borderRadius: "50%",
                background: accentColor,
                boxShadow: `0 0 6px ${accentColor}`,
            }} />
            <p style={{ margin: "0 0 8px", fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {title}
            </p>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: "#f9fafb", lineHeight: 1 }}>
                {value ?? "—"}
            </p>
            {sub !== undefined && (
                <p style={{ margin: "5px 0 0", fontSize: 12, color: "#4b5563" }}>{sub}</p>
            )}
        </div>
    );
}

// ─── Trace Detail Modal ───────────────────────────────────────────────────────

function TraceModal({ trace, onClose }) {
    // close on escape key
    useEffect(() => {
        const handler = (e) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [onClose]);

    if (!trace) return null;
    const cfg = CAT_CONFIG[trace.category] || { color: "#9ca3af" };

    return (
        <div
            onClick={onClose}
            style={{
                position: "fixed", inset: 0,
                background: "rgba(0,0,0,0.65)",
                backdropFilter: "blur(3px)",
                zIndex: 999,
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: 20,
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    background: "#0f172a",
                    border: "1px solid #1e293b",
                    borderRadius: 12,
                    width: "100%", maxWidth: 620,
                    maxHeight: "85vh", overflowY: "auto",
                    padding: 28,
                    position: "relative",
                    boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
                }}
            >
                {/* top accent line */}
                <div style={{
                    position: "absolute", top: 0, left: 0, right: 0, height: 3,
                    background: cfg.color,
                    borderRadius: "12px 12px 0 0",
                }} />

                {/* header row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <Badge category={trace.category} />
                        <span style={{ fontSize: 12, color: "#6b7280" }}>
              {fmtDate(trace.timestamp)} at {fmtTime(trace.timestamp)} · {trace.response_time_ms}ms
            </span>
                    </div>
                    <button onClick={onClose} style={{
                        background: "none", border: "none",
                        color: "#6b7280", fontSize: 18, cursor: "pointer",
                        padding: "4px 8px", borderRadius: 4,
                    }}>✕</button>
                </div>

                {/* user message */}
                <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                        User Message
                    </p>
                    <div style={{
                        background: "#1e293b",
                        border: "1px solid #334155",
                        borderRadius: 8, padding: "12px 16px",
                        fontSize: 14, color: "#e2e8f0", lineHeight: 1.6,
                    }}>
                        {trace.user_message}
                    </div>
                </div>

                {/* bot response */}
                <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                        Bot Response
                    </p>
                    <div style={{
                        background: "#1e293b",
                        border: "1px solid #334155",
                        borderRadius: 8, padding: "12px 16px",
                        fontSize: 14, color: "#cbd5e1", lineHeight: 1.6,
                    }}>
                        {trace.bot_response}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ onRefreshRequest, refreshSignal }) {
    const [analytics, setAnalytics] = useState(null);
    const [traces, setTraces]       = useState([]);
    const [filter, setFilter]       = useState("All");
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState(null);
    const [selectedTrace, setSelectedTrace] = useState(null);

    // fetch all data
    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [ana, trc] = await Promise.all([
                API.getAnalytics(),
                API.getTraces(),
            ]);
            setAnalytics(ana);
            setTraces(trc);
        } catch (err) {
            setError("Could not load data. Is the backend running?");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [refreshSignal]);

    // filter traces client-side for instant feedback
    const displayed = filter === "All" ? traces : traces.filter(t => t.category === filter);

    // bar chart data
    const chartData = CATEGORIES.map(cat => ({
        name: cat === "Account Access" ? "Acct Access" : cat === "General Inquiry" ? "General" : cat,
        fullName: cat,
        count: analytics?.category_breakdown?.[cat]?.count ?? 0,
        color: CAT_CONFIG[cat]?.color ?? "#9ca3af",
    }));

    if (loading) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "#4b5563", fontSize: 14 }}>
            Loading…
        </div>
    );

    if (error) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
            <div style={{ background: "#1a0a0a", border: "1px solid #7f1d1d", borderRadius: 8, padding: "16px 24px", color: "#fca5a5", fontSize: 14 }}>
                ⚠ {error}
            </div>
        </div>
    );

    return (
        <div>
            {/* top stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12, marginBottom: 20 }}>
                <StatCard
                    title="Total Traces"
                    value={analytics?.total_traces}
                    accentColor="#60a5fa"
                />
                <StatCard
                    title="Avg Response"
                    value={analytics?.average_response_time_ms ? `${analytics.average_response_time_ms}ms` : "—"}
                    accentColor="#34d399"
                />
                {CATEGORIES.map(cat => (
                    <StatCard
                        key={cat}
                        title={cat}
                        value={analytics?.category_breakdown?.[cat]?.count ?? 0}
                        sub={`${analytics?.category_breakdown?.[cat]?.percentage ?? 0}% of total`}
                        accentColor={CAT_CONFIG[cat]?.color}
                    />
                ))}
            </div>

            {/* chart + filter row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 12, marginBottom: 20, alignItems: "start" }}>

                {/* bar chart */}
                <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 10, padding: "18px 20px" }}>
                    <p style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                        Traces by Category
                    </p>
                    <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={chartData} barCategoryGap="35%">
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false}
                                   tick={{ fill: "#6b7280", fontSize: 11 }} />
                            <YAxis axisLine={false} tickLine={false} allowDecimals={false}
                                   tick={{ fill: "#6b7280", fontSize: 11 }} width={28} />
                            <Tooltip
                                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                                contentStyle={{
                                    background: "#1e293b", border: "1px solid #334155",
                                    borderRadius: 6, fontSize: 12, color: "#e2e8f0",
                                }}
                                formatter={(val, _n, props) => [val + " traces", props.payload.fullName]}
                            />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* filter panel */}
                <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 10, padding: "18px 20px" }}>
                    <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                        Filter by Category
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {["All", ...CATEGORIES].map(cat => {
                            const cfg = CAT_CONFIG[cat];
                            const active = filter === cat;
                            return (
                                <button
                                    key={cat}
                                    onClick={() => setFilter(cat)}
                                    style={{
                                        display: "flex", alignItems: "center", justifyContent: "space-between",
                                        padding: "8px 12px",
                                        background: active ? (cfg ? cfg.light : "#1e3a5f") : "transparent",
                                        border: active ? `1px solid ${cfg?.color ?? "#60a5fa"}44` : "1px solid transparent",
                                        borderRadius: 7,
                                        cursor: "pointer",
                                        color: active ? (cfg?.color ?? "#60a5fa") : "#6b7280",
                                        fontSize: 13, fontWeight: active ? 600 : 400,
                                        textAlign: "left",
                                        transition: "all 0.12s",
                                    }}
                                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {cfg && <span style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.color, display: "inline-block" }} />}
                      {cat}
                  </span>
                                    <span style={{ fontSize: 11, color: "#374151" }}>
                    {cat === "All"
                        ? traces.length
                        : traces.filter(t => t.category === cat).length}
                  </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* trace table */}
            <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 10, overflow: "hidden" }}>
                {/* table head */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "150px 1fr 1fr 160px 80px",
                    gap: 8,
                    padding: "10px 16px",
                    background: "#0f172a",
                    borderBottom: "1px solid #1f2937",
                }}>
                    {["Timestamp", "User Message", "Bot Response", "Category", "Latency"].map(h => (
                        <span key={h} style={{ fontSize: 10, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {h}
            </span>
                    ))}
                </div>

                {/* rows */}
                {displayed.length === 0 && (
                    <div style={{ padding: "40px 16px", textAlign: "center", color: "#374151", fontSize: 13 }}>
                        No traces for this category yet.
                    </div>
                )}

                {displayed.map((trace, idx) => (
                    <TraceRow
                        key={trace.id}
                        trace={trace}
                        isLast={idx === displayed.length - 1}
                        onClick={() => setSelectedTrace(trace)}
                    />
                ))}
            </div>

            {selectedTrace && (
                <TraceModal trace={selectedTrace} onClose={() => setSelectedTrace(null)} />
            )}
        </div>
    );
}

function TraceRow({ trace, isLast, onClick }) {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: "grid",
                gridTemplateColumns: "150px 1fr 1fr 160px 80px",
                gap: 8,
                padding: "11px 16px",
                borderBottom: isLast ? "none" : "1px solid #1a2332",
                cursor: "pointer",
                background: hovered ? "#1a2332" : "transparent",
                transition: "background 0.1s",
                alignItems: "center",
            }}
        >
            <div>
                <div style={{ fontSize: 12, color: "#9ca3af" }}>{fmtTime(trace.timestamp)}</div>
                <div style={{ fontSize: 10, color: "#4b5563", marginTop: 2 }}>{fmtDate(trace.timestamp)}</div>
            </div>
            <div style={{ fontSize: 13, color: "#d1d5db", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                 title={trace.user_message}>
                {trace.user_message}
            </div>
            <div style={{ fontSize: 13, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                 title={trace.bot_response}>
                {trace.bot_response}
            </div>
            <div><Badge category={trace.category} /></div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>{trace.response_time_ms}ms</div>
        </div>
    );
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

function Chat({ onTraceSaved }) {
    const [input, setInput]     = useState("");
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef(null);

    // auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    const send = async () => {
        const text = input.trim();
        if (!text || loading) return;

        setInput("");
        setMessages(prev => [...prev, { role: "user", text }]);
        setLoading(true);

        try {
            const data = await API.sendChat(text);
            setMessages(prev => [...prev, {
                role: "bot",
                text: data.bot_response,
                category: data.category,
                ms: data.response_time_ms,
            }]);
            onTraceSaved?.();
        } catch (err) {
            setMessages(prev => [...prev, { role: "error", text: "Something went wrong. Check the backend." }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };

    return (
        <div style={{
            maxWidth: 680, margin: "0 auto",
            height: "100%", display: "flex", flexDirection: "column",
        }}>
            <div style={{
                flex: 1, overflowY: "auto",
                display: "flex", flexDirection: "column",
                gap: 12, padding: "4px 0 16px",
            }}>
                {messages.length === 0 && (
                    <div style={{
                        margin: "60px auto 0",
                        textAlign: "center",
                        color: "#374151", fontSize: 14, lineHeight: 1.7,
                    }}>
                        <div style={{ fontSize: 32, marginBottom: 10 }}>💬</div>
                        <div style={{ fontWeight: 600, color: "#6b7280", marginBottom: 4 }}>Support Chat</div>
                        <div style={{ fontSize: 13 }}>Try: "I need a refund" or "I can't log in"</div>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div key={i} style={{
                        display: "flex",
                        justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                    }}>
                        {msg.role !== "user" && (
                            <div style={{
                                width: 30, height: 30, borderRadius: "50%",
                                background: msg.role === "error" ? "#7f1d1d" : "#1e3a5f",
                                border: `1px solid ${msg.role === "error" ? "#ef4444" : "#3b82f6"}44`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 14, flexShrink: 0, marginRight: 8, marginTop: 2,
                            }}>
                                {msg.role === "error" ? "!" : "🤖"}
                            </div>
                        )}
                        <div style={{ maxWidth: "72%" }}>
                            <div style={{
                                padding: "10px 14px",
                                borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "4px 16px 16px 16px",
                                background:
                                    msg.role === "user"  ? "#1e3a5f" :
                                        msg.role === "error" ? "#1a0a0a" : "#1e293b",
                                border: `1px solid ${
                                    msg.role === "user"  ? "#3b82f644" :
                                        msg.role === "error" ? "#7f1d1d"   : "#334155"
                                }`,
                                fontSize: 14, color: msg.role === "error" ? "#fca5a5" : "#e2e8f0",
                                lineHeight: 1.55,
                            }}>
                                {msg.text}
                            </div>
                            {msg.category && (
                                <div style={{ marginTop: 6, display: "flex", gap: 8, alignItems: "center", paddingLeft: 2 }}>
                                    <Badge category={msg.category} />
                                    <span style={{ fontSize: 11, color: "#4b5563" }}>{msg.ms}ms</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                            width: 30, height: 30, borderRadius: "50%",
                            background: "#1e3a5f", border: "1px solid #3b82f644",
                            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
                        }}>🤖</div>
                        <div style={{
                            padding: "11px 16px",
                            background: "#1e293b", border: "1px solid #334155",
                            borderRadius: "4px 16px 16px 16px",
                        }}>
                            <Spinner />
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* input bar */}
            <div style={{
                display: "flex", gap: 8,
                padding: "12px 0 0",
                borderTop: "1px solid #1f2937",
            }}>
        <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask something like 'Why was I charged twice?' … Enter to send"
            rows={2}
            style={{
                flex: 1,
                background: "#111827",
                border: "1px solid #1f2937",
                borderRadius: 8,
                padding: "10px 14px",
                color: "#e2e8f0",
                fontSize: 14,
                resize: "none",
                outline: "none",
                fontFamily: "inherit",
                lineHeight: 1.5,
                transition: "border-color 0.15s",
            }}
            onFocus={e => e.target.style.borderColor = "#3b82f6"}
            onBlur={e => e.target.style.borderColor = "#1f2937"}
        />
                <button
                    onClick={send}
                    disabled={loading || !input.trim()}
                    style={{
                        padding: "0 22px",
                        background: loading || !input.trim() ? "#1f2937" : "#3b82f6",
                        color:      loading || !input.trim() ? "#374151" : "#fff",
                        border: "none", borderRadius: 8,
                        fontSize: 14, fontWeight: 600,
                        cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                        transition: "background 0.15s",
                    }}
                >
                    Send
                </button>
            </div>
        </div>
    );
}

// ─── App Shell ────────────────────────────────────────────────────────────────

export default function App() {
    const [tab, setTab]             = useState("dashboard");
    const [refreshSignal, setRefresh] = useState(0);

    const triggerRefresh = () => setRefresh(n => n + 1);

    return (
        <>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; }

        body {
          background: #0a0f1a;
          color: #e2e8f0;
          font-family: 'DM Sans', system-ui, sans-serif;
          font-size: 14px;
          -webkit-font-smoothing: antialiased;
        }

        ::-webkit-scrollbar            { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track      { background: transparent; }
        ::-webkit-scrollbar-thumb      { background: #1f2937; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover{ background: #374151; }

        @keyframes blink {
          0%, 100% { opacity: 0.25; transform: scale(0.75); }
          50%       { opacity: 1;    transform: scale(1); }
        }
      `}</style>

            <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>

                {/* ── Navbar ─────────────────────────────────────────────────────── */}
                <header style={{
                    height: 54,
                    borderBottom: "1px solid #1f2937",
                    background: "#0a0f1a",
                    display: "flex", alignItems: "center",
                    padding: "0 24px",
                    flexShrink: 0,
                    gap: 8,
                }}>
                    {/* logo */}
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ marginRight: 4 }}>
                        <rect x="1" y="1" width="8" height="8" rx="2" fill="#3b82f6"/>
                        <rect x="11" y="1" width="8" height="8" rx="2" fill="#3b82f622" stroke="#3b82f6" strokeWidth="1"/>
                        <rect x="1"  y="11" width="8" height="8" rx="2" fill="#3b82f622" stroke="#3b82f6" strokeWidth="1"/>
                        <rect x="11" y="11" width="8" height="8" rx="2" fill="#3b82f6" opacity="0.5"/>
                    </svg>
                    <span style={{ fontWeight: 700, fontSize: 15, color: "#f9fafb", letterSpacing: "-0.01em" }}>
            SupportLens
          </span>

                    {/* spacer */}
                    <div style={{ flex: 1 }} />

                    {/* tabs */}
                    <nav style={{ display: "flex", gap: 2, background: "#111827", borderRadius: 8, padding: 3 }}>
                        {[
                            { id: "dashboard", label: "Dashboard" },
                            { id: "chat",      label: "Chat" },
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => { setTab(t.id); if (t.id === "dashboard") triggerRefresh(); }}
                                style={{
                                    padding: "5px 16px",
                                    borderRadius: 6,
                                    fontSize: 13, fontWeight: 500,
                                    cursor: "pointer",
                                    border: "none",
                                    background: tab === t.id ? "#1e293b" : "transparent",
                                    color: tab === t.id ? "#f9fafb" : "#6b7280",
                                    transition: "all 0.12s",
                                }}
                            >
                                {t.label}
                            </button>
                        ))}
                    </nav>

                    {/* refresh button (only on dashboard) */}
                    {tab === "dashboard" && (
                        <button
                            onClick={triggerRefresh}
                            style={{
                                marginLeft: 8,
                                padding: "5px 12px",
                                background: "transparent",
                                border: "1px solid #1f2937",
                                borderRadius: 7,
                                color: "#6b7280",
                                fontSize: 12,
                                cursor: "pointer",
                                display: "flex", alignItems: "center", gap: 5,
                                transition: "color 0.1s, border-color 0.1s",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.color="#d1d5db"; e.currentTarget.style.borderColor="#374151"; }}
                            onMouseLeave={e => { e.currentTarget.style.color="#6b7280"; e.currentTarget.style.borderColor="#1f2937"; }}
                        >
                            ↻ Refresh
                        </button>
                    )}
                </header>

                {/* ── Content ────────────────────────────────────────────────────── */}
                <main style={{ flex: 1, overflow: "hidden", padding: "20px 24px" }}>
                    {tab === "dashboard" ? (
                        <div style={{ height: "100%", overflowY: "auto", paddingBottom: 32 }}>
                            <Dashboard refreshSignal={refreshSignal} />
                        </div>
                    ) : (
                        <div style={{ height: "100%" }}>
                            <Chat onTraceSaved={triggerRefresh} />
                        </div>
                    )}
                </main>

            </div>
        </>
    );
}