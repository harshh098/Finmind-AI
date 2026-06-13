// FILE: frontend/components/expense/BudgetTracker.tsx
"use client";
import Card from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import { useBankingStore } from "@/lib/store";
import { CATEGORY_COLORS, formatCurrency } from "@/lib/utils";
import { computeDynamicBudgets } from "@/lib/budgets";

export default function BudgetTracker() {
  const { transactions } = useBankingStore();

  // Dynamic budgets derived from this user's average monthly income
  const dynamicBudgets = computeDynamicBudgets(transactions);

  const byCat: Record<string, number> = {};
  for (const t of transactions) {
    if (t.type === "deposit") continue;
    const c = t.category || "General";
    byCat[c] = (byCat[c] || 0) + t.amount;
  }

  const rows = Object.entries(byCat)
    .filter(([k]) => k in dynamicBudgets)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  // Average monthly income for the subtitle
  let totalIncome = 0;
  const incomeMonths = new Set<string>();
  for (const t of transactions) {
    if (t.type === "deposit") {
      totalIncome += t.amount;
      incomeMonths.add(t.date.slice(0, 7));
    }
  }
  const avgIncome = totalIncome / (incomeMonths.size || 1);

  return (
    <Card
      title="Budget Tracker"
      subtitle={`Personalised to avg monthly income ${formatCurrency(avgIncome, true)}`}
      className="flex-[2] min-w-[260px]"
    >
      {rows.length === 0 && (
        <div className="text-[13px] text-slate-400 text-center py-8">No budget data yet</div>
      )}
      <div className="flex flex-col gap-4">
        {rows.map(([cat, spent]) => {
          const budget = dynamicBudgets[cat] || 10000;
          const pct    = Math.min(100, Math.round((spent / budget) * 100));
          const color  = CATEGORY_COLORS[cat] || "#6b7280";
          const isOver = pct >= 100;
          return (
            <div key={cat}>
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                  <span className="text-[13px] font-semibold text-slate-700">{cat}</span>
                  {isOver && (
                    <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full">
                      Over budget!
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[12px] font-bold text-slate-700">{formatCurrency(spent)}</span>
                  <span className="text-[11px] text-slate-400"> / {formatCurrency(budget)}</span>
                </div>
              </div>
              <ProgressBar value={spent} max={budget} color={color} height={6} />
              <div className="text-[10px] text-slate-400 mt-0.5">
                {pct}% of your personalised monthly budget used
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}