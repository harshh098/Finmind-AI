// FILE: frontend/hooks/useChat.ts
"use client";
import { useChatStore, useBankingStore } from "@/lib/store";
import { agentApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

export function useChat() {
  const { messages, isLoading, agentSteps, addMessage, setLoading, setAgentSteps } = useChatStore();
  const { balance, transactions, reminders } = useBankingStore();

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading) return;
    addMessage({ role: "user", text, timestamp: new Date().toISOString() });
    setLoading(true); setAgentSteps([]);

    // Try real backend first
    try {
      const res  = await agentApi.query(text);
      const data = res.data;
      if (data.steps?.length) setAgentSteps(data.steps);
      addMessage({ role: "assistant", text: data.response || "No response.", timestamp: new Date().toISOString() });
      setLoading(false); return;
    } catch { /* fallback below */ }

    // Local fallback using real store data
    const q = text.toLowerCase();
    let response = "";

    if (q.includes("balance") || q.includes("how much")) {
      const income  = transactions.filter(t => t.type === "deposit").reduce((s,t) => s+t.amount, 0);
      const expense = transactions.filter(t => t.type !== "deposit").reduce((s,t) => s+t.amount, 0);
      response = `Your current balance is ${formatCurrency(balance)}.\n\nIncome: ${formatCurrency(income)}\nExpense: ${formatCurrency(expense)}\nNet Savings: ${formatCurrency(income - expense)}`;
    } else if (q.includes("fraud") || q.includes("suspicious")) {
      const flagged = transactions.filter(t => t.is_flagged);
      response = `Fraud scan: ${transactions.length} transactions analyzed.\nFlagged: ${flagged.length}\nRisk: ${flagged.length > 2 ? "HIGH 🔴" : flagged.length > 0 ? "MEDIUM 🟡" : "LOW 🟢"}`;
    } else if (q.includes("remind") || q.includes("emi")) {
      const pending = reminders.filter(r => r.status === "pending");
      const total   = pending.reduce((s,r) => s+r.amount, 0);
      response = `Upcoming Reminders: ${pending.length} pending\nTotal obligations: ${formatCurrency(total)}\n\n${pending.slice(0,4).map(r => `• [${r.type.toUpperCase()}] ${r.task} — ${formatCurrency(r.amount)} on ${r.date}`).join("\n") || "None"}`;
    } else {
      response = "I'm your FinMind AI assistant. Ask me about your balance, transactions, fraud alerts, or reminders!";
    }

    addMessage({ role: "assistant", text: response, timestamp: new Date().toISOString() });
    setLoading(false);
  }

  return { messages, isLoading, agentSteps, sendMessage };
}
