"use client";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Pill from "@/components/ui/Pill";
import { useBankingStore } from "@/lib/store";
import { CATEGORY_COLORS, TYPE_ICONS, formatCurrency } from "@/lib/utils";

export default function RecentTransactions() {
  const { transactions } = useBankingStore();

  const recent = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 7);

  return (
    <Card
      title="Recent Transactions"
      subtitle="Latest account activity"
      action={
        <Link href="/transactions" className="text-[12px] text-indigo-600 hover:text-indigo-800 font-semibold">
          View all →
        </Link>
      }
      className="flex-[2] min-w-[280px]"
    >
      <div className="flex flex-col gap-2.5">
        {recent.length === 0 && (
          <div className="text-center py-8 text-[13px] text-slate-400">No transactions yet.</div>
        )}
        {recent.map((t) => {
          const isDebit  = t.type !== "deposit";
          const cat      = t.category || (t.type === "transfer" ? "Transfer" : t.type === "deposit" ? "Income" : "Cash");
          const catColor = CATEGORY_COLORS[cat] || "#6b7280";
          return (
            <div key={t.id} className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                style={{ background: catColor + "18" }}
              >
                {TYPE_ICONS[t.type] || "•"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-slate-800 truncate">
                  {t.message || `${t.type} — ${isDebit ? t.receiver : t.sender}`}
                </div>
                <div className="text-[11px] text-slate-400">
                  {isDebit ? t.receiver : t.sender} · {t.date}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className={`text-[13px] font-bold ${isDebit ? "text-red-500" : "text-emerald-600"}`}>
                  {isDebit ? "−" : "+"}
                  {formatCurrency(t.amount)}
                </div>
                <Pill
                  label={t.type}
                  color={t.type === "deposit" ? "#10b981" : t.type === "transfer" ? "#6366f1" : "#f59e0b"}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
