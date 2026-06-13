// FILE: frontend/components/dashboard/CashFlowChart.tsx
"use client";
import Card from "@/components/ui/Card";
import BarChart from "@/components/ui/BarChart";
import { useBankingStore } from "@/lib/store";

export default function CashFlowChart() {
  const { transactions } = useBankingStore();
  const byMonth: Record<string, { income: number; expense: number }> = {};
  for (const t of transactions) {
    const mo = t.date.slice(0, 7);
    if (!byMonth[mo]) byMonth[mo] = { income: 0, expense: 0 };
    if (t.type === "deposit") byMonth[mo].income += t.amount;
    else byMonth[mo].expense += t.amount;
  }
  const data = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b)).slice(-7)
    .map(([mo, d]) => ({ label: mo.slice(5), income: d.income, expense: d.expense }));
  const totalIncome  = data.reduce((s, d) => s + d.income, 0);
  const totalExpense = data.reduce((s, d) => s + d.expense, 0);

  return (
    <Card title="Monthly Cash Flow" subtitle="Income vs Expenses" className="flex-[2] min-w-[260px]">
      <div className="flex gap-4 mb-3">
        <div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total Income</div>
          <div className="text-[14px] font-bold text-emerald-600">₹{(totalIncome/1000).toFixed(0)}K</div>
        </div>
        <div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total Expense</div>
          <div className="text-[14px] font-bold text-red-500">₹{(totalExpense/1000).toFixed(0)}K</div>
        </div>
      </div>
      {data.length > 0
        ? <BarChart data={data} height={100} dual />
        : <div className="text-[13px] text-slate-400 text-center py-8">No data yet</div>
      }
    </Card>
  );
}
