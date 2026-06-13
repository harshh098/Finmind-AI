// FILE: frontend/components/reminders/ReminderCard.tsx
"use client";
import Pill from "@/components/ui/Pill";
import { REMINDER_TYPE_COLORS, REMINDER_TYPE_ICONS, formatCurrency, formatTime } from "@/lib/utils";
import type { Reminder } from "@/lib/store";

interface Props {
  reminder: Reminder;
  onDelete:   (rid: number) => void;
  onComplete: (rid: number) => void;
}

export default function ReminderCard({ reminder: r, onDelete, onComplete }: Props) {
  const color = REMINDER_TYPE_COLORS[r.type] || "#6b7280";
  const icon  = REMINDER_TYPE_ICONS[r.type]  || "📌";
  const isDone = r.status === "completed" || r.status === "done";

  return (
    <div
      className={`rounded-xl border p-3.5 flex flex-col gap-2 ${isDone ? "opacity-60" : ""}`}
      style={{ background: color + "0e", borderColor: color + "33" }}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <Pill label={r.type.replace(/_/g, " ")} color={color} size="md" />
        </div>
        <div className="flex items-center gap-1.5">
          {!isDone && (
            <button
              onClick={() => onComplete(r.rid)}
              title="Mark complete"
              className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-emerald-100 transition-colors"
            >✓</button>
          )}
          <button
            onClick={() => onDelete(r.rid)}
            title="Delete"
            className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 transition-colors"
          >✕</button>
        </div>
      </div>

      <div className="text-[13px] font-bold text-slate-800">{r.task}</div>

      {r.amount > 0 && (
        <div className="text-[16px] font-bold" style={{ color }}>
          {formatCurrency(r.amount)}
        </div>
      )}

      <div className="text-[11px] text-slate-500">
        📅 {String(r.date)} at {typeof r.time === "string" ? r.time : formatTime(String(r.time))}
      </div>
      {r.related_to && <div className="text-[11px] text-slate-400">🔗 {r.related_to}</div>}
      <div className="flex items-center justify-between">
        <div className="text-[10px]" style={{ color }}>🔔 {r.notify_before_min} min before</div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          isDone ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
        }`}>{isDone ? "✓ Done" : "Pending"}</span>
      </div>
    </div>
  );
}
