// FILE: frontend/app/page.tsx
"use client";
import BalanceCards from "@/components/dashboard/BalanceCards";
import CashFlowChart from "@/components/dashboard/CashFlowChart";
import SpendingDonut from "@/components/dashboard/SpendingDonut";
import FinancialHealthCard from "@/components/dashboard/FinancialHealthCard";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import FraudMonitor from "@/components/dashboard/FraudMonitor";
import AIRecommendations from "@/components/dashboard/AIRecommendations";
import UpcomingReminders from "@/components/dashboard/UpcomingReminders";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-4 animate-slide-up">
      {/* Row 1: Metric Cards */}
      <BalanceCards />

      {/* Row 2: Cash Flow + Donut + Health */}
      <div className="flex gap-4 flex-wrap">
        <CashFlowChart />
        <SpendingDonut />
        <FinancialHealthCard />
      </div>

      {/* Row 3: Recent Transactions + Fraud Monitor */}
      <div className="flex gap-4 flex-wrap">
        <RecentTransactions />
        <FraudMonitor />
      </div>

      {/* Row 4: Quick Transfer + Upcoming Reminders */}
      <div className="flex gap-4 flex-wrap">
        <UpcomingReminders />
      </div>

      {/* Row 5: AI Recommendations */}
      <AIRecommendations />
    </div>
  );
}
