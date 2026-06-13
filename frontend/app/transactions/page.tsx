// FILE: frontend/app/transactions/page.tsx
"use client";
import MetricCard from "@/components/ui/MetricCard";
import Card from "@/components/ui/Card";
import { useTransactions } from "@/hooks/useTransactions";
import { useBankingStore } from "@/lib/store";
import { formatCurrency, CATEGORY_COLORS } from "@/lib/utils";
import { useState } from "react";
import Pill from "@/components/ui/Pill";

const TYPE_COLORS: Record<string, string> = { deposit:"#10b981", transfer:"#6366f1", withdraw:"#f59e0b" };

function downloadCSV(rows: any[]) {
  const headers = ["ID","Type","Amount","From","To","Date","Note","Category","Risk Score","Flagged"];
  const escape = (v: any) => {
    const s = v == null ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.join(","),
    ...rows.map(t => [
      t.id,
      t.type,
      t.amount,
      t.sender || "",
      t.receiver || "",
      t.date,
      t.message || "",
      t.category || "",
      typeof t.fraud_score === "number" ? t.fraud_score.toFixed(3) : "0.000",
      t.is_flagged ? "Yes" : "No",
    ].map(escape).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "bank_statement.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function TransactionsPage() {
  const { transactions, loading, error, refresh } = useTransactions(200);
  const [filter, setFilter]   = useState("all");
  const [search, setSearch]   = useState("");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("desc");

  const deposits  = transactions.filter(t => t.type === "deposit");
  const transfers = transactions.filter(t => t.type === "transfer");
  const withdraws = transactions.filter(t => t.type === "withdraw");
  const flagged   = transactions.filter(t => t.is_flagged);
  const income    = deposits.reduce((s, t) => s + t.amount, 0);
  const expense   = [...transfers, ...withdraws].reduce((s, t) => s + t.amount, 0);

  const filtered = [...transactions]
    .filter(t => filter === "all" || t.type === filter)
    .filter(t => {
      if (!search) return true;
      const s = search.toLowerCase();
      return [t.receiver, t.sender, t.message, t.category].some(f => f?.toLowerCase().includes(s));
    })
    .sort((a, b) => sortDir === "desc"
      ? new Date(b.date).getTime() - new Date(a.date).getTime()
      : new Date(a.date).getTime() - new Date(b.date).getTime());

  const byCat: Record<string, number> = {};
  for (const t of transactions) {
    if (t.type === "deposit") continue;
    const c = t.category || "General";
    byCat[c] = (byCat[c] || 0) + t.amount;
  }
  const topCats = Object.entries(byCat).sort(([,a],[,b]) => b-a).slice(0,5);
  const catTotal = topCats.reduce((s,[,v]) => s+v, 0);

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Loading transactions…</div>;

  return (
    <div className="flex flex-col gap-4 animate-slide-up">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[13px] text-red-700">
          {error} — <button onClick={refresh} className="underline font-semibold">Retry</button>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <MetricCard label="Total Transactions" value={transactions.length}                  color="#818cf8" icon="🔄" />
        <MetricCard label="Deposits"           value={deposits.length}   sub={formatCurrency(income, true)}   trend="up"   color="#10b981" icon="↙" />
        <MetricCard label="Transfers"          value={transfers.length}  sub={formatCurrency(transfers.reduce((s,t)=>s+t.amount,0),true)} color="#6366f1" icon="↗" />
        <MetricCard label="Withdrawals"        value={withdraws.length}  sub={formatCurrency(withdraws.reduce((s,t)=>s+t.amount,0),true)} color="#f59e0b" icon="↓" />
        <MetricCard label="Flagged"            value={flagged.length}    sub="Suspicious" trend={flagged.length>0?"down":"neutral"} color="#ef4444" icon="⚠" />
      </div>

      <div className="flex gap-4 flex-wrap">
        <Card title="Spend by Category" subtitle="Top outflow categories" className="flex-1 min-w-[200px]">
          {topCats.length === 0
            ? <div className="text-[13px] text-slate-400 text-center py-6">No spending yet</div>
            : <div className="flex flex-col gap-2.5">
                {topCats.map(([cat, amt]) => {
                  const pct   = catTotal > 0 ? Math.round((amt/catTotal)*100) : 0;
                  const color = CATEGORY_COLORS[cat] || "#6b7280";
                  return (
                    <div key={cat} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between text-[12px] mb-0.5">
                          <span className="font-semibold text-slate-700">{cat}</span>
                          <span className="text-slate-500">{formatCurrency(amt, true)}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-400 w-8 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
          }
        </Card>

        <Card title="Quick Stats" subtitle="Financial summary" className="min-w-[160px]">
          <div className="flex flex-col gap-2.5">
            {[
              { label:"Total Credited", value: formatCurrency(income, true),    color:"#10b981" },
              { label:"Total Debited",  value: formatCurrency(expense, true),   color:"#ef4444" },
              { label:"Net Flow",       value: formatCurrency(income-expense, true), color: income>=expense?"#10b981":"#ef4444" },
              { label:"Avg Transaction",value: transactions.length>0 ? formatCurrency(Math.round((income+expense)/transactions.length),true):"—", color:"#818cf8" },
              { label:"Largest",        value: transactions.length>0 ? formatCurrency(Math.max(...transactions.map(t=>t.amount)),true):"—", color:"#f59e0b" },
            ].map(s => (
              <div key={s.label} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
                <span className="text-[12px] text-slate-500">{s.label}</span>
                <span className="text-[13px] font-bold" style={{ color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex flex-wrap gap-2 p-4 border-b border-slate-100">
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Search by name, note, category…" className="input flex-1 min-w-[180px] text-[13px]" />
          <div className="flex gap-1.5">
            {["all","deposit","transfer","withdraw"].map(f => (
              <button key={f} onClick={()=>setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all capitalize ${filter===f?"bg-indigo-600 text-white border-indigo-600":"bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}>
                {f.charAt(0).toUpperCase()+f.slice(1)}
              </button>
            ))}
          </div>
          <button onClick={()=>setSortDir(d=>d==="desc"?"asc":"desc")} className="btn-ghost text-[12px]">
            Date {sortDir==="desc"?"↓":"↑"}
          </button>
          <button onClick={refresh} className="btn-ghost text-[12px]">↻ Refresh</button>
          {/* Download Statement */}
          <button
            onClick={() => downloadCSV(filtered)}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            ⬇ Download Statement
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>{["ID","Type","Amount","From","To","Date","Note","Category","Risk"].map(h=>(
                <th key={h} className="table-header whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} className={`table-row ${t.is_flagged?"bg-red-50/60":""}`}>
                  <td className="table-cell text-slate-400">#{t.id}</td>
                  <td className="table-cell"><Pill label={t.type} color={TYPE_COLORS[t.type]||"#6b7280"}/></td>
                  <td className={`table-cell font-bold ${t.type==="deposit"?"text-emerald-600":"text-red-500"}`}>
                    {t.type==="deposit"?"+":"−"}{formatCurrency(t.amount)}
                  </td>
                  <td className="table-cell text-slate-600">{t.sender||"—"}</td>
                  <td className="table-cell text-slate-600">{t.receiver||"—"}</td>
                  <td className="table-cell text-slate-400 whitespace-nowrap">{t.date}</td>
                  <td className="table-cell text-slate-400 max-w-[120px] truncate">{t.message||"—"}</td>
                  <td className="table-cell">
                    {t.category && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ background:(CATEGORY_COLORS[t.category]||"#6b7280")+"20", color:CATEGORY_COLORS[t.category]||"#6b7280" }}>
                        {t.category}
                      </span>
                    )}
                  </td>
                  <td className="table-cell">
                    {t.is_flagged ? <Pill label="⚠ High" color="#ef4444"/>
                     : t.fraud_score>0.3 ? <Pill label="⚠ Med" color="#f59e0b"/>
                     : <span className="text-[11px] text-emerald-600 font-semibold">✓ Clear</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-10 text-slate-400 text-[13px]">No transactions found.</div>}
        </div>
        <div className="px-4 py-2 border-t border-slate-100 text-[12px] text-slate-400">
          Showing {filtered.length} of {transactions.length} transactions
        </div>
      </div>
    </div>
  );
}
