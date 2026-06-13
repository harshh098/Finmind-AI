// FILE: frontend/app/financial-insights/page.tsx
"use client";
import { useState, useEffect } from "react";
import MetricCard from "@/components/ui/MetricCard";
import Card from "@/components/ui/Card";
import HealthScore from "@/components/ui/HealthScore";
import DonutChart from "@/components/ui/DonutChart";
import BarChart from "@/components/ui/BarChart";
import ProgressBar from "@/components/ui/ProgressBar";
import { useBankingStore } from "@/lib/store";
import { analyticsApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

const GOALS = [
  { label:"Emergency Fund",    target:120000, color:"#10b981", icon:"🛡" },
  { label:"Home Down Payment", target:500000, color:"#6366f1", icon:"🏠" },
  { label:"Car Fund",          target:300000, color:"#f59e0b", icon:"🚗" },
  { label:"Vacation 2026",     target:80000,  color:"#ec4899", icon:"✈" },
];

const TIPS = [
  { title:"Increase SIP by 10%/yr",      desc:"Step-up SIPs beat inflation and grow corpus faster.",         icon:"📈", priority:"High"   },
  { title:"Max out 80C (₹1.5L)",         desc:"ELSS, PPF, NPS give tax-free returns. Save ₹46,800 in tax.", icon:"💰", priority:"High"   },
  { title:"Term Insurance 20× income",   desc:"Adequate life cover protects your family. Buy early.",        icon:"🛡", priority:"Medium" },
  { title:"Health cover ₹10L+",          desc:"Medical inflation is 12%/yr. Family floater minimum ₹10L.",   icon:"⚕", priority:"High"   },
  { title:"Maintain 750+ CIBIL",         desc:"Pay EMIs on time. Keep credit utilization below 30%.",        icon:"⭐", priority:"Medium" },
  { title:"Rebalance portfolio 6-monthly",desc:"Review asset allocation to maintain equity/debt ratio.",     icon:"🔄", priority:"Low"    },
];

export default function FinancialInsightsPage() {
  const [activeTab, setActiveTab] = useState<"overview"|"goals"|"tips">("overview");
  const { balance, transactions, reminders } = useBankingStore();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading]     = useState(false);

  const income  = transactions.filter(t => t.type === "deposit").reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type !== "deposit").reduce((s, t) => s + t.amount, 0);
  const savings = income - expense;
  const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;
  const fraudCount  = transactions.filter(t => t.is_flagged).length;
  const monthKeys   = [...new Set(transactions.map(t => t.date.slice(0, 7)))];
  const monthCount  = monthKeys.length || 1;

  const byMonth: Record<string, { income:number; expense:number }> = {};
  for (const t of transactions) {
    const mo = t.date.slice(0, 7);
    if (!byMonth[mo]) byMonth[mo] = { income:0, expense:0 };
    if (t.type === "deposit") byMonth[mo].income += t.amount;
    else byMonth[mo].expense += t.amount;
  }
  const savingsTrend = Object.entries(byMonth)
    .sort(([a],[b]) => a.localeCompare(b)).slice(-6)
    .map(([mo, d]) => ({ label:mo.slice(5), value:Math.max(0, d.income-d.expense) }));

  const bySender: Record<string, number> = {};
  for (const t of transactions.filter(t => t.type === "deposit")) {
    const s = t.sender || "Other";
    bySender[s] = (bySender[s] || 0) + t.amount;
  }
  const incomeSegments = Object.entries(bySender).sort(([,a],[,b])=>b-a).slice(0,5)
    .map(([label, value], i) => ({ label, value, color:["#10b981","#6366f1","#06b6d4","#f59e0b","#ec4899"][i]||"#6b7280" }));

  const savingsScore  = Math.min(60, savingsRate * 1.5);
  const fraudScore    = Math.max(0, 20 - fraudCount * 4);
  const reminderScore = reminders.filter(r => r.status === "pending").length < 10 ? 20 : 10;
  const healthScore   = Math.min(100, Math.round(savingsScore + fraudScore + reminderScore));

  const emiTotal    = reminders.filter(r => r.type === "emi").reduce((s,r) => s+r.amount, 0);
  const sipTotal    = reminders.filter(r => r.type === "sip").reduce((s,r) => s+r.amount, 0);
  const pendingEMIs = reminders.filter(r => r.type === "emi" && r.status === "pending").length;

  useEffect(() => {
    if (typeof window === "undefined" || !localStorage.getItem("finmind_token")) return;
    setLoading(true);
    analyticsApi.summary().then(res => setAnalytics(res.data)).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  const insights:string[]      = analytics?.insights        || [];
  const recommendations:any[]  = analytics?.recommendations || [];
  const goalsWithBalance = GOALS.map((g,i) => i===0 ? {...g, current:Math.min(balance*0.3, g.target)} : {...g, current:0});

  return (
    <div className="flex flex-col gap-4 animate-slide-up">
      {/* Summary Cards */}
      <div className="flex gap-3 flex-wrap">
        <MetricCard label="Health Score"    value={`${healthScore}/100`}    sub={healthScore>=70?"Good standing":"Needs attention"} color={healthScore>=70?"#10b981":"#f59e0b"} icon="💯" />
        <MetricCard label="Monthly Income"  value={formatCurrency(Math.round(income/monthCount),true)} sub="Avg per month" color="#10b981" icon="📥" />
        <MetricCard label="Monthly Expense" value={formatCurrency(Math.round(expense/monthCount),true)} sub="Avg per month" color="#ef4444" icon="📤" />
        <MetricCard label="Monthly Savings" value={formatCurrency(Math.round(savings/monthCount),true)} sub={`${savingsRate}% rate`} color="#06b6d4" icon="💰" />
        <MetricCard label="EMI Burden"      value={formatCurrency(emiTotal,true)} sub={`${pendingEMIs} active EMIs`} color="#8b5cf6" icon="📋" />
        <MetricCard label="Monthly SIP"     value={formatCurrency(sipTotal,true)} sub="Auto-invested" color="#ec4899" icon="📊" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1 w-fit">
        {([["overview","📊 Overview"],["goals","🎯 Goals"],["tips","💡 Tips"]] as const).map(([tab,label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all ${activeTab===tab?"bg-indigo-600 text-white shadow-sm":"text-slate-500 hover:text-slate-800"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="flex flex-col gap-4">
          <div className="flex gap-4 flex-wrap">
            <Card title="Financial Health Score" subtitle="Composite score from 4 indicators" className="flex-1 min-w-[200px]">
              <div className="flex items-center gap-6">
                <HealthScore score={healthScore} size={100} />
                <div className="flex-1">
                  {[
                    { label:"Savings Rate",   score:Math.round(savingsScore), max:60, color:"#10b981" },
                    { label:"Fraud Safety",   score:Math.round(fraudScore),   max:20, color:"#6366f1" },
                    { label:"Reminder Health",score:reminderScore,            max:20, color:"#f59e0b" },
                  ].map(row => (
                    <div key={row.label} className="mb-2">
                      <div className="flex justify-between text-[12px] mb-1">
                        <span className="text-slate-600">{row.label}</span>
                        <span className="font-bold" style={{ color:row.color }}>{row.score}/{row.max}</span>
                      </div>
                      <ProgressBar value={row.score} max={row.max} color={row.color} height={5} />
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card title="Income Sources" subtitle="Where your money comes from" className="flex-1 min-w-[200px]">
              {incomeSegments.length > 0
                ? <DonutChart segments={incomeSegments} size={110} showLegend />
                : <div className="text-[13px] text-slate-400 text-center py-8">No income data yet</div>
              }
            </Card>

            <Card title="Monthly Savings Trend" subtitle="Net savings per month" className="flex-1 min-w-[200px]">
              {savingsTrend.length > 0
                ? <><BarChart data={savingsTrend} height={80} color="#10b981" />
                    <div className="mt-2 text-[11px] text-slate-400">
                      Best: {savingsTrend.reduce((b,d) => d.value>b.value?d:b, savingsTrend[0])?.label||"—"}
                    </div></>
                : <div className="text-[13px] text-slate-400 text-center py-8">No data yet</div>
              }
            </Card>
          </div>

          {/* Financial Ratios */}
          <Card title="Key Financial Ratios" subtitle="Industry benchmarks vs your profile">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label:"Savings Rate",    yours:`${savingsRate}%`,                                           benchmark:"20%+", ok:savingsRate>=20 },
                { label:"EMI-to-Income",   yours:income>0?`${Math.round((emiTotal*12/income)*100)}%`:"N/A",  benchmark:"<50%", ok:income>0&&emiTotal*12/income<0.5 },
                { label:"Investment Rate", yours:income>0?`${Math.round((sipTotal*12/income)*100)}%`:"N/A",  benchmark:"15%+", ok:income>0&&sipTotal*12/income>=0.15 },
                { label:"Fraud Risk",      yours:fraudCount>2?"High":fraudCount>0?"Medium":"Low",            benchmark:"Zero", ok:fraudCount===0 },
              ].map(r => (
                <div key={r.label} className={`p-3 rounded-xl border ${r.ok?"bg-emerald-50 border-emerald-100":"bg-amber-50 border-amber-100"}`}>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">{r.label}</div>
                  <div className={`text-[18px] font-black ${r.ok?"text-emerald-600":"text-amber-600"}`}>{r.yours}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Target: {r.benchmark}</div>
                  <div className={`text-[10px] font-bold mt-1 ${r.ok?"text-emerald-600":"text-amber-600"}`}>{r.ok?"✓ On track":"⚠ Needs work"}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* AI Insights from backend */}
          {insights.length > 0 && (
            <Card title="💡 AI Insights" subtitle="Generated from your real transaction data">
              <div className="flex flex-col gap-2.5">
                {insights.map((ins:string, i:number) => (
                  <div key={i} className="flex gap-3 p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                    <span className="text-base flex-shrink-0">{ins.startsWith("Excellent")||ins.startsWith("Good")?"✅":ins.startsWith("Warning")?"🔴":"📊"}</span>
                    <p className="text-[12px] text-slate-700 leading-relaxed">{ins}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {recommendations.length > 0 && (
            <Card title="🎯 Recommendations" subtitle="Personalized to your financial profile">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recommendations.map((r:any, i:number) => {
                  const col = r.priority==="high"?"#ef4444":r.priority==="medium"?"#f59e0b":"#10b981";
                  return (
                    <div key={i} className="p-3 rounded-xl border" style={{ background:col+"0d", borderColor:col+"33" }}>
                      <div className="flex items-center gap-2 mb-1.5"><span className="text-xl">{r.icon}</span><span className="text-[13px] font-bold text-slate-800">{r.title}</span></div>
                      <p className="text-[12px] text-slate-600 leading-relaxed">{r.desc}</p>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Goals Tab */}
      {activeTab === "goals" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {goalsWithBalance.map(g => {
              const pct       = Math.min(100, Math.round((g.current/g.target)*100));
              const remaining = g.target - g.current;
              const avgSav    = savings/monthCount;
              const monthsLeft = avgSav > 0 ? Math.ceil(remaining/avgSav) : "—";
              return (
                <Card key={g.label}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{g.icon}</span>
                      <div>
                        <div className="text-[14px] font-bold text-slate-800">{g.label}</div>
                        <div className="text-[11px] text-slate-400">Target: {formatCurrency(g.target)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[20px] font-black" style={{ color:g.color }}>{pct}%</div>
                      <div className="text-[10px] text-slate-400">achieved</div>
                    </div>
                  </div>
                  <ProgressBar value={g.current} max={g.target} color={g.color} height={8} />
                  <div className="flex justify-between mt-2 text-[12px]">
                    <span className="text-slate-500">Saved: <strong style={{ color:g.color }}>{formatCurrency(g.current, true)}</strong></span>
                    <span className="text-slate-500">Left: <strong className="text-slate-700">{formatCurrency(remaining, true)}</strong></span>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400">At current rate: ~{monthsLeft} months to goal</div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Tips Tab */}
      {activeTab === "tips" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TIPS.map((tip, i) => {
            const pc = tip.priority==="High"?"#ef4444":tip.priority==="Medium"?"#f59e0b":"#10b981";
            return (
              <Card key={i} className="hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-2xl">{tip.icon}</span>
                  <div className="flex-1">
                    <div className="text-[13px] font-bold text-slate-800 mb-1">{tip.title}</div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background:pc+"20", color:pc }}>{tip.priority} Priority</span>
                  </div>
                </div>
                <p className="text-[12px] text-slate-600 leading-relaxed">{tip.desc}</p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
