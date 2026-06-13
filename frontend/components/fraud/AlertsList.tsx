// FILE: frontend/components/fraud/AlertsList.tsx
"use client";
import Pill from "@/components/ui/Pill";
import { useFraud } from "@/hooks/useFraud";
import { formatCurrency } from "@/lib/utils";

export default function AlertsList() {
  const { report, loading } = useFraud();
  if (loading) return <div className="text-center py-10 text-[13px] text-slate-400">Loading alerts…</div>;
  const sorted = [...report.alerts].sort((a, b) => b.risk_score - a.risk_score);
  if (sorted.length === 0) return <div className="text-center py-12 text-[14px] text-emerald-600 font-semibold">✅ No suspicious transactions detected</div>;

  return (
    <div className="flex flex-col gap-3">
      {sorted.map(a => {
        const isHigh = a.max_severity === "high";
        const isMed  = a.max_severity === "medium";
        const col    = isHigh ? "#ef4444" : isMed ? "#f59e0b" : "#10b981";
        return (
          <div key={a.transaction_id} className="rounded-xl border p-3.5"
               style={{ background: isHigh?"#fef2f2":isMed?"#fffbeb":"#f0fdf4", borderColor: isHigh?"#fca5a5":isMed?"#fcd34d":"#86efac" }}>
            <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[14px] font-bold text-slate-800">TX #{a.transaction_id}</span>
                <Pill label={a.max_severity.toUpperCase()} color={col} size="md" />
                <span className="text-[11px] text-slate-500">{a.type}</span>
                {a.action==="blocked" && <Pill label="BLOCKED" color="#dc2626" size="md"/>}
                {a.action==="warning" && <Pill label="WARNED"  color="#f59e0b" size="md"/>}
              </div>
              <span className="text-[15px] font-bold" style={{ color: col }}>{formatCurrency(a.amount)}</span>
            </div>
            <div className="text-[12px] text-slate-600 mb-2">
              {a.type==="deposit"?"From":"To"}: <strong>{a.type==="deposit"?a.sender:a.receiver}</strong>
              &nbsp;·&nbsp;{a.date}&nbsp;·&nbsp;Risk: <strong>{a.risk_score}/100</strong>
              {a.ml_score>0 && <>&nbsp;·&nbsp;ML: <strong>{(a.ml_score*100).toFixed(0)}%</strong></>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {a.flags.map(f => (
                <span key={f.rule_id} className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: col+"20", color: col }}>⚠ {f.rule_id}: {f.rule}</span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
