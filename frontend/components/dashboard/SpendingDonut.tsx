// FILE: frontend/components/dashboard/SpendingDonut.tsx
"use client";
import Card from "@/components/ui/Card";
import DonutChart from "@/components/ui/DonutChart";
import { useBankingStore } from "@/lib/store";
import { CATEGORY_COLORS } from "@/lib/utils";

export default function SpendingDonut() {
  const { transactions } = useBankingStore();
  const byCat: Record<string, number> = {};
  for (const t of transactions) {
    if (t.type === "deposit" || t.status !== "completed") continue;
    const c = t.category || "General";
    byCat[c] = (byCat[c] || 0) + t.amount;
  }
  const segments = Object.entries(byCat)
    .sort(([, a], [, b]) => b - a).slice(0, 6)
    .map(([label, value]) => ({ label, value, color: CATEGORY_COLORS[label] || "#6b7280" }));

  return (
    <Card title="Spending Split" subtitle="By category" className="flex-1 min-w-[200px]">
      {segments.length > 0
        ? <DonutChart segments={segments} size={110} showLegend />
        : <div className="text-[13px] text-slate-400 text-center py-8">No spending data yet</div>
      }
    </Card>
  );
}
