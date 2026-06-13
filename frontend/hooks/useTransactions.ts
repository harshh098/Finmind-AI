"use client";
import { useEffect, useState, useCallback } from "react";
import { bankingApi } from "@/lib/api";
import { useBankingStore } from "@/lib/store";

export function useTransactions(limit = 200, type?: string) {
  const { transactions, setTransactions } = useBankingStore();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await bankingApi.getTransactions(limit, type);
      setTransactions(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load transactions");
    } finally { setLoading(false); }
  }, [limit, type]);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("finmind_token")) refresh();
  }, [refresh]);

  return { transactions, loading, error, refresh };
}
