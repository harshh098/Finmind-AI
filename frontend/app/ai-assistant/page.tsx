"use client";
import ChatPanel from "@/components/ai/ChatPanel";
import { useChatStore } from "@/lib/store";

const CAPABILITIES = [
  { icon: "💰", title: "Account Queries",   desc: "Balance, transactions, account details" },
  { icon: "📊", title: "Expense Analytics", desc: "Category breakdown, spending trends"    },
  { icon: "🚨", title: "Fraud Detection",   desc: "suspicious activity alerts"  },
  { icon: "📚", title: "Banking Knowledge", desc: "NEFT, UPI, SIP, EMI, FD, KYC help"  },
  { icon: "💡", title: "Financial Advice",  desc: "Personalized investment & savings tips"  },
  { icon: "📅", title: "Reminder Queries",  desc: "Upcoming EMIs, SIPs, insurance dues"    },
];

export default function AIAssistantPage() {
  const { clearChat } = useChatStore();

  return (
    <div className="flex flex-col gap-4 animate-slide-up">
      {/* Capability chips */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {CAPABILITIES.map(c => (
          <div
            key={c.title}
            className="bg-white rounded-xl border border-slate-200 p-2.5 text-center hover:border-indigo-300 transition-colors"
          >
            <div className="text-xl mb-1">{c.icon}</div>
            <div className="text-[11px] font-bold text-slate-700">{c.title}</div>
            <div className="text-[10px] text-slate-400 mt-0.5 hidden sm:block">{c.desc}</div>
          </div>
        ))}
      </div>

      {/* Chat — full width */}
      <div style={{ minHeight: 520 }}>
        <ChatPanel />
      </div>

      <button
        onClick={clearChat}
        className="btn-ghost w-full text-[12px] text-slate-500"
      >
        🗑 Clear Chat
      </button>
    </div>
  );
}