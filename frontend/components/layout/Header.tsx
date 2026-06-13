"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useBankingStore, useAuthStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { formatCurrency } from "@/lib/utils";
import NotificationBell from "@/components/ui/NotificationBell";
import { authApi } from "@/lib/api";

const PAGE_TITLES: Record<string, { en: string; hi: string }> = {
  "/":                   { en: "Dashboard",          hi: "डैशबोर्ड"       },
  "/accounts":           { en: "Accounts",           hi: "खाता"           },
  "/transactions":       { en: "Transactions",       hi: "लेनदेन"         },
  "/ai-assistant":       { en: "AI Assistant",       hi: "AI सहायक"       },
  "/expense-tracker":    { en: "Expense Tracker",    hi: "खर्च ट्रैकर"    },
  "/fraud-detection":    { en: "Fraud Detection",    hi: "धोखाधड़ी जांच"  },
  "/financial-insights": { en: "Financial Insights", hi: "वित्तीय जानकारी" },
  "/reminders":          { en: "Reminders",          hi: "रिमाइंडर"       },
  "/settings":           { en: "Settings",           hi: "सेटिंग्स"        },
};

export default function Header() {
  const pathname  = usePathname();
  const router    = useRouter();
  const { balance, accountNo, transactions } = useBankingStore();
  const { user, logout } = useAuthStore();
  const t = useT();

  const stored = typeof window !== "undefined"
    ? JSON.parse(localStorage.getItem("finmind-ui") || "{}")
    : {};
  const lang: "en" | "hi" = stored?.state?.language === "hi" ? "hi" : "en";
  const pageInfo   = PAGE_TITLES[pathname] ?? { en: "FinMind AI", hi: "FinMind AI" };
  const title      = pageInfo[lang];
  const fraudCount = transactions.filter(tx => tx.is_flagged).length;
  const initials   = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  function handleSignOut() {
    localStorage.removeItem("finmind_token");
    logout();
    authApi.logout();
    router.push("/login");
  }

  return (
    <header
      className="flex items-center justify-between bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-5 flex-shrink-0"
      style={{ height: 56 }}
    >
      <div>
        <h1 className="text-[17px] font-bold text-slate-900 dark:text-white tracking-tight">{title}</h1>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-none mt-0.5">
          {accountNo ? `Account #${accountNo}` : "FinMind AI"} · {t("balance")}: {formatCurrency(balance)}
        </p>
      </div>

      <div className="flex items-center gap-2">
        {fraudCount > 0 && (
          <Link
            href="/fraud-detection"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-800/50 text-red-600 dark:text-red-400 text-[11px] font-semibold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
          >
            🚨 {fraudCount} {lang === "hi" ? "अलर्ट" : "alerts"}
          </Link>
        )}

        <NotificationBell />

        <Link
          href="/ai-assistant"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-semibold rounded-lg transition-colors"
        >
          <span>🤖</span>
          <span className="hidden sm:inline">{lang === "hi" ? "AI पूछें" : "Ask AI"}</span>
        </Link>

        {/* User avatar */}
        <div
          className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-[11px] font-bold text-white cursor-default"
          title={user?.name || ""}
        >
          {initials}
        </div>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 text-[12px] font-semibold border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-800/50 transition-all"
          title={t("signOut")}
        >
          <span>⏻</span>
          <span className="hidden sm:inline">{t("signOut")}</span>
        </button>
      </div>
    </header>
  );
}