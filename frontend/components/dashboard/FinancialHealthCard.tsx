// FILE: frontend/components/dashboard/FinancialHealthCard.tsx
"use client";
import Card from "@/components/ui/Card";
import HealthScore from "@/components/ui/HealthScore";
import { useBankingStore } from "@/lib/store";

export default function FinancialHealthCard() {
  const { transactions, reminders } = useBankingStore();
  const income  = transactions.filter(t => t.type === "deposit" && t.status === "completed").reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type !== "deposit" && t.status === "completed").reduce((s, t) => s + t.amount, 0);
  const savingsRate   = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;
  const fraudCount    = transactions.filter(t => t.is_flagged).length;
  const reminderCount = reminders.filter(r => r.status === "pending").length;
  const savingsScore  = Math.min(60, savingsRate * 1.5);
  const fraudScore    = Math.max(0, 20 - fraudCount * 4);
  const reminderScore = reminderCount < 8 ? 20 : 10;
  const health        = Math.min(100, Math.round(savingsScore + fraudScore + reminderScore));

  return (
    <Card title="Financial Health" subtitle="Overall score" className="flex-1 min-w-[160px]">
      <div className="flex justify-center mb-4">
        <HealthScore score={health} size={90} />
      </div>
      <div className="flex flex-col gap-2">
        {[
          { label: "Savings Rate",     value: `${savingsRate}%`,     ok: savingsRate >= 20 },
          { label: "Fraud Risk",       value: fraudCount > 2 ? "High" : "Low", ok: fraudCount <= 2 },
          { label: "Active Reminders", value: String(reminderCount), ok: reminderCount < 10 },
          { label: "Transactions",     value: String(transactions.length), ok: true },
        ].map(m => (
          <div key={m.label} className="flex justify-between items-center text-[12px]">
            <span className="text-slate-500">{m.label}</span>
            <span className={`font-semibold ${m.ok ? "text-emerald-600" : "text-red-500"}`}>{m.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
