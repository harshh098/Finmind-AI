// FILE: frontend/components/ai/QuickActions.tsx
"use client";
import { useChatStore } from "@/lib/store";

const ACTIONS = [
  { label:"💰 Check Balance",        query:"What is my current account balance?"            },
  { label:"📊 Expense Analysis",      query:"Analyze my spending by category"                },
  { label:"🚨 Fraud Alerts",          query:"Show me any suspicious transactions"            },
  { label:"📅 Upcoming EMIs",         query:"What reminders and EMIs are due this month?"   },
  { label:"💡 Financial Advice",      query:"Give me personalized financial advice"          },
  { label:"📚 What is SIP?",          query:"What is a Systematic Investment Plan (SIP)?"   },
  { label:"🏦 Explain NEFT vs RTGS",  query:"What is the difference between NEFT and RTGS?" },
  { label:"⭐ Improve CIBIL Score",   query:"How can I improve my CIBIL credit score?"      },
];

export default function QuickActions() {
  const { addMessage } = useChatStore();

  function handleAction(query: string) {
    addMessage({ role:"user", text:query, timestamp:new Date().toISOString() });
    // The ChatPanel picks this up via useChatStore and processes it
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {ACTIONS.map(a => (
        <button
          key={a.label}
          onClick={() => handleAction(a.query)}
          className="text-left px-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 text-[12px] font-semibold text-slate-700 hover:text-indigo-700 transition-all"
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}
