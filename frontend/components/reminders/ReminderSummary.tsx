// FILE: frontend/components/reminders/ReminderSummary.tsx
"use client";
import Card from "@/components/ui/Card";
import { useBankingStore } from "@/lib/store";
import { REMINDER_TYPE_COLORS, formatCurrency } from "@/lib/utils";

export default function ReminderSummary() {
  const { reminders } = useBankingStore();
  const pending = reminders.filter(r => r.status === "pending");
  const groups  = pending.reduce<Record<string, { count: number; total: number }>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = { count: 0, total: 0 };
    acc[r.type].count++;
    acc[r.type].total += r.amount;
    return acc;
  }, {});
  const totalDue = pending.reduce((s, r) => s + r.amount, 0);

  return (
    <Card title="Reminder Summary" subtitle="Pending financial obligations by type">
      <div className="flex justify-between items-center mb-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
        <span className="text-[13px] font-bold text-indigo-700">Total Obligations</span>
        <span className="text-[18px] font-black text-indigo-700">{formatCurrency(totalDue)}</span>
      </div>
      {Object.keys(groups).length === 0 && (
        <div className="text-center py-4 text-[13px] text-emerald-600 font-semibold">✅ No pending reminders</div>
      )}
      <div className="flex flex-col gap-2">
        {Object.entries(groups).map(([type, data]) => {
          const color = REMINDER_TYPE_COLORS[type] || "#6b7280";
          return (
            <div key={type} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                <span className="text-[12px] font-semibold text-slate-700 capitalize">{type.replace(/_/g, " ")}</span>
                <span className="text-[10px] text-slate-400">×{data.count}</span>
              </div>
              <span className="text-[13px] font-bold" style={{ color }}>{formatCurrency(data.total, true)}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
