// FILE: frontend/components/transactions/TransactionTable.tsx
"use client";
import { useState } from "react";
import Pill from "@/components/ui/Pill";
import { useBankingStore } from "@/lib/store";
import { formatCurrency, CATEGORY_COLORS } from "@/lib/utils";

const TYPE_COLORS: Record<string, string> = {
  deposit:"#10b981", transfer:"#6366f1", withdraw:"#f59e0b",
};

export default function TransactionTable() {
  const { transactions } = useBankingStore();
  const [filter,  setFilter]  = useState("all");
  const [search,  setSearch]  = useState("");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("desc");

  const txs = [...transactions]
    .filter(t => filter === "all" || t.type === filter)
    .filter(t => {
      if (!search) return true;
      const s = search.toLowerCase();
      return [t.receiver, t.sender, t.message, t.category].some(f => f?.toLowerCase().includes(s));
    })
    .sort((a, b) => {
      const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
      return sortDir === "desc" ? diff : -diff;
    });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 p-4 border-b border-slate-100">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, note, category…"
          className="input flex-1 min-w-[180px] text-[13px]"
        />
        <div className="flex gap-1.5">
          {["all","deposit","transfer","withdraw"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all capitalize ${
                filter===f ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
              }`}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>
        <button onClick={() => setSortDir(d => d==="desc"?"asc":"desc")} className="btn-ghost text-[12px]">
          Date {sortDir==="desc"?"↓":"↑"}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-slate-100 bg-slate-50">
            <tr>
              {["ID","Type","Amount","From","To","Date","Note","Category","Risk"].map(h => (
                <th key={h} className="table-header whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {txs.map(t => (
              <tr key={t.id} className={`table-row ${t.is_flagged?"bg-red-50/60":""}`}>
                <td className="table-cell text-slate-400">#{t.id}</td>
                <td className="table-cell">
                  <Pill label={t.type} color={TYPE_COLORS[t.type]||"#6b7280"} />
                </td>
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
                  {t.is_flagged
                    ? <Pill label="⚠ High" color="#ef4444"/>
                    : t.fraud_score>0.3
                      ? <Pill label="⚠ Med" color="#f59e0b"/>
                      : <span className="text-[11px] text-emerald-600 font-semibold">✓ Clear</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {txs.length===0 && (
          <div className="text-center py-10 text-slate-400 text-[13px]">No transactions found.</div>
        )}
      </div>
      <div className="px-4 py-2 border-t border-slate-100 text-[12px] text-slate-400">
        Showing {txs.length} of {transactions.length} transactions
      </div>
    </div>
  );
}
