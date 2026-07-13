"use client";
import Card from "@/components/ui/Card";
import HealthScore from "@/components/ui/HealthScore";
import { useBankingStore } from "@/lib/store";

export default function FinancialHealthCard() {
  const { transactions, reminders } = useBankingStore();
  const income  = transactions.filter(t => t.type === "deposit" && t.status === "completed").reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type !== "deposit" && t.status === "completed").reduce((s, t) => s + t.amount, 0);
  const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;

  // Only count BLOCKED transactions as real fraud risk — a "warning" that
  // the user reviewed and confirmed themselves isn't an ongoing risk
  // signal, it's a resolved one-off event.
  const blockedCount  = transactions.filter(t => t.status === "blocked").length;
  const reminderCount = reminders.filter(r => r.status === "pending").length;

  // Savings: 0% rate = 30/60 (neutral, not punished), scales up to 60 at
  // a 40%+ savings rate, and down toward 0 only as the rate goes negative.
  const savingsScore = Math.max(0, Math.min(60, 30 + savingsRate * 0.75));

  // Fraud: starts at full 20, -8 per blocked transaction, floors at 0.
  const fraudScore = Math.max(0, 20 - blockedCount * 8);

  // Reminders: fewer pending = healthier. Full marks under 5, tapering to 10.
  const reminderScore = reminderCount <= 5 ? 20 : reminderCount <= 10 ? 15 : 10;

  const health = Math.max(0, Math.min(100, Math.round(savingsScore + fraudScore + reminderScore)));

  return (
    <Card title="Financial Health" subtitle="Overall score" className="flex-1 min-w-[160px]">
      <div className="flex justify-center mb-4">
        <HealthScore score={health} size={90} />
      </div>
      <div className="flex flex-col gap-2">
        {[
          { label: "Savings Rate",     value: `${savingsRate}%`,     ok: savingsRate >= 20 },
          { label: "Fraud Risk",       value: blockedCount > 0 ? "High" : "Low", ok: blockedCount === 0 },
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