"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUIStore, useBankingStore, useAuthStore } from "@/lib/store";
import { cn, formatCurrency } from "@/lib/utils";
import { useT } from "@/lib/i18n";

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar, language } = useUIStore();
  const { balance, accountNo } = useBankingStore();
  const { user, logout } = useAuthStore();
  const pathname = usePathname();
  const router   = useRouter();
  const t = useT();

  const NAV = [
    { href:"/",                   icon:"⬡",  label:t("dashboard")         },
    { href:"/accounts",           icon:"🏦", label:t("accounts")          },
    { href:"/transactions",       icon:"↔",  label:t("transactions")      },
    { href:"/ai-assistant",       icon:"🤖", label:t("aiAssistant")       },
    { href:"/expense-tracker",    icon:"📊", label:t("expenseTracker")    },
    { href:"/fraud-detection",    icon:"🛡", label:t("fraudDetection")    },
    { href:"/financial-insights", icon:"💡", label:t("financialInsights") },
    { href:"/reminders",          icon:"📅", label:t("reminders")         },
    { href:"/settings",           icon:"⚙", label:t("settings")          },
  ];

  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  function handleSignOut() {
    localStorage.removeItem("finmind_token");
    document.cookie = "finmind_auth=; path=/; max-age=0";
    logout();
    router.replace("/login");
  }

  // Sidebar already uses dark bg via `.sidebar` CSS class — we extend with dark: variants
  // for any inline colors that need adjusting.
  return (
    <aside className="sidebar flex flex-col py-4 z-30" style={{ width: sidebarOpen ? 220 : 56 }}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 pb-4 mb-2 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-base flex-shrink-0 shadow">⬡</div>
        {sidebarOpen && (
          <div>
            <div className="text-[13px] font-bold text-white tracking-tight">FinMind AI</div>
            <div className="text-[10px] text-slate-500 leading-none">Banking Assistant</div>
          </div>
        )}
      </div>

      {/* Balance chip */}
      {sidebarOpen && (
        <div className="mx-3 mb-3 px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
          <div className="text-[10px] text-indigo-400 font-medium uppercase tracking-wider">{t("balance")}</div>
          <div className="text-[15px] font-bold text-white mt-0.5">{formatCurrency(balance, true)}</div>
          {accountNo && <div className="text-[9px] text-slate-500 mt-0.5">{accountNo}</div>}
        </div>
      )}

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 px-2 flex-1">
        {NAV.map(item => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} title={!sidebarOpen ? item.label : undefined}
              className={cn("nav-item", active && "active", !sidebarOpen && "justify-center")}>
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {sidebarOpen && <span className="truncate text-[13px]">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User info + Sign Out + collapse */}
      <div className="px-2 mt-2 border-t border-white/10 pt-3 flex flex-col gap-2">
        {sidebarOpen && (
          <div className="flex items-center gap-2 px-1">
            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">{initials}</div>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-semibold text-white truncate">{user?.name || "Demo User"}</div>
              <div className="text-[10px] text-slate-500 truncate">{user?.email || ""}</div>
            </div>
          </div>
        )}

        <button onClick={handleSignOut} title={t("signOut")}
          className={cn("w-full flex items-center gap-2 py-1.5 px-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-[12px] font-medium", !sidebarOpen && "justify-center")}>
          <span className="text-[14px]">⏻</span>
          {sidebarOpen && <span>{t("signOut")}</span>}
        </button>

        <button onClick={toggleSidebar}
          className="w-full flex items-center justify-center py-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all text-sm">
          {sidebarOpen ? "⟨" : "⟩"}
        </button>
      </div>
    </aside>
  );
}