// FILE: frontend/components/ai/ChatPanel.tsx
"use client";
import { useRef, useEffect, useState } from "react";
import { useChatStore, useBankingStore } from "@/lib/store";
import { agentApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

const RAG_KB = [
  { q:"neft",               a:"NEFT settles in half-hourly batches, 24×7, with no upper limit for transfers." },
  { q:"rtgs",               a:"RTGS is for high-value transfers (min ₹2 lakh), settled instantly during banking hours." },
  { q:"upi",                a:"UPI enables instant transfers using VPA/UPI ID, mobile number, or QR code — available 24×7." },
  { q:"imps",               a:"IMPS provides instant interbank transfer 24×7 for amounts up to ₹5 lakh per day." },
  { q:"kyc",                a:"KYC is mandatory identity verification required for all bank accounts and financial services." },
  { q:"fd fixed deposit",   a:"A Fixed Deposit earns guaranteed interest at a fixed rate. TDS applies if interest exceeds ₹40,000/year." },
  { q:"sip systematic",     a:"SIP auto-debits a fixed amount monthly into mutual funds, benefiting from rupee cost averaging." },
  { q:"emi equated",        a:"EMI is the fixed monthly loan repayment. Missing EMIs hurts your CIBIL score." },
  { q:"cibil credit score", a:"CIBIL scores range 300–900. Above 750 qualifies for the best interest rates." },
  { q:"ifsc",               a:"IFSC is an 11-character code uniquely identifying each bank branch for NEFT/RTGS/IMPS." },
  { q:"elss tax",           a:"ELSS offers ₹1.5 lakh deduction under Section 80C with a 3-year lock-in and market-linked returns." },
  { q:"rd recurring",       a:"A Recurring Deposit lets you save a fixed monthly amount at a guaranteed rate." },
  { q:"insurance premium",  a:"Health insurance premiums qualify for deduction under Section 80D (up to ₹25,000)." },
  { q:"nominee",            a:"A nominee receives your account funds if you pass away. Keep nominee details updated." },
  { q:"utr",                a:"UTR is a unique number for every NEFT/RTGS/IMPS transaction used for tracking and disputes." },
  { q:"fraud suspicious",   a:"Transactions are flagged based on amount anomalies, odd hours, new recipients, and ML detection." },
  { q:"loan eligibility",   a:"Loan eligibility depends on CIBIL score (min 750), income, existing EMIs, employment, and age." },
];

function ragSearch(q: string): string | null {
  const ql = q.toLowerCase();
  let best: string | null = null, bestScore = 0;
  for (const item of RAG_KB) {
    const score = item.q.split(" ").filter(k => ql.includes(k)).length;
    if (score > bestScore) { bestScore = score; best = item.a; }
  }
  return bestScore >= 1 ? best : null;
}

const QUICK_PROMPTS = [
  "What is my balance?", "Show fraud alerts", "What is SIP?",
  "Explain  RTGS", "Analyze my expenses", "Show upcoming reminders",
  "How to improve credit score?", "Give financial advice",
];

export default function ChatPanel() {
  const { messages, isLoading, agentSteps, addMessage, setLoading, setAgentSteps } = useChatStore();
  const { balance, transactions, reminders } = useBankingStore();
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, isLoading]);

  async function runAgent(query: string) {
    const steps: { node:string; detail:string }[] = [];

    // 1 — Try real backend LangGraph agent
    try {
      steps.push({ node:"Agent Router", detail:"Calling LangGraph backend..." });
      setAgentSteps([...steps]);
      const res  = await agentApi.query(query);
      const data = res.data;
      if (data.steps?.length) { steps.push(...data.steps); setAgentSteps([...steps]); }
      steps.push({ node:"Response Ready", detail:"Delivered from backend agent" });
      setAgentSteps([...steps]);
      return data.response || "No response from agent.";
    } catch {
      steps.push({ node:"Fallback Mode", detail:"Backend unavailable — local processing" });
      setAgentSteps([...steps]);
    }

    // 2 — Local fallback using real Zustand store data
    const q = query.toLowerCase();
    let intent = "general";
    if (q.includes("balance") || q.includes("how much money")) intent = "balance";
    else if (q.includes("fraud") || q.includes("suspicious") || q.includes("alert")) intent = "fraud";
    else if (q.includes("expense") || q.includes("spend") || q.includes("budget")) intent = "expense";
    else if (q.includes("remind") || q.includes("emi") || q.includes("sip due")) intent = "reminder";
    else if (["neft","rtgs","upi","fd","kyc","cibil","elss","imps","ifsc","utr","nominee","loan",
               "what is","explain","define"].some(k => q.includes(k))) intent = "rag";
    else if (q.includes("advice") || q.includes("recommend") || q.includes("should i")) intent = "advisory";

    steps.push({ node:"Intent Detection", detail:`Detected: ${intent.toUpperCase()}` });
    setAgentSteps([...steps]);

    let response = "";

    if (intent === "balance") {
      const income  = transactions.filter(t => t.type==="deposit").reduce((s,t) => s+t.amount, 0);
      const expense = transactions.filter(t => t.type!=="deposit").reduce((s,t) => s+t.amount, 0);
      response = `💰 Your account balance is ${formatCurrency(balance)}.\n\nIncome: ${formatCurrency(income)}\nExpense: ${formatCurrency(expense)}\nNet Savings: ${formatCurrency(income-expense)}\nSavings Rate: ${income>0?Math.round(((income-expense)/income)*100):0}%`;

    } else if (intent === "fraud") {
      const flagged = transactions.filter(t => t.is_flagged);
      const high    = flagged.filter(t => t.fraud_score >= 0.7).length;
      response = `🚨 Fraud Analysis\n\nScanned: ${transactions.length} transactions\nFlagged: ${flagged.length} suspicious\nHigh Risk: ${high}\nOverall: ${high>1?"HIGH 🔴":flagged.length>0?"MEDIUM 🟡":"LOW 🟢"}\n\n${flagged.slice(0,4).map(t=>`• TX#${t.id}: ${formatCurrency(t.amount)} → ${t.receiver||"?"} (${t.date})`).join("\n")||"No flagged transactions."}`;

    } else if (intent === "expense") {
      const byCat: Record<string,number> = {};
      for (const t of transactions) {
        if (t.type==="deposit") continue;
        const c = t.category||"General";
        byCat[c] = (byCat[c]||0)+t.amount;
      }
      const income  = transactions.filter(t=>t.type==="deposit").reduce((s,t)=>s+t.amount,0);
      const expense = transactions.filter(t=>t.type!=="deposit").reduce((s,t)=>s+t.amount,0);
      const top     = Object.entries(byCat).sort(([,a],[,b])=>b-a).slice(0,4);
      response = `📊 Expense Analysis\n\nTotal Income: ${formatCurrency(income)}\nTotal Expense: ${formatCurrency(expense)}\nNet Savings: ${formatCurrency(income-expense)}\nSavings Rate: ${income>0?Math.round(((income-expense)/income)*100):0}%\n\nTop Categories:\n${top.map(([k,v])=>`• ${k}: ${formatCurrency(v)}`).join("\n")}`;

    } else if (intent === "reminder") {
      const pending = reminders.filter(r=>r.status==="pending");
      const total   = pending.reduce((s,r)=>s+r.amount,0);
      response = `📅 Upcoming Reminders (${pending.length} pending)\n\nTotal obligations: ${formatCurrency(total)}\n\n${pending.slice(0,5).map(r=>`• [${r.type.toUpperCase()}] ${r.task} — ${formatCurrency(r.amount)} on ${r.date}`).join("\n")||"No pending reminders."}`;

    } else if (intent === "rag") {
      const doc = ragSearch(query);
      response = doc ? `📚 Banking Knowledge Base\n\n${doc}` : "I couldn't find that in the banking knowledge base. Please ask the backend agent.";

    } else if (intent === "advisory") {
      const income  = transactions.filter(t=>t.type==="deposit").reduce((s,t)=>s+t.amount,0);
      const expense = transactions.filter(t=>t.type!=="deposit").reduce((s,t)=>s+t.amount,0);
      const sr      = income>0?Math.round(((income-expense)/income)*100):0;
      response = `💡 Financial Advice (based on your profile)\n\n1. Savings rate: ${sr}% — ${sr>=20?"✅ On track! Consider increasing SIP.":"⚠ Below 20%. Automate savings on salary day."}\n2. Emergency fund: Maintain 6 months of expenses (₹${(expense/Math.max(1,new Set(transactions.map(t=>t.date.slice(0,7))).size)*6/1000).toFixed(0)}K target).\n3. Investments: Max out Section 80C (₹1.5L) via ELSS, PPF, or NPS before March 31.\n4. Insurance: Ensure health cover ≥ ₹10L and life cover ≥ 20× annual income.`;

    } else {
      response = "I'm FinMind AI. Ask me about balance, expenses, fraud alerts, reminders, SIP, NEFT, EMI, or financial advice!";
    }

    steps.push({ node:"Response Ready", detail:"Local computation complete" });
    setAgentSteps([...steps]);
    return response;
  }

  async function sendMessage() {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput("");
    addMessage({ role:"user", text, timestamp:new Date().toISOString() });
    setLoading(true); setAgentSteps([]);
    const response = await runAgent(text);
    addMessage({ role:"assistant", text:response, timestamp:new Date().toISOString() });
    setLoading(false);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" style={{ minHeight:250 }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-900 border-b border-slate-700">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-lg shadow">🤖</div>
        <div>
          <div className="text-[14px] font-bold text-white">FinMind AI Assistant</div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"/>
            Online
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 bg-slate-50">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role==="user"?"flex-row-reverse":"flex-row"} items-end`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${m.role==="user"?"bg-indigo-600 text-white":"bg-slate-800 text-white"}`}>
              {m.role==="user"?"U":"🤖"}
            </div>
            <div className={`max-w-[90%] ${m.role==="user"?"chat-bubble-user":"chat-bubble-assistant"}`}>
              <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed">{m.text}</pre>
              <div className={`text-[10px] mt-1 ${m.role==="user"?"text-indigo-200":"text-slate-400"}`}>
                {new Date(m.timestamp).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-2 items-end">
            <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-[11px] text-white flex-shrink-0">🤖</div>
            <div className="chat-bubble-assistant">
              <div className="flex gap-1">
                {[0,1,2].map(i=><div key={i} className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}
              </div>
            </div>
          </div>
        )}
        <div ref={endRef}/>
      </div>

      {/* Quick prompts */}
      <div className="px-3 py-2 border-t border-slate-100 flex gap-1.5 overflow-x-auto">
        {QUICK_PROMPTS.map(p => (
          <button key={p} onClick={() => setInput(p)}
            className="flex-shrink-0 text-[11px] px-2.5 py-1 rounded-full border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-300 text-slate-500 hover:text-indigo-700 transition-all">
            {p}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-3 py-2.5 border-t border-slate-200 flex gap-2">
        <input
          value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
          placeholder="Ask about balance, fraud, SIP, NEFT, expenses..."
          className="input flex-1 text-[13px]" disabled={isLoading}
        />
        <button onClick={sendMessage} disabled={isLoading||!input.trim()} className="btn-primary px-4 text-[13px]">
          Send
        </button>
      </div>
    </div>
  );
}
