// FILE: frontend/app/expense-tracker/page.tsx
"use client";
import MetricCard from "@/components/ui/MetricCard";
import BudgetTracker from "@/components/expense/BudgetTracker";
import MonthlyTrends from "@/components/expense/MonthlyTrends";
import CategoryBreakdown from "@/components/expense/CategoryBreakdown";
import SpendingInsights from "@/components/expense/SpendingInsights";
import Card from "@/components/ui/Card";
import DonutChart from "@/components/ui/DonutChart";
import { useBankingStore } from "@/lib/store";
import { CATEGORY_COLORS, formatCurrency } from "@/lib/utils";
import { computeDynamicBudgets } from "@/lib/budgets";

export default function ExpenseTrackerPage() {
  const { transactions } = useBankingStore();

  // Only status === "completed" transactions represent money that
  // actually moved — a "blocked" fraud transaction never left the
  // account, so it must never be counted as income or expense here.
  const income  = transactions.filter(t => t.type === "deposit" && t.status === "completed").reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type !== "deposit" && t.status === "completed").reduce((s, t) => s + t.amount, 0);
  const savings = income - expense;
  const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;

  // Dynamic budgets derived from this user's average monthly income
  const dynamicBudgets = computeDynamicBudgets(transactions);

  const byCat: Record<string, number> = {};
  for (const t of transactions) {
    if (t.type === "deposit" || t.status !== "completed") continue;
    const c = t.category || "General";
    byCat[c] = (byCat[c] || 0) + t.amount;
  }

  const segments = Object.entries(byCat)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([label, value]) => ({
      label,
      value,
      color: CATEGORY_COLORS[label] || "#6b7280",
    }));

  const significant = [...transactions]
    .filter(t => t.type !== "deposit" && t.status === "completed" && t.amount >= 1000)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  // Over-budget detection now uses dynamic budgets
  const overBudget = Object.entries(byCat)
    .filter(([k, v]) => k in dynamicBudgets && v > dynamicBudgets[k])
    .map(([k, v]) => ({
      cat: k,
      spent: v,
      budget: dynamicBudgets[k],
      over: v - dynamicBudgets[k],
    }))
    .sort((a, b) => b.over - a.over);

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col gap-4 animate-slide-up">
        <div className="flex gap-3 flex-wrap">
          <MetricCard label="Total Income"  value="₹0" sub="No deposits yet"   color="#10b981" icon="↑" />
          <MetricCard label="Total Expense" value="₹0" sub="No outflows yet"   color="#ef4444" icon="↓" />
          <MetricCard label="Net Savings"   value="₹0" sub="0% rate"           color="#06b6d4" icon="💰" />
          <MetricCard label="Savings Rate"  value="0%" sub="Start transacting" color="#f59e0b" icon="📈" />
        </div>
        <div className="flex items-center justify-center h-48 bg-white rounded-xl border border-slate-200 text-[14px] text-slate-400">
          Deposit or transfer funds to see expense analytics.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 animate-slide-up">
      {/* Summary Cards */}
      <div className="flex gap-3 flex-wrap">
        <MetricCard label="Total Income"  value={formatCurrency(income, true)}  sub="All deposits"  trend="up"   color="#10b981" icon="↑" />
        <MetricCard label="Total Expense" value={formatCurrency(expense, true)} sub="All outflows"  trend="down" color="#ef4444" icon="↓" />
        <MetricCard label="Net Savings"   value={formatCurrency(savings, true)} sub={`${savingsRate}% rate`} trend={savings >= 0 ? "up" : "down"} color="#06b6d4" icon="💰" />
        <MetricCard
          label="Savings Rate"
          value={`${savingsRate}%`}
          sub={savingsRate >= 20 ? "On track ✓" : "Below 20% target"}
          color={savingsRate >= 20 ? "#10b981" : "#f59e0b"}
          icon="📈"
        />
      </div>

      {/* Budget + Donut */}
      <div className="flex gap-4 flex-wrap">
        <BudgetTracker />
        <div className="flex flex-col gap-4 flex-1 min-w-[200px]">
          <Card title="Category Split" subtitle="Expense breakdown">
            {segments.length > 0
              ? <div className="flex justify-center"><DonutChart segments={segments} size={130} showLegend /></div>
              : <div className="text-[13px] text-slate-400 text-center py-6">No expense data yet</div>
            }
          </Card>
          {overBudget.length > 0 && (
            <Card title="⚠ Over Budget" subtitle="Categories exceeding your personalised monthly limit">
              <div className="flex flex-col gap-2">
                {overBudget.map(({ cat, over, budget }) => (
                  <div key={cat} className="flex justify-between items-center p-2 bg-red-50 rounded-lg border border-red-100 text-[12px]">
                    <div>
                      <span className="font-semibold text-red-700">{cat}</span>
                      <div className="text-[10px] text-red-400">Budget: {formatCurrency(budget, true)}</div>
                    </div>
                    <span className="text-red-500 font-bold">+{formatCurrency(over, true)} over</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Monthly Trends */}
      <MonthlyTrends />

      {/* Significant Transactions */}
      {significant.length > 0 && (
        <Card title="Significant Transactions" subtitle="High-value outflows (≥ ₹1,000)">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {significant.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                  style={{ background: (CATEGORY_COLORS[t.category || "General"] || "#6b7280") + "20" }}
                >
                  {t.type === "transfer" ? "↗" : "↓"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-slate-800 truncate">{t.message || t.receiver}</div>
                  <div className="text-[11px] text-slate-400">{t.date} · {t.category}</div>
                </div>
                <div className="text-[13px] font-bold text-red-500 flex-shrink-0">
                  −{formatCurrency(t.amount, true)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Category Breakdown + Insights */}
      <div className="flex gap-4 flex-wrap">
        <CategoryBreakdown />
        <SpendingInsights />
      </div>
    </div>
  );
}