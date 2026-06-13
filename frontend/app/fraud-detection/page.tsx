// FILE: frontend/app/fraud-detection/page.tsx
"use client";
import MetricCard from "@/components/ui/MetricCard";
import Card from "@/components/ui/Card";
import Pill from "@/components/ui/Pill";
import { useFraud } from "@/hooks/useFraud";
import { formatCurrency } from "@/lib/utils";

export default function FraudDetectionPage() {
  const { report, loading, error, refresh } = useFraud();

  const {
    total_transactions, flagged_count, high_risk, medium_risk, low_risk,
    blocked_count, warning_count, overall_risk, alerts, ml_model_trained, ml_sample_count,
  } = report;

  const riskColor =
    overall_risk === "HIGH" ? "#ef4444" :
    overall_risk === "MEDIUM" ? "#f59e0b" :
    "#10b981";

  const safe = Math.max(0, total_transactions - flagged_count);
  const flaggedAmt = alerts.reduce((s, a) => s + a.amount, 0);
  const blockedAmt = alerts.filter((a) => a.action === "blocked").reduce((s, a) => s + a.amount, 0);

  return (
    <div className="flex flex-col gap-4 animate-slide-up">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-[13px] text-red-700">
          {error} —{" "}
          <button onClick={refresh} className="underline font-semibold">
            Retry
          </button>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <MetricCard label="Scanned"      value={loading ? "…" : total_transactions} sub="All transactions"     color="#818cf8" icon="🔍" />
        <MetricCard label="Flagged"      value={loading ? "…" : flagged_count}      sub="Suspicious"           color="#ef4444" icon="🚨" trend={flagged_count > 0 ? "down" : "neutral"} />
        <MetricCard label="High Risk"    value={loading ? "…" : high_risk}          sub="Immediate review"     color="#dc2626" icon="🔴" />
        <MetricCard label="Blocked"      value={loading ? "…" : blocked_count}      sub="Transactions blocked" color="#7f1d1d" icon="🛑" />
        <MetricCard label="Overall Risk" value={loading ? "…" : overall_risk}       sub="System assessment"    color={riskColor} icon="🛡" />
      </div>

      <div className="flex gap-4 flex-wrap">
        {/* Risk Distribution */}
        <Card title="Risk Distribution" subtitle="Transaction safety profile" className="flex-1 min-w-[180px]">
          <div className="flex flex-col gap-2.5 mt-1">
            {[
              { label: "Safe",      count: safe,          color: "#10b981" },
              { label: "Low Risk",  count: low_risk,      color: "#84cc16" },
              { label: "Medium",    count: medium_risk,   color: "#f59e0b" },
              { label: "High Risk", count: high_risk,     color: "#ef4444" },
              { label: "Blocked",   count: blocked_count, color: "#7f1d1d" },
              { label: "Warned",    count: warning_count, color: "#f97316" },
            ].map((r) => (
              <div key={r.label} className="flex items-center gap-3">
                <span className="text-[12px] text-slate-500 w-20 flex-shrink-0">
                  {r.label}
                </span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: total_transactions > 0
                        ? `${Math.round((r.count / total_transactions) * 100)}%`
                        : "0%",
                      background: r.color,
                    }}
                  />
                </div>
                <span className="text-[12px] font-bold text-slate-700 w-6 text-right">
                  {r.count}
                </span>
              </div>
            ))}
          </div>

          <div
            className="mt-4 p-3 rounded-lg border"
            style={{ background: riskColor + "0d", borderColor: riskColor + "33" }}
          >
            <div className="text-[11px] font-bold mb-0.5" style={{ color: riskColor }}>
              OVERALL RISK
            </div>
            <div className="text-[22px] font-black" style={{ color: riskColor }}>
              {overall_risk}
            </div>
          </div>
        </Card>

        {/* Amounts */}
        <Card
          title="Flagged Amount Summary"
          subtitle="Financial exposure"
          className="flex-1 min-w-[160px]"
        >
          <div className="flex flex-col gap-2.5">
            {[
              { label: "Total Flagged",  value: flaggedAmt, color: "#ef4444" },
              { label: "Blocked Amount", value: blockedAmt, color: "#7f1d1d" },
            ].map((row) => (
              <div
                key={row.label}
                className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0"
              >
                <span className="text-[12px] text-slate-500">
                  {row.label}
                </span>
                <span
                  className="text-[14px] font-bold"
                  style={{ color: row.color }}
                >
                  {formatCurrency(row.value, true)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-[12px] text-slate-600">
            <p className="font-semibold mb-1">Security Monitoring</p>
            <p>
              Transactions are continuously monitored for unusual activity and
              potential fraud. Suspicious transactions may be flagged, warned,
              or blocked for your protection.
            </p>
          </div>
        </Card>

        {/* Alert List */}
        <Card title="🚨 Suspicious Transactions" subtitle="Sorted by risk score">
          {loading && (
            <div className="text-center py-10 text-slate-400">Loading…</div>
          )}
          {!loading && alerts.length === 0 && (
            <div className="text-center py-12 text-[14px] text-emerald-600 font-semibold">
              ✅ No suspicious transactions detected
            </div>
          )}

          <div className="flex flex-col gap-3">
            {alerts.map((a) => {
              const isHigh = a.max_severity === "high";
              const isMed  = a.max_severity === "medium";
              const col    = isHigh ? "#ef4444" : isMed ? "#f59e0b" : "#10b981";

              return (
                <div
                  key={a.transaction_id}
                  className="rounded-xl border p-3.5"
                  style={{
                    background:   isHigh ? "#fef2f2" : isMed ? "#fffbeb" : "#f0fdf4",
                    borderColor:  isHigh ? "#fca5a5" : isMed ? "#fcd34d" : "#86efac",
                  }}
                >
                  <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-bold text-slate-800">
                        TX #{a.transaction_id}
                      </span>
                      <Pill label={a.max_severity.toUpperCase()} color={col} size="md" />
                      <span className="text-[11px] text-slate-500">{a.type}</span>
                      {a.action === "blocked" && <Pill label="BLOCKED" color="#dc2626" size="md" />}
                      {a.action === "warning" && <Pill label="WARNED"  color="#f59e0b" size="md" />}
                    </div>
                    <span className="text-[15px] font-bold" style={{ color: col }}>
                      {formatCurrency(a.amount)}
                    </span>
                  </div>

                  <div className="text-[12px] text-slate-600 mb-2">
                    {a.type === "deposit" ? "From" : "To"}:{" "}
                    <strong>{a.type === "deposit" ? a.sender : a.receiver}</strong>
                    &nbsp;·&nbsp;{a.date}&nbsp;·&nbsp;Risk:{" "}
                    <strong>{a.risk_score}/100</strong>
                    {a.ml_score > 0 && (
                      <>&nbsp;·&nbsp;ML: <strong>{(a.ml_score * 100).toFixed(0)}%</strong></>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {a.flags.map((f) => (
                      <span
                        key={f.rule_id}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: col + "20", color: col }}
                      >
                        ⚠ {f.rule_id}: {f.rule}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}