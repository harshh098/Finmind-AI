// FILE: frontend/components/expense/MonthlyTrends.tsx
"use client";
import Card from "@/components/ui/Card";
import BarChart from "@/components/ui/BarChart";
import { useBankingStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";

export default function MonthlyTrends() {
  const { transactions } = useBankingStore();
  const byMonth: Record<string, { income: number; expense: number }> = {};
  for (const t of transactions) {
    const mo = t.date.slice(0, 7);
    if (!byMonth[mo]) byMonth[mo] = { income: 0, expense: 0 };
    if (t.type === "deposit") byMonth[mo].income += t.amount;
    else byMonth[mo].expense += t.amount;
  }
  const data = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b)).slice(-8)
    .map(([mo, d]) => ({ label: mo.slice(5), income: d.income, expense: d.expense }));
  const totalSavings = data.reduce((s, d) => s + d.income - d.expense, 0);
  const bestMonth    = data.length > 0 ? data.reduce((b, d) => d.income > b.income ? d : b, data[0]).label : "—";

  return (
    <Card title="Monthly Trends" subtitle="Income vs expense per month" className="w-full">
      <div className="flex gap-6 mb-4">
        {[
          { label: "Best Month",     value: bestMonth,                       color: "#10b981" },
          { label: "Total Saved",    value: formatCurrency(totalSavings, true), color: "#06b6d4" },
          { label: "Months Tracked", value: String(data.length),             color: "#818cf8" },
        ].map(m => (
          <div key={m.label}>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">{m.label}</div>
            <div className="text-[15px] font-bold" style={{ color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>
      {data.length > 0
        ? <BarChart data={data} height={110} dual />
        : <div className="text-[13px] text-slate-400 text-center py-8">No data yet</div>
      }
    </Card>
  );
}
