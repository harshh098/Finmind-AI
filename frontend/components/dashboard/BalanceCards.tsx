"use client";
import MetricCard from "@/components/ui/MetricCard";
import { useBankingStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import { useEffect } from "react";
import { analyticsApi } from "@/lib/api";

export default function BalanceCards() {
  const { balance, transactions, setBalance } = useBankingStore();

  // Derive income/expense from real transactions
  const totalIncome  = transactions.filter(t => t.type === "deposit" && t.status === "completed").reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type !== "deposit" && t.status === "completed").reduce((s, t) => s + t.amount, 0);
  const savings      = totalIncome - totalExpense;
  const savingsRate  = totalIncome > 0 ? Math.round((savings / totalIncome) * 100) : 0;

  return (
    <div className="flex gap-3 flex-wrap">
      <MetricCard
        label="Total Balance"
        value={formatCurrency(balance, true)}
        sub="Live account balance"
        trend="up"
        color="#818cf8"
        icon="💰"
      />
      <MetricCard
        label="Total Income"
        value={formatCurrency(totalIncome, true)}
        sub={`${transactions.filter(t => t.type === "deposit").length} deposits`}
        trend="up"
        color="#10b981"
        icon="↑"
      />
      <MetricCard
        label="Total Expense"
        value={formatCurrency(totalExpense, true)}
        sub="All outflows"
        trend="down"
        color="#f59e0b"
        icon="↓"
      />
      <MetricCard
        label="Net Savings"
        value={formatCurrency(savings, true)}
        sub={`${savingsRate}% savings rate`}
        trend={savings >= 0 ? "up" : "down"}
        color="#06b6d4"
        icon="📈"
      />
    </div>
  );
}
