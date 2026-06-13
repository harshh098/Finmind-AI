"use client";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Pill from "@/components/ui/Pill";
import { useFraud } from "@/hooks/useFraud";
import { formatCurrency } from "@/lib/utils";

export default function FraudMonitor() {
  const { report, loading } = useFraud();

  const { high_risk, medium_risk, flagged_count, alerts, blocked_count } = report;

  return (
    <Card
      title="🚨 Fraud Monitor"
      subtitle="Real-time anomaly detection"
      action={
        <Pill
          label={loading ? "…" : `${flagged_count} alerts`}
          color={flagged_count > 2 ? "#ef4444" : "#f59e0b"}
          size="md"
        />
      }
      className="flex-1 min-w-[210px]"
    >
      <div className="flex gap-3 mb-3">
        <div className="flex-1 text-center py-1.5 rounded-lg bg-red-50 border border-red-100">
          <div className="text-[18px] font-bold text-red-500">{high_risk}</div>
          <div className="text-[10px] text-red-400">High Risk</div>
        </div>
        <div className="flex-1 text-center py-1.5 rounded-lg bg-amber-50 border border-amber-100">
          <div className="text-[18px] font-bold text-amber-500">{medium_risk}</div>
          <div className="text-[10px] text-amber-400">Medium</div>
        </div>
        <div className="flex-1 text-center py-1.5 rounded-lg bg-slate-50 border border-slate-100">
          <div className="text-[18px] font-bold text-slate-600">{blocked_count}</div>
          <div className="text-[10px] text-slate-400">Blocked</div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {alerts.slice(0, 4).map((a) => (
          <div
            key={a.transaction_id}
            className="p-2.5 rounded-lg border"
            style={{
              background:   a.max_severity === "high" ? "#fef2f2" : "#fffbeb",
              borderColor:  a.max_severity === "high" ? "#fca5a5" : "#fcd34d",
            }}
          >
            <div className="flex justify-between items-start mb-1">
              <span className="text-[12px] font-bold text-slate-700">
                TX#{a.transaction_id} — {a.receiver || a.sender}
              </span>
              <span className="text-[12px] font-bold" style={{ color: a.max_severity === "high" ? "#ef4444" : "#f59e0b" }}>
                {formatCurrency(a.amount)}
              </span>
            </div>
            <div className="text-[10px] text-slate-500">{a.date} · Risk: {a.risk_score}/100</div>
            <div className="flex gap-1 mt-1 flex-wrap">
              {a.flag_ids.map((f: string) => (
                <Pill key={f} label={`⚠ ${f}`} color={a.max_severity === "high" ? "#ef4444" : "#f59e0b"} />
              ))}
            </div>
          </div>
        ))}
        {flagged_count === 0 && !loading && (
          <div className="text-center py-4 text-[13px] text-emerald-600 font-semibold">
            ✅ No fraud alerts detected
          </div>
        )}
        {loading && (
          <div className="text-center py-4 text-[13px] text-slate-400">Loading…</div>
        )}
      </div>

      <Link href="/fraud-detection" className="block mt-3 text-center text-[12px] text-indigo-600 font-semibold hover:text-indigo-800">
        View full fraud report →
      </Link>
    </Card>
  );
}
