import { useState, useMemo, useEffect, useRef } from "react";

const LOAN_TYPES = [
  { id: "core", label: "Core / Business", icon: "ti-building-store", color: "#185FA5", bg: "#E6F1FB", target: 5 },
  { id: "topup", label: "GL Top-Up", icon: "ti-trending-up", color: "#0F6E56", bg: "#E1F5EE", target: 4 },
  { id: "loyalty", label: "Loyalty", icon: "ti-heart", color: "#993556", bg: "#FBEAF0", target: 3 },
  { id: "emergency", label: "Emergency", icon: "ti-alert-circle", color: "#854F0B", bg: "#FAEEDA", target: 2 },
  { id: "smartphone", label: "Smartphone", icon: "ti-device-mobile", color: "#534AB7", bg: "#EEEDFE", target: 2 },
];

const CUSTOMER_TYPES = ["Existing", "New (NCA)"];

const CRO_SLABS = [
  { min: 14, max: 18, payPerLakh: 1800 },
  { min: 18, max: 21, payPerLakh: 100 },
  { min: 21, max: 25, payPerLakh: 125 },
  { min: 25, max: 30, payPerLakh: 150 },
  { min: 30, max: 35, payPerLakh: 200 },
  { min: 35, max: 999, payPerLakh: 300 },
];

const LO_SLABS = [
  { min: 22, max: 24, payPerLakh: 3500 },
  { min: 24, max: 28, payPerLakh: 200 },
  { min: 28, max: 33, payPerLakh: 250 },
  { min: 33, max: 38, payPerLakh: 300 },
  { min: 38, max: 999, payPerLakh: 400 },
];

function getQuarter(dateStr) {
  if (!dateStr) return null;
  const m = new Date(dateStr).getMonth() + 1;
  if (m >= 4 && m <= 6) return "Q1 (Apr–Jun)";
  if (m >= 7 && m <= 9) return "Q2 (Jul–Sep)";
  if (m >= 10 && m <= 12) return "Q3 (Oct–Dec)";
  return "Q4 (Jan–Mar)";
}

function fmt(n) { return Number(n).toLocaleString("en-IN"); }

function calcIncentive(totalAmtRs, role = "CRO") {
  const slabs = role === "CRO" ? CRO_SLABS : LO_SLABS;
  const lakhs = totalAmtRs / 100000;
  const slab = slabs.find(s => lakhs >= s.min && lakhs < s.max);
  if (!slab) return { incentive: 0, slab: null, lakhs };
  return { incentive: Math.round(lakhs * slab.payPerLakh), slab, lakhs };
}

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const start = prev.current, end = value, dur = 600, startTime = performance.now();
    const step = (now) => {
      const p = Math.min((now - startTime) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + (end - start) * ease));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    prev.current = value;
  }, [value]);
  return <span>{fmt(display)}</span>;
}

function ProgressBar({ value, max, color, bg }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ height: 6, background: bg, borderRadius: 99, overflow: "hidden", marginTop: 6 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 0.6s cubic-bezier(0.34,1.56,0.64,1)" }} />
    </div>
  );
}

const S = {
  card: { background: "#fff", border: "0.5px solid #e5e5e5", borderRadius: 16, padding: "1rem 1.25rem", marginBottom: 12 },
  metric: { background: "#f5f5f5", borderRadius: 12, padding: "12px 14px", flex: 1, minWidth: 0 },
  label: { margin: 0, fontSize: 11, color: "#888", letterSpacing: "0.04em", textTransform: "uppercase" },
  value: { margin: "4px 0 0", fontSize: 22, fontWeight: 500, color: "#111" },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "0.5px solid #eee" },
};

export default function App() {
  const [view, setView] = useState("dashboard");
  const [role, setRole] = useState("CRO");
  const [entries, setEntries] = useState(() => {
    try { const s = localStorage.getItem("cro_entries"); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [form, setForm] = useState({ date: new Date().toISOString().split("T")[0], customerName: "", customerType: "Existing", loanType: "core", amount: "" });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [toast, setToast] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    try { localStorage.setItem("cro_entries", JSON.stringify(entries)); } catch {}
  }, [entries]);

  function showToast(msg, ok = true) { setToast({ msg, ok }); setTimeout(() => setToast(""), 2200); }
  function handleAdd() {
    if (!form.customerName.trim() || !form.amount || !form.date) { showToast("सर्व माहिती भरा!", false); return; }
    const amt = parseFloat(form.amount);
    if (isNaN(amt) || amt <= 0) { showToast("Valid amount टाका", false); return; }
    setEntries(prev => [...prev, { ...form, amount: amt, id: Date.now() }]);
    setForm(f => ({ ...f, customerName: "", amount: "" }));
    showToast("Entry यशस्वीरित्या जोडली!");
  }
  function handleDelete(id) { setEntries(prev => prev.filter(e => e.id !== id)); setDeleteId(null); showToast("Entry delete केली"); }
  function startEdit(e) { setEditId(e.id); setEditForm({ ...e }); }
  function saveEdit() {
    const amt = parseFloat(editForm.amount);
    if (!editForm.customerName.trim() || isNaN(amt) || amt <= 0) { showToast("Valid माहिती टाका", false); return; }
    setEntries(prev => prev.map(e => e.id === editId ? { ...editForm, amount: amt } : e));
    setEditId(null); showToast("Entry update केली!");
  }

  function exportCSV() {
    if (!entries.length) { showToast("Export करायला entries नाहीत!", false); return; }
    const headers = ["Date", "Customer Name", "Customer Type", "Loan Type", "Amount (₹)"];
    const rows = entries.map(e => [e.date, e.customerName, e.customerType, LOAN_TYPES.find(l => l.id === e.loanType)?.label || e.loanType, e.amount]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `CRO_Report_${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    showToast("CSV Download झाला!");
  }

  function exportPDF() {
    if (!entries.length) { showToast("Export करायला entries नाहीत!", false); return; }
    const totalAmt = entries.reduce((s, e) => s + e.amount, 0);
    const ncaCount = entries.filter(e => e.customerType === "New (NCA)").length;
    const byType = {};
    LOAN_TYPES.forEach(lt => { const g = entries.filter(e => e.loanType === lt.id); byType[lt.id] = { count: g.length, amount: g.reduce((s, e) => s + e.amount, 0), label: lt.label }; });
    const rows = entries.map(e => `<tr><td>${e.date}</td><td>${e.customerName}</td><td>${e.customerType}</td><td>${LOAN_TYPES.find(l => l.id === e.loanType)?.label || e.loanType}</td><td style="text-align:right">₹${fmt(e.amount)}</td></tr>`).join("");
    const summaryRows = Object.values(byType).filter(d => d.count > 0).map(d => `<tr><td>${d.label}</td><td style="text-align:center">${d.count}</td><td style="text-align:right">₹${fmt(d.amount)}</td></tr>`).join("");
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>CRO Report</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111}h1{font-size:20px}table{width:100%;border-collapse:collapse;font-size:12px;margin-top:16px}th{background:#185FA5;color:#fff;padding:8px}td{padding:7px 10px;border-bottom:1px solid #eee}</style></head><body><h1>CRO Loan Report</h1><p>सिद्धू भिलारे · Ujjivan Small Finance Bank</p><p>Generated: ${new Date().toLocaleDateString("en-IN")}</p><h2>Summary</h2><p>Total Loans: ${entries.length} | NCA: ${ncaCount} | Total: ₹${fmt(totalAmt)}</p><h2>Loan Type Summary</h2><table><thead><tr><th>Loan Type</th><th>Count</th><th>Amount</th></tr></thead><tbody>${summaryRows}</tbody></table><h2>All Entries</h2><table><thead><tr><th>Date</th><th>Customer</th><th>Type</th><th>Loan</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank");
    if (w) setTimeout(() => { w.print(); URL.revokeObjectURL(url); }, 800);
    showToast("PDF Print window उघडला!");
  }

  const totalDisbursed = entries.reduce((s, e) => s + e.amount, 0);
  const totalNCA = entries.filter(e => e.customerType === "New (NCA)").length;
  const todayEntries = entries.filter(e => e.date === new Date().toISOString().split("T")[0]);
  const todayAmount = todayEntries.reduce((s, e) => s + e.amount, 0);
  const ncaRate = entries.length > 0 ? Math.round((totalNCA / entries.length) * 100) : 0;

  const bestDay = useMemo(() => {
    const byDay = {};
    entries.forEach(e => { if (!byDay[e.date]) byDay[e.date] = { count: 0, amount: 0 }; byDay[e.date].count++; byDay[e.date].amount += e.amount; });
    const days = Object.entries(byDay);
    if (!days.length) return null;
    return days.reduce((a, b) => b[1].amount > a[1].amount ? b : a);
  }, [entries]);

  const streak = useMemo(() => {
    const days = [...new Set(entries.map(e => e.date))].sort().reverse();
    if (!days.length) return 0;
    let count = 0, cur = new Date();
    for (const d of days) {
      const diff = Math.round((cur - new Date(d)) / 86400000);
      if (diff > 1) break;
      count++; cur = new Date(d);
    }
    return count;
  }, [entries]);

  const dailySummary = useMemo(() => {
    const day = entries.filter(e => e.date === selectedDate);
    const total = day.reduce((s, e) => s + e.amount, 0);
    const nca = day.filter(e => e.customerType === "New (NCA)");
    const byType = {};
    LOAN_TYPES.forEach(lt => { const g = day.filter(e => e.loanType === lt.id); byType[lt.id] = { count: g.length, amount: g.reduce((s, e) => s + e.amount, 0) }; });
    return { day, total, nca, byType };
  }, [entries, selectedDate]);

  const quarterSummary = useMemo(() => {
    const q = {};
    entries.forEach(e => {
      const k = getQuarter(e.date); if (!k) return;
      if (!q[k]) q[k] = { entries: [], total: 0, nca: 0 };
      q[k].entries.push(e); q[k].total += e.amount;
      if (e.customerType === "New (NCA)") q[k].nca++;
    });
    return q;
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return [...entries].reverse().filter(e => {
      const matchSearch = e.customerName.toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === "all" || e.loanType === filterType;
      return matchSearch && matchType;
    });
  }, [entries, search, filterType]);

  const tabs = [
    { id: "dashboard", icon: "ti-layout-dashboard", label: "Dashboard" },
    { id: "add", icon: "ti-plus", label: "Entry" },
    { id: "daily", icon: "ti-calendar", label: "Daily" },
    { id: "quarterly", icon: "ti-chart-bar", label: "Quarterly" },
    { id: "incentive", icon: "ti-coin", label: "Incentive" },
  ];

  const DAILY_TARGET = 10;
  const AMOUNT_TARGET = 500000;

  return (
    <div style={{ padding: "1rem 0.75rem", maxWidth: 480, margin: "0 auto", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: "#f9f9f9", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ background: "#fff", borderRadius: 16, padding: "1rem 1.25rem", marginBottom: 14, border: "0.5px solid #e5e5e5" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#E6F1FB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <i className="ti ti-user-check" style={{ fontSize: 22, color: "#185FA5" }}></i>
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 500, fontSize: 15, color: "#111" }}>सिद्धू भिलारे</p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#888" }}>CRO · Ujjivan Small Finance Bank</p>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            {streak > 0 && <div style={{ background: "#FAEEDA", color: "#854F0B", fontSize: 11, fontWeight: 500, padding: "3px 8px", borderRadius: 99, marginBottom: 4 }}>
              <i className="ti ti-flame" style={{ fontSize: 12, marginRight: 3 }}></i>{streak} day streak
            </div>}
            <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#111" }}>₹<AnimatedNumber value={totalDisbursed} /></p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setView(t.id)} style={{ flex: 1, padding: "8px 2px", fontSize: 11, border: "0.5px solid", borderColor: view === t.id ? "#185FA5" : "#e5e5e5", borderRadius: 12, background: view === t.id ? "#E6F1FB" : "#fff", color: view === t.id ? "#185FA5" : "#888", fontWeight: view === t.id ? 500 : 400, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <i className={`ti ${t.icon}`} style={{ fontSize: 17 }}></i>{t.label}
          </button>
        ))}
      </div>

      {/* DASHBOARD */}
      {view === "dashboard" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <div style={{ ...S.metric, textAlign: "center" }}>
              <p style={S.label}>Today</p>
              <p style={S.value}>{todayEntries.length}</p>
              <ProgressBar value={todayEntries.length} max={DAILY_TARGET} color="#185FA5" bg="#E6F1FB" />
            </div>
            <div style={{ ...S.metric, textAlign: "center" }}>
              <p style={S.label}>NCA Rate</p>
              <p style={{ ...S.value, color: "#185FA5" }}>{ncaRate}%</p>
              <ProgressBar value={ncaRate} max={100} color="#185FA5" bg="#E6F1FB" />
            </div>
          </div>
          <div style={{ ...S.metric, display: "block", marginBottom: 10, borderRadius: 16 }}>
            <p style={S.label}>Today's Disbursement</p>
            <p style={{ ...S.value, fontSize: 24 }}>₹<AnimatedNumber value={todayAmount} /></p>
            <ProgressBar value={todayAmount} max={AMOUNT_TARGET} color="#0F6E56" bg="#E1F5EE" />
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "#888" }}>Target: ₹{fmt(AMOUNT_TARGET)}</p>
          </div>
          <div style={S.card}>
            <p style={{ ...S.label, marginBottom: 12 }}>Loan Type Progress (Today)</p>
            {LOAN_TYPES.map(lt => {
              const count = todayEntries.filter(e => e.loanType === lt.id).length;
              return (
                <div key={lt.id} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <i className={`ti ${lt.icon}`} style={{ fontSize: 15, color: lt.color }}></i>
                      <span style={{ fontSize: 12, color: "#111" }}>{lt.label}</span>
                    </div>
                    <span style={{ fontSize: 12, color: "#888" }}>{count}/{lt.target}</span>
                  </div>
                  <ProgressBar value={count} max={lt.target} color={lt.color} bg={lt.bg} />
                </div>
              );
            })}
          </div>
          {bestDay && (
            <div style={{ ...S.card, borderColor: "#0F6E56" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <i className="ti ti-trophy" style={{ fontSize: 18, color: "#0F6E56" }}></i>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#0F6E56" }}>Best Day</p>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "#888" }}>{bestDay[0]}</p>
              <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 500, color: "#111" }}>₹{fmt(bestDay[1].amount)} · {bestDay[1].count} loans</p>
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <div style={{ ...S.metric, textAlign: "center" }}>
              <p style={S.label}>Total Loans</p>
              <p style={S.value}><AnimatedNumber value={entries.length} /></p>
            </div>
            <div style={{ ...S.metric, textAlign: "center" }}>
              <p style={S.label}>Total NCA</p>
              <p style={{ ...S.value, color: "#185FA5" }}><AnimatedNumber value={totalNCA} /></p>
            </div>
          </div>
          {entries.length > 0 && <div style={{ display: "flex", gap: 8 }}>
            <button onClick={exportCSV} style={{ flex: 1, padding: "10px", fontSize: 13, fontWeight: 500, background: "#E1F5EE", color: "#0F6E56", border: "0.5px solid #0F6E56", borderRadius: 12, cursor: "pointer" }}>
              <i className="ti ti-file-spreadsheet" style={{ fontSize: 15, marginRight: 6, verticalAlign: -2 }}></i>Excel (CSV)
            </button>
            <button onClick={exportPDF} style={{ flex: 1, padding: "10px", fontSize: 13, fontWeight: 500, background: "#E6F1FB", color: "#185FA5", border: "0.5px solid #185FA5", borderRadius: 12, cursor: "pointer" }}>
              <i className="ti ti-file-text" style={{ fontSize: 15, marginRight: 6, verticalAlign: -2 }}></i>PDF Report
            </button>
          </div>}
        </div>
      )}

      {/* ADD ENTRY */}
      {view === "add" && (
        <div>
          {(() => {
            const steps = ["Date", "Customer", "Loan", "Amount"];
            const active = !form.date ? 0 : !form.customerName ? 1 : !form.loanType ? 2 : 3;
            return (
              <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
                {steps.map((s, i) => (
                  <div key={s} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: i < active ? "#0F6E56" : i === active ? "#185FA5" : "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {i < active ? <i className="ti ti-check" style={{ fontSize: 13, color: "#fff" }}></i> : <span style={{ fontSize: 11, fontWeight: 500, color: i === active ? "#fff" : "#888" }}>{i + 1}</span>}
                      </div>
                      <span style={{ fontSize: 10, marginTop: 3, color: i === active ? "#185FA5" : "#888", fontWeight: i === active ? 500 : 400 }}>{s}</span>
                    </div>
                    {i < steps.length - 1 && <div style={{ flex: 1, height: 1, background: i < active ? "#0F6E56" : "#e5e5e5", margin: "0 4px", marginBottom: 16 }} />}
                  </div>
                ))}
              </div>
            );
          })()}
          <div style={S.card}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ ...S.label, display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                <i className="ti ti-calendar" style={{ fontSize: 13, color: "#185FA5" }}></i> Date
              </label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "0.5px solid #e5e5e5", borderRadius: 10, fontSize: 14 }} />
            </div>
            {(() => {
              const initials = form.customerName.trim().split(" ").filter(Boolean).map(w => w[0].toUpperCase()).slice(0, 2).join("");
              const colors = ["#185FA5", "#0F6E56", "#993556", "#854F0B", "#534AB7"];
              const avatarColor = form.customerName ? colors[form.customerName.charCodeAt(0) % colors.length] : "#888";
              const isValid = form.customerName.trim().length >= 3;
              return (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ ...S.label, display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
                    <i className="ti ti-user" style={{ fontSize: 13, color: "#185FA5" }}></i> Customer Name
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", border: `1px solid ${isValid ? avatarColor : "#e5e5e5"}`, borderRadius: 12, background: "#f5f5f5", transition: "border-color 0.2s" }}>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: form.customerName ? avatarColor + "22" : "#e5e5e5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {initials ? <span style={{ fontSize: 14, fontWeight: 500, color: avatarColor }}>{initials}</span> : <i className="ti ti-user" style={{ fontSize: 18, color: "#888" }}></i>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <input type="text" placeholder="Customer चे पूर्ण नाव टाका..." value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} style={{ width: "100%", border: "none", outline: "none", background: "transparent", fontSize: 14, color: "#111", padding: 0 }} />
                      {form.customerName.trim().length > 0 && <p style={{ margin: "2px 0 0", fontSize: 11, color: isValid ? avatarColor : "#888" }}>{isValid ? "✓ नाव valid आहे" : "किमान 3 अक्षरे टाका"}</p>}
                    </div>
                    {form.customerName && <button onClick={() => setForm(f => ({ ...f, customerName: "" }))} style={{ background: "none", border: "none", cursor: "pointer", color: "#888", padding: 0 }}><i className="ti ti-x" style={{ fontSize: 15 }}></i></button>}
                  </div>
                </div>
              );
            })()}
            <div style={{ marginBottom: 14 }}>
              <label style={{ ...S.label, display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
                <i className="ti ti-users" style={{ fontSize: 13, color: "#185FA5" }}></i> Customer Type
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {CUSTOMER_TYPES.map(t => {
                  const isNCA = t === "New (NCA)"; const active = form.customerType === t;
                  return <button key={t} onClick={() => setForm(f => ({ ...f, customerType: t }))} style={{ flex: 1, padding: "12px 8px", fontSize: 13, border: "0.5px solid", borderColor: active ? (isNCA ? "#185FA5" : "#0F6E56") : "#e5e5e5", borderRadius: 12, background: active ? (isNCA ? "#E6F1FB" : "#E1F5EE") : "#f5f5f5", color: active ? (isNCA ? "#185FA5" : "#0F6E56") : "#888", fontWeight: active ? 500 : 400, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                    <i className={`ti ${isNCA ? "ti-user-plus" : "ti-user-check"}`} style={{ fontSize: 20, color: active ? (isNCA ? "#185FA5" : "#0F6E56") : "#888" }}></i>{t}
                  </button>;
                })}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ ...S.label, display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
                <i className="ti ti-cash" style={{ fontSize: 13, color: "#185FA5" }}></i> Loan Type
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 8 }}>
                {LOAN_TYPES.map(lt => {
                  const active = form.loanType === lt.id;
                  return <button key={lt.id} onClick={() => setForm(f => ({ ...f, loanType: lt.id }))} style={{ padding: "12px 10px", border: active ? `1.5px solid ${lt.color}` : "0.5px solid #e5e5e5", borderRadius: 12, background: active ? lt.bg : "#f5f5f5", cursor: "pointer", textAlign: "center", position: "relative" }}>
                    {active && <div style={{ position: "absolute", top: 6, right: 6, width: 16, height: 16, borderRadius: "50%", background: lt.color, display: "flex", alignItems: "center", justifyContent: "center" }}><i className="ti ti-check" style={{ fontSize: 10, color: "#fff" }}></i></div>}
                    <i className={`ti ${lt.icon}`} style={{ fontSize: 22, color: active ? lt.color : "#888", display: "block", marginBottom: 5 }}></i>
                    <span style={{ fontSize: 11, fontWeight: active ? 500 : 400, color: active ? lt.color : "#888", lineHeight: 1.3 }}>{lt.label}</span>
                  </button>;
                })}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ ...S.label, display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                <i className="ti ti-currency-rupee" style={{ fontSize: 13, color: "#185FA5" }}></i> Disbursement Amount
              </label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: "#888", fontWeight: 500 }}>₹</span>
                <input type="number" placeholder="50000" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={{ width: "100%", boxSizing: "border-box", paddingLeft: 28, padding: "10px 12px 10px 28px", border: "0.5px solid #e5e5e5", borderRadius: 10, fontSize: 14 }} />
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                {[25000, 50000, 75000, 100000].map(amt => (
                  <button key={amt} onClick={() => setForm(f => ({ ...f, amount: String(amt) }))} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 99, border: "0.5px solid #e5e5e5", background: form.amount == amt ? "#E6F1FB" : "#f5f5f5", color: form.amount == amt ? "#185FA5" : "#888", cursor: "pointer", fontWeight: form.amount == amt ? 500 : 400 }}>₹{fmt(amt)}</button>
                ))}
              </div>
            </div>
            <button onClick={handleAdd} style={{ width: "100%", padding: "13px", fontSize: 14, fontWeight: 500, background: "#185FA5", color: "#fff", border: "none", borderRadius: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <i className="ti ti-circle-check" style={{ fontSize: 18 }}></i> Entry Save करा
            </button>
          </div>

          {entries.length > 0 && (
            <div style={S.card}>
              <input type="text" placeholder="Customer search करा..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: "100%", boxSizing: "border-box", marginBottom: 10, padding: "9px 12px", border: "0.5px solid #e5e5e5", borderRadius: 10, fontSize: 13 }} />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button onClick={() => setFilterType("all")} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 99, border: "0.5px solid", borderColor: filterType === "all" ? "#185FA5" : "#e5e5e5", background: filterType === "all" ? "#E6F1FB" : "#f5f5f5", color: filterType === "all" ? "#185FA5" : "#888", cursor: "pointer" }}>All</button>
                {LOAN_TYPES.map(lt => (
                  <button key={lt.id} onClick={() => setFilterType(lt.id)} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 99, border: "0.5px solid", borderColor: filterType === lt.id ? lt.color : "#e5e5e5", background: filterType === lt.id ? lt.bg : "#f5f5f5", color: filterType === lt.id ? lt.color : "#888", cursor: "pointer" }}>{lt.label.split("/")[0].trim()}</button>
                ))}
              </div>
              <div style={{ marginTop: 12 }}>
                {filteredEntries.slice(0, 8).map((e, i, arr) => {
                  const lt = LOAN_TYPES.find(l => l.id === e.loanType);
                  return editId === e.id ? (
                    <div key={e.id} style={{ background: "#f5f5f5", borderRadius: 10, padding: 10, marginBottom: 8 }}>
                      <input type="text" value={editForm.customerName} onChange={ev => setEditForm(f => ({ ...f, customerName: ev.target.value }))} style={{ width: "100%", boxSizing: "border-box", marginBottom: 6, padding: "8px", border: "0.5px solid #e5e5e5", borderRadius: 8, fontSize: 13 }} />
                      <input type="number" value={editForm.amount} onChange={ev => setEditForm(f => ({ ...f, amount: ev.target.value }))} style={{ width: "100%", boxSizing: "border-box", marginBottom: 8, padding: "8px", border: "0.5px solid #e5e5e5", borderRadius: 8, fontSize: 13 }} />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={saveEdit} style={{ flex: 1, padding: "7px", fontSize: 12, background: "#E1F5EE", color: "#0F6E56", border: "0.5px solid #0F6E56", borderRadius: 8, cursor: "pointer" }}>Save</button>
                        <button onClick={() => setEditId(null)} style={{ flex: 1, padding: "7px", fontSize: 12, background: "#f5f5f5", color: "#888", border: "0.5px solid #e5e5e5", borderRadius: 8, cursor: "pointer" }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div key={e.id} style={{ ...S.row, borderBottom: i < arr.length - 1 ? "0.5px solid #eee" : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: lt?.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <i className={`ti ${lt?.icon}`} style={{ fontSize: 16, color: lt?.color }}></i>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.customerName}</p>
                          <p style={{ margin: "1px 0 0", fontSize: 11, color: "#888" }}>{e.date} {e.customerType === "New (NCA)" && <span style={{ color: "#185FA5", fontWeight: 500 }}>· NCA</span>}</p>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>₹{fmt(e.amount)}</p>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 2 }}>
                          <button onClick={() => startEdit(e)} style={{ fontSize: 11, color: "#185FA5", border: "none", background: "none", cursor: "pointer", padding: 0 }}><i className="ti ti-edit" style={{ fontSize: 13 }}></i></button>
                          <button onClick={() => setDeleteId(e.id)} style={{ fontSize: 11, color: "#c0392b", border: "none", background: "none", cursor: "pointer", padding: 0 }}><i className="ti ti-trash" style={{ fontSize: 13 }}></i></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredEntries.length === 0 && <p style={{ fontSize: 13, color: "#888", textAlign: "center", margin: "1rem 0" }}>कोणतीही entry सापडली नाही</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* DAILY VIEW */}
      {view === "daily" && (
        <div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ ...S.label, display: "block", marginBottom: 4 }}>Date निवडा</label>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "0.5px solid #e5e5e5", borderRadius: 10, fontSize: 14 }} />
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <div style={{ ...S.metric, textAlign: "center" }}><p style={S.label}>Customers</p><p style={S.value}>{dailySummary.day.length}</p><ProgressBar value={dailySummary.day.length} max={DAILY_TARGET} color="#185FA5" bg="#E6F1FB" /></div>
            <div style={{ ...S.metric, textAlign: "center" }}><p style={S.label}>NCA</p><p style={{ ...S.value, color: "#185FA5" }}>{dailySummary.nca.length}</p><ProgressBar value={dailySummary.nca.length} max={dailySummary.day.length || 1} color="#0F6E56" bg="#E1F5EE" /></div>
          </div>
          <div style={{ ...S.metric, display: "block", marginBottom: 12, borderRadius: 16 }}>
            <p style={S.label}>Total Disbursement</p>
            <p style={{ ...S.value, fontSize: 24 }}>₹<AnimatedNumber value={dailySummary.total} /></p>
            <ProgressBar value={dailySummary.total} max={AMOUNT_TARGET} color="#0F6E56" bg="#E1F5EE" />
          </div>
          <div style={S.card}>
            <p style={{ fontSize: 13, fontWeight: 500, margin: "0 0 12px" }}>Loan Type Breakdown</p>
            {LOAN_TYPES.map(lt => {
              const d = dailySummary.byType[lt.id];
              if (!d || d.count === 0) return null;
              return <div key={lt.id} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: lt.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><i className={`ti ${lt.icon}`} style={{ fontSize: 14, color: lt.color }}></i></div>
                    <span style={{ fontSize: 12, color: "#111" }}>{lt.label}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>₹{fmt(d.amount)} · {d.count}</span>
                </div>
                <ProgressBar value={d.count} max={lt.target} color={lt.color} bg={lt.bg} />
              </div>;
            })}
            {dailySummary.day.length === 0 && <p style={{ fontSize: 13, color: "#888", textAlign: "center", margin: "1rem 0" }}>या दिवसाची कोणतीही entry नाही</p>}
          </div>
          {dailySummary.day.length > 0 && <div style={S.card}>
            <p style={{ fontSize: 13, fontWeight: 500, margin: "0 0 10px" }}>Customer List</p>
            {dailySummary.day.map((e, i) => {
              const lt = LOAN_TYPES.find(l => l.id === e.loanType);
              return <div key={e.id} style={{ ...S.row, borderBottom: i < dailySummary.day.length - 1 ? "0.5px solid #eee" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: lt?.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><i className={`ti ${lt?.icon}`} style={{ fontSize: 15, color: lt?.color }}></i></div>
                  <div><p style={{ margin: 0, fontSize: 13 }}>{e.customerName}</p>{e.customerType === "New (NCA)" && <span style={{ fontSize: 10, background: "#E6F1FB", color: "#185FA5", padding: "1px 7px", borderRadius: 4, fontWeight: 500 }}>NCA</span>}</div>
                </div>
                <p style={{ margin: 0, fontWeight: 500, fontSize: 13 }}>₹{fmt(e.amount)}</p>
              </div>;
            })}
          </div>}
        </div>
      )}

      {/* QUARTERLY VIEW */}
      {view === "quarterly" && (
        <div>
          {Object.keys(quarterSummary).length === 0 && <div style={{ ...S.card, textAlign: "center", padding: "2.5rem 1rem" }}><i className="ti ti-chart-bar" style={{ fontSize: 40, color: "#888" }}></i><p style={{ fontSize: 14, color: "#888", margin: "8px 0 0" }}>अजून entries नाहीत</p></div>}
          {Object.entries(quarterSummary).map(([q, data]) => {
            const byType = {};
            LOAN_TYPES.forEach(lt => { const g = data.entries.filter(e => e.loanType === lt.id); byType[lt.id] = { count: g.length, amount: g.reduce((s, e) => s + e.amount, 0) }; });
            return <div key={q} style={S.card}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><i className="ti ti-calendar-stats" style={{ fontSize: 18, color: "#185FA5" }}></i><p style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>{q}</p></div>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <div style={{ ...S.metric, textAlign: "center" }}><p style={S.label}>Customers</p><p style={{ ...S.value, fontSize: 18 }}>{data.entries.length}</p></div>
                <div style={{ ...S.metric, textAlign: "center" }}><p style={S.label}>NCA</p><p style={{ ...S.value, fontSize: 18, color: "#185FA5" }}>{data.nca}</p></div>
              </div>
              <div style={{ ...S.metric, display: "block", marginBottom: 12 }}><p style={S.label}>Total Disbursement</p><p style={{ ...S.value, fontSize: 20 }}>₹{fmt(data.total)}</p></div>
              {LOAN_TYPES.map(lt => {
                const d = byType[lt.id];
                if (!d || d.count === 0) return null;
                return <div key={lt.id} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}><i className={`ti ${lt.icon}`} style={{ fontSize: 13, color: lt.color }}></i><span style={{ fontSize: 12, color: "#888" }}>{lt.label} ({d.count})</span></div>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>₹{fmt(d.amount)}</span>
                  </div>
                  <ProgressBar value={d.amount} max={data.total} color={lt.color} bg={lt.bg} />
                </div>;
              })}
            </div>;
          })}
        </div>
      )}

      {/* INCENTIVE VIEW */}
      {view === "incentive" && (() => {
        const { incentive, slab, lakhs } = calcIncentive(totalDisbursed, role);
        const slabs = role === "CRO" ? CRO_SLABS : LO_SLABS;
        const nextSlab = slabs.find(s => lakhs < s.min);
        const amtToNext = nextSlab ? Math.round((nextSlab.min - lakhs) * 100000) : 0;
        return <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {["CRO", "LO"].map(r => <button key={r} onClick={() => setRole(r)} style={{ flex: 1, padding: "10px", fontSize: 13, fontWeight: 500, border: "0.5px solid", borderColor: role === r ? "#185FA5" : "#e5e5e5", borderRadius: 12, background: role === r ? "#E6F1FB" : "#fff", color: role === r ? "#185FA5" : "#888", cursor: "pointer" }}>{r === "CRO" ? "CRO/SCRO (<4 yrs)" : "LO/SLO (>4 yrs)"}</button>)}
          </div>
          <div style={{ ...S.metric, display: "block", marginBottom: 12, borderRadius: 16 }}>
            <p style={S.label}>Total Disbursement</p>
            <p style={{ ...S.value, fontSize: 24 }}>₹<AnimatedNumber value={totalDisbursed} /></p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#888" }}>{lakhs.toFixed(2)} Lakhs</p>
          </div>
          <div style={{ ...S.card, border: incentive > 0 ? "1.5px solid #0F6E56" : "0.5px solid #e5e5e5", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <i className="ti ti-coin" style={{ fontSize: 20, color: incentive > 0 ? "#0F6E56" : "#888" }}></i>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: incentive > 0 ? "#0F6E56" : "#888" }}>Estimated Incentive</p>
            </div>
            <p style={{ margin: 0, fontSize: 30, fontWeight: 500, color: incentive > 0 ? "#0F6E56" : "#888" }}>₹<AnimatedNumber value={incentive} /></p>
            {slab && <p style={{ margin: "4px 0 0", fontSize: 12, color: "#888" }}>₹{fmt(slab.payPerLakh)} per lakh · Slab: {slab.min}L–{slab.max === 999 ? "35L+" : slab.max + "L"}</p>}
            {!slab && lakhs > 0 && <p style={{ margin: "4px 0 0", fontSize: 12, color: "#888" }}>Slab limit च्या खाली आहे</p>}
            {incentive === 0 && lakhs === 0 && <p style={{ margin: "4px 0 0", fontSize: 12, color: "#888" }}>Entries जोडा — incentive आपोआप calculate होईल</p>}
          </div>
          {amtToNext > 0 && <div style={{ ...S.card, borderColor: "#854F0B", background: "#FAEEDA22" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <i className="ti ti-rocket" style={{ fontSize: 18, color: "#854F0B" }}></i>
              <div><p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#854F0B" }}>Next Slab साठी आणखी</p><p style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 500 }}>₹{fmt(amtToNext)}</p><p style={{ margin: "2px 0 0", fontSize: 11, color: "#888" }}>disburse केलं की ₹{fmt(nextSlab.payPerLakh)}/lakh मिळेल</p></div>
            </div>
          </div>}
          <div style={S.card}>
            <p style={{ fontSize: 13, fontWeight: 500, margin: "0 0 12px" }}>Slab Chart — {role === "CRO" ? "CRO/SCRO" : "LO/SLO"}</p>
            {slabs.map((s, i) => {
              const isActive = slab && s.min === slab.min;
              return <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 10, marginBottom: 4, background: isActive ? "#E1F5EE" : "#f5f5f5", border: isActive ? "0.5px solid #0F6E56" : "0.5px solid transparent" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {isActive && <i className="ti ti-arrow-right" style={{ fontSize: 13, color: "#0F6E56" }}></i>}
                  <p style={{ margin: 0, fontSize: 13, fontWeight: isActive ? 500 : 400, color: isActive ? "#0F6E56" : "#111" }}>{s.min}L – {s.max === 999 ? "35L+" : s.max + "L"}</p>
                </div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: isActive ? 500 : 400, color: isActive ? "#0F6E56" : "#111" }}>₹{fmt(s.payPerLakh)}/lakh</p>
              </div>;
            })}
            <p style={{ fontSize: 11, color: "#888", margin: "10px 0 0", textAlign: "center" }}>* हे internal document वर आधारित आहे</p>
          </div>
        </div>;
      })()}

      {/* Delete Confirm */}
      {deleteId && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: "1.5rem", margin: "0 1rem", width: "100%", maxWidth: 300 }}>
            <p style={{ margin: "0 0 6px", fontWeight: 500, fontSize: 15 }}>Entry Delete करायची?</p>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#888" }}>हे action undo होणार नाही.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => handleDelete(deleteId)} style={{ flex: 1, padding: "9px", fontSize: 13, background: "#FCEBEB", color: "#c0392b", border: "0.5px solid #c0392b", borderRadius: 10, cursor: "pointer", fontWeight: 500 }}>Delete</button>
              <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: "9px", fontSize: 13, background: "#f5f5f5", color: "#888", border: "0.5px solid #e5e5e5", borderRadius: 10, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: toast.ok ? "#0F6E56" : "#c0392b", color: "#fff", padding: "9px 20px", borderRadius: 10, fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", zIndex: 999 }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
