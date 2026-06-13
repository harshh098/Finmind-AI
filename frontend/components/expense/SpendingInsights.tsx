// FILE: frontend/components/expense/SpendingInsights.tsx
"use client";
import Card from "@/components/ui/Card";
import { useBankingStore } from "@/lib/store";
import { CATEGORY_COLORS, formatCurrency } from "@/lib/utils";
import { computeDynamicBudgets, getMoMInsights } from "@/lib/budgets";

// Per-category actionable advice shown when over budget
const CATEGORY_ADVICE: Record<string, string> = {
  Food:          "Try meal-prepping or limiting restaurant visits to weekends.",
  Shopping:      "Use a 24-hour rule before online purchases to cut impulse buys.",
  Entertainment: "Audit subscriptions — cancel unused streaming or gaming services.",
  Transport:     "Combine errands or use public transit for short distances.",
  Groceries:     "Stick to a weekly list; avoid shopping when hungry.",
  General:       "Tag 'General' expenses with a specific category for better visibility.",
  Cash:          "Limit ATM withdrawals — cash spending is harder to track.",
  Gifts:         "Set a gift budget at the start of the year and stick to it.",
  Education:     "Prioritise free resources (YouTube, docs) before paid courses.",
  Healthcare:    "Consider a preventive care plan to spread costs.",
  Rent:          "Explore co-living or negotiating lease terms at renewal.",
  Loan:          "Review if refinancing could reduce your EMI burden.",
};

export default function SpendingInsights() {
  const { transactions } = useBankingStore();

  const income  = transactions.filter(t => t.type === "deposit").reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type !== "deposit").reduce((s, t) => s + t.amount, 0);
  const sr      = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;

  const byCat: Record<string, number> = {};
  for (const t of transactions) {
    if (t.type === "deposit") continue;
    const c = t.category || "General";
    byCat[c] = (byCat[c] || 0) + t.amount;
  }

  const dynamicBudgets = computeDynamicBudgets(transactions);
  const monthCount     = new Set(transactions.map(t => t.date.slice(0, 7))).size || 1;
  const avgMonthly     = expense > 0 ? Math.round(expense / monthCount) : 0;
  const topCat         = Object.entries(byCat).sort(([, a], [, b]) => b - a)[0];

  // Overspending categories sorted by worst offender first
  const overBudget = Object.entries(byCat)
    .filter(([k, v]) => k in dynamicBudgets && v > dynamicBudgets[k])
    .sort(([, a], [, b]) => b - a);

  // Month-over-month insights from the budgets helper
  const momInsights = getMoMInsights(transactions);

  // --- Build insight cards ---
  type Insight = { icon: string; text: string; color: string };
  const insights: Insight[] = [];

  // 1. Savings-rate insight
  if (income === 0) {
    insights.push({
      icon: "💡",
      text: "No transactions yet. Deposit funds to see personalised spending insights.",
      color: "#6366f1",
    });
  } else if (sr > 35) {
    insights.push({
      icon: "🏆",
      text: `Exceptional savings rate of ${sr}%! Consider stepping up SIP contributions or opening an FD for the surplus.`,
      color: "#10b981",
    });
  } else if (sr > 20) {
    insights.push({
      icon: "✅",
      text: `Savings rate ${sr}% — above the recommended 20% benchmark. You're on track; review investment allocations annually.`,
      color: "#10b981",
    });
  } else if (sr > 10) {
    insights.push({
      icon: "⚠️",
      text: `Savings rate ${sr}% is below the 20% target. Try the 50/30/20 rule: 50% needs, 30% wants, 20% savings.`,
      color: "#f59e0b",
    });
  } else {
    const targetSave = Math.max(500, Math.round((income * 0.1) / monthCount));
    insights.push({
      icon: "🔴",
      text: `Savings rate ${sr}% is critically low. Automate at least ${formatCurrency(targetSave)}/month into a savings account before spending.`,
      color: "#ef4444",
    });
  }

  // 2. Top category
  if (topCat) {
    insights.push({
      icon: "📊",
      text: `Highest spend: ${topCat[0]} at ${formatCurrency(topCat[1])} — ${expense > 0 ? Math.round((topCat[1] / expense) * 100) : 0}% of total outflows.`,
      color: CATEGORY_COLORS[topCat[0]] || "#6366f1",
    });
  }

  // 3. Personalised over-budget insights (top 3 worst offenders)
  for (const [cat, spent] of overBudget.slice(0, 3)) {
    const budget  = dynamicBudgets[cat];
    const pctOver = Math.round(((spent - budget) / budget) * 100);
    const advice  = CATEGORY_ADVICE[cat] ?? "Review recent transactions in this category.";
    insights.push({
      icon: "🔴",
      text: `${cat} is ${pctOver}% over your personalised budget of ${formatCurrency(budget)} (spent ${formatCurrency(spent)}). ${advice}`,
      color: "#ef4444",
    });
  }

  if (overBudget.length === 0 && income > 0) {
    insights.push({
      icon: "🟢",
      text: "All tracked categories are within your personalised budget limits. Excellent discipline!",
      color: "#10b981",
    });
  }

  // 4. Average monthly expense
  if (avgMonthly > 0) {
    insights.push({
      icon: "📅",
      text: `Average monthly expense: ${formatCurrency(avgMonthly)} across ${monthCount} month${monthCount > 1 ? "s" : ""} tracked.`,
      color: "#06b6d4",
    });
  }

  // 5. Month-over-month insights
  for (const text of momInsights) {
    insights.push({ icon: "", text, color: "#818cf8" });
  }

  return (
    <Card title="💡 Spending Insights" subtitle="Personalised from your transaction history">
      <div className="flex flex-col gap-3">
        {insights.map((ins, i) => (
          <div
            key={i}
            className="flex gap-3 items-start p-3 rounded-xl border"
            style={{ background: ins.color + "0d", borderColor: ins.color + "30" }}
          >
            {ins.icon && <span className="text-lg flex-shrink-0">{ins.icon}</span>}
            <p className="text-[12px] text-slate-700 leading-relaxed">{ins.text}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}