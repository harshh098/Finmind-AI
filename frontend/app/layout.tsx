"use client";
import "@/styles/globals.css";
import { Inter } from "next/font/google";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { useBankingStore, useAuthStore, useUIStore } from "@/lib/store";
import { bankingApi, remindersApi, authApi } from "@/lib/api";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const {
    setTransactions,
    setReminders,
    setBalance,
    setAccountNo,
    setAccountType,
  } = useBankingStore();

  const theme = useUIStore((s) => s.theme);

  const { isAuthenticated, logout, setUser } = useAuthStore();

  const router = useRouter();
  const pathname = usePathname();

  const isPublic = pathname === "/login" || pathname === "/register";

  // Dark mode sync
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("finmind_token");

    if (!token && !isPublic) {
      router.replace("/login");
      return;
    }

    if (!token) return;

    document.cookie = `finmind_auth=${token}; path=/; max-age=86400`;

    authApi
      .me()
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem("finmind_token");
        document.cookie = "finmind_auth=; path=/; max-age=0";
        logout();
        router.replace("/login");
      });

    Promise.all([
      bankingApi.getBalance(),
      bankingApi.getTransactions(50),
      remindersApi.getAll(),
    ])
      .then(([bal, txs, rems]) => {
        setBalance(parseFloat(bal.data.balance));
        if (bal.data.account_no) setAccountNo(bal.data.account_no);
        if (bal.data.account_type) setAccountType(bal.data.account_type);
        setTransactions(txs.data);
        setReminders(rems.data);
      })
      .catch(() => {});
  }, [isAuthenticated, pathname]);

  if (isPublic) {
    return (
      <html lang="en">
        <head>
          <title>FinMind AI — Login</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body className={inter.className}>{children}</body>
      </html>
    );
  }

  return (
    <html lang="en">
      <head>
        <title>FinMind AI — Banking Assistant</title>
        <meta name="description" content="Agentic AI Banking Assistant" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>

      <body className={`${inter.className} ${theme === "dark" ? "dark" : ""}`}>
        {/* bg-slate-100 in light, bg-slate-950 in dark */}
        <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-slate-950">
          <Sidebar />

          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <Header />

            <main className="flex-1 overflow-y-auto p-4 lg:p-5">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}