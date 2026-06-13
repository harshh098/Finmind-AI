// FILE: frontend/components/dashboard/AIRecommendations.tsx
"use client";
import Link from "next/link";
import Card from "@/components/ui/Card";
import { useBankingStore } from "@/lib/store";
import { useT } from "@/lib/i18n";

export default function AIRecommendations() {
  const { transactions, reminders } = useBankingStore();
  const t = useT();
  const income       = transactions.filter(tx => tx.type === "deposit").reduce((s, tx) => s + tx.amount, 0);
  const expense      = transactions.filter(tx => tx.type !== "deposit").reduce((s, tx) => s + tx.amount, 0);
  const savingsRate  = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;
  const fraudCount   = transactions.filter(tx => tx.is_flagged).length;
  const pendingEMIs  = reminders.filter(r => r.type === "emi" && r.status === "pending").length;

  const recs = [
    {
      icon: "💰",
      title: savingsRate >= 20 ? "Great savings rate!" : "Boost your savings",
      desc: savingsRate >= 20
        ? `Your ${savingsRate}% savings rate is above the 20% benchmark. Keep it up!`
        : `Savings rate is ${savingsRate}%. Try automating transfers to savings on salary day.`,
      href: "/financial-insights",
      color: savingsRate >= 20 ? "#10b981" : "#f59e0b",
    },
    {
      icon: "📈",
      title: "Increase SIP Allocation",
      desc: "Consider raising your monthly SIP by 10% each year to beat inflation via compounding.",
      href: "/reminders",
      color: "#818cf8",
    },
    {
      icon: fraudCount > 0 ? "🚨" : "🛡️",
      title: fraudCount > 0 ? `${fraudCount} fraud alert${fraudCount > 1 ? "s" : ""} detected` : "Account looks safe",
      desc: fraudCount > 0
        ? "Review flagged transactions on the fraud detection page immediately."
        : "No suspicious activity detected. All transfers require OTP verification.",
      href: "/fraud-detection",
      color: fraudCount > 0 ? "#ef4444" : "#10b981",
    },
    {
      icon: "📅",
      title: pendingEMIs > 0 ? `${pendingEMIs} EMI${pendingEMIs > 1 ? "s" : ""} upcoming` : "Check reminders",
      desc: pendingEMIs > 0
        ? "Upcoming EMI payments detected. Ensure sufficient balance to avoid penalties."
        : "Set reminders for EMIs, SIPs, and insurance premiums to never miss a deadline.",
      href: "/reminders",
      color: pendingEMIs > 0 ? "#ef4444" : "#06b6d4",
    },
  ];

  return (
    <Card title="🤖 AI Agent Recommendations" subtitle="Personalized insights from FinMind AI">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {recs.map((r, i) => (
          <div key={i} className="p-3 rounded-xl border flex flex-col gap-2"
               style={{ background: r.color + "0d", borderColor: r.color + "33" }}>
            <span className="text-xl">{r.icon}</span>
            <div className="text-[13px] font-bold text-slate-800">{r.title}</div>
            <div className="text-[11px] text-slate-500 leading-relaxed flex-1">{r.desc}</div>
            <Link href={r.href} className="text-[11px] font-semibold hover:underline" style={{ color: r.color }}>
              Explore →
            </Link>
          </div>
        ))}
      </div>
    </Card>
  );
}
