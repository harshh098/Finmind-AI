// FILE: frontend/hooks/useFraud.ts
"use client";
import { useEffect, useState, useCallback } from "react";
import { fraudApi } from "@/lib/api";

export interface FraudFlag { rule_id: string; rule: string; severity: string; weight: number; }
export interface FraudAlert {
  transaction_id: number; type: string; amount: number;
  receiver?: string; sender?: string; date: string;
  risk_score: number; ml_score: number; flags: FraudFlag[];
  flag_ids: string[]; max_severity: string; action: string;
}
export interface FraudReport {
  total_transactions: number; flagged_count: number;
  high_risk: number; medium_risk: number; low_risk: number;
  blocked_count: number; warning_count: number;
  alerts: FraudAlert[]; overall_risk: string;
  ml_model_trained: boolean; ml_sample_count: number;
}

const EMPTY: FraudReport = {
  total_transactions:0, flagged_count:0, high_risk:0, medium_risk:0, low_risk:0,
  blocked_count:0, warning_count:0, alerts:[], overall_risk:"LOW",
  ml_model_trained:false, ml_sample_count:0,
};

export function useFraud() {
  const [report,  setReport]  = useState<FraudReport>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try { setReport((await fraudApi.getReport()).data); }
    catch (e: any) { setError(e?.response?.data?.detail || "Failed to load fraud report"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("finmind_token")) refresh();
  }, [refresh]);

  return { report, loading, error, refresh };
}
