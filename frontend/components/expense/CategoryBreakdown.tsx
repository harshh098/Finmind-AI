// FILE: frontend/components/expense/CategoryBreakdown.tsx
"use client";
import Card from "@/components/ui/Card";
import ProgressBar from "@/components/ui/ProgressBar";
import { useBankingStore } from "@/lib/store";
import { CATEGORY_COLORS, formatCurrency } from "@/lib/utils";
import { computeDynamicBudgets } from "@/lib/budgets";

export default function CategoryBreakdown() {
  const { transactions } = useBankingStore();

  const dynamicBudgets = computeDynamicBudgets(transactions);

  const byCat: Record<string, number> = {};
  for (const t of transactions) {
    if (t.type === "deposit") continue;
    const c = t.category || "General";
    byCat[c] = (byCat[c] || 0) + t.amount;
  }
  const total = Object.values(byCat).reduce((s, v) => s + v, 0) || 1;
  const rows  = Object.entries(byCat).sort(([, a], [, b]) => b - a);

  return (
    <Card title="Category Breakdown" subtitle="All expense categories ranked by spend">
      {rows.length === 0 && (
        <div className="text-[13px] text-slate-400 text-center py-8">No expense data yet</div>
      )}
      <div className="flex flex-col gap-3">
        {rows.map(([cat, amt]) => {
          const color      = CATEGORY_COLORS[cat] || "#6b7280";
          const pct        = Math.round((amt / total) * 100);
          const budget     = dynamicBudgets[cat];
          const overBudget = budget !== undefined && amt > budget;
          return (
            <div key={cat}>
              <div className="flex justify-between items-center text-[12px] mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                  <span className="font-semibold text-slate-700">{cat}</span>
                  {overBudget && (
                    <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-full border border-red-200">
                      OVER
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">{pct}%</span>
                  <span className="font-bold text-slate-700">{formatCurrency(amt, true)}</span>
                </div>
              </div>
              <ProgressBar value={amt} max={budget ?? total} color={color} height={5} />
              {budget !== undefined && (
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Personalised budget: {formatCurrency(budget, true)} · Used:{" "}
                  {Math.round((amt / budget) * 100)}%
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}