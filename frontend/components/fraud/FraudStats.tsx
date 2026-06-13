"use client";
import Card from "@/components/ui/Card";
import { useFraud } from "@/hooks/useFraud";
import { formatCurrency } from "@/lib/utils";

export default function FraudStats() {
  const { report, loading } = useFraud();
  const { total_transactions, flagged_count, high_risk, medium_risk, low_risk,
          blocked_count, warning_count, overall_risk, ml_model_trained, ml_sample_count, alerts } = report;
  const riskColor  = overall_risk==="HIGH"?"#ef4444":overall_risk==="MEDIUM"?"#f59e0b":"#10b981";
  const flaggedAmt = alerts.reduce((s, a) => s+a.amount, 0);

  const stats = [
    { label:"Total Scanned",  value:total_transactions,                     color:"#818cf8" },
    { label:"Flagged",        value:flagged_count,                          color:"#ef4444" },
    { label:"High Risk",      value:high_risk,                              color:"#dc2626" },
    { label:"Medium Risk",    value:medium_risk,                            color:"#f59e0b" },
    { label:"Low Risk",       value:low_risk,                               color:"#10b981" },
    { label:"Blocked",        value:blocked_count,                          color:"#7f1d1d" },
    { label:"Flagged Amount", value:formatCurrency(flaggedAmt, true),       color:"#ef4444" },
    { label:"Overall Risk",   value:overall_risk,                           color:riskColor },
  ];

  return (
    <Card title="Fraud Statistics" subtitle="Transaction risk and security overview">
      <div className="grid grid-cols-2 gap-3">
        {stats.map(s => (
          <div key={s.label} className="flex flex-col p-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">{s.label}</span>
            <span className="text-[18px] font-black" style={{ color: s.color }}>{loading?"…":s.value}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-[12px] text-slate-600">
  <div className="font-semibold mb-1">
    Security Monitoring
  </div>

  <div>
    Transactions are continuously monitored for unusual activity and
    potential fraud. Suspicious transactions may be flagged, warned,
    or blocked for your protection.
  </div>
</div>

</Card>
);
}