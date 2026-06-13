"use client";
import { useEffect, useState, useCallback } from "react";
import { bankingApi } from "@/lib/api";
import { useBankingStore } from "@/lib/store";

export function useBalance() {
  const { balance, setBalance, setAccountNo, setAccountType } = useBankingStore();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await bankingApi.getBalance();
      setBalance(parseFloat(res.data.balance));
      if (res.data.account_no)   setAccountNo(res.data.account_no);
      if (res.data.account_type) setAccountType(res.data.account_type);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to fetch balance");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("finmind_token")) refresh();
  }, [refresh]);

  return { balance, loading, error, refresh };
}
