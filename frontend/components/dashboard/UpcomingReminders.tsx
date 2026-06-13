// FILE: frontend/components/dashboard/UpcomingReminders.tsx
"use client";
import Link from "next/link";
import Card from "@/components/ui/Card";
import { useBankingStore } from "@/lib/store";
import { REMINDER_TYPE_COLORS, REMINDER_TYPE_ICONS, formatCurrency } from "@/lib/utils";

export default function UpcomingReminders() {
  const { reminders } = useBankingStore();
  const upcoming = [...reminders]
    .filter(r => r.status === "pending")
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .slice(0, 4);
  const totalDue = upcoming.reduce((s, r) => s + r.amount, 0);

  return (
    <Card
      title="📅 Upcoming Reminders"
      subtitle={`${upcoming.length} due soon · Total: ${formatCurrency(totalDue, true)}`}
      action={
        <Link href="/reminders" className="text-[12px] text-indigo-600 font-semibold hover:underline">
          View all →
        </Link>
      }
    >
      <div className="flex flex-col gap-2.5">
        {upcoming.map(r => {
          const color = REMINDER_TYPE_COLORS[r.type] || "#6b7280";
          const icon  = REMINDER_TYPE_ICONS[r.type]  || "📌";
          return (
            <div key={r.rid} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                   style={{ background: color + "18" }}>{icon}</div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-slate-800 truncate">{r.task}</div>
                <div className="text-[11px] text-slate-400">{String(r.date)} · {r.type.replace(/_/g, " ")}</div>
              </div>
              {r.amount > 0 && (
                <span className="text-[13px] font-bold flex-shrink-0" style={{ color }}>
                  {formatCurrency(r.amount, true)}
                </span>
              )}
            </div>
          );
        })}
        {upcoming.length === 0 && (
          <div className="text-center py-4 text-[13px] text-emerald-600 font-semibold">✅ No upcoming reminders</div>
        )}
      </div>
    </Card>
  );
}
