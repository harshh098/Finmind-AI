"use client";
import { useState, useEffect } from "react";
import MetricCard from "@/components/ui/MetricCard";
import ReminderCard from "@/components/reminders/ReminderCard";
import Card from "@/components/ui/Card";
import Pill from "@/components/ui/Pill";
import Toast from "@/components/ui/Toast";
import { useBankingStore } from "@/lib/store";
import { remindersApi } from "@/lib/api";
import { REMINDER_TYPE_COLORS, formatCurrency } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import type { Reminder } from "@/lib/store";

const TYPE_FILTERS = ["all","emi","sip","insurance","tax_saving","fd_maturity","rd"];

export default function RemindersPage() {
  const { reminders, setReminders } = useBankingStore();
  const [filter,   setFilter]   = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [busy,     setBusy]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [toast,    setToast]    = useState<{ msg: string; type: "success"|"error" } | null>(null);
  const [form,     setForm]     = useState({ type:"emi", task:"", date:"", time:"09:00", amount:"", related_to:"", notify_before_min:"60" });
  const t = useT();

  // Refresh reminders from real API
  async function fetchReminders() {
    setLoading(true);
    try {
      const res = await remindersApi.getAll();
      setReminders(res.data);
    } catch { /* silent */ }
    setLoading(false);
  }

  useEffect(() => { fetchReminders(); }, []);

  const filtered = filter === "all" ? reminders : reminders.filter(r => r.type === filter);
  const pending  = reminders.filter(r => r.status === "pending");
  const emiTotal = reminders.filter(r => r.type === "emi").reduce((s, r) => s + r.amount, 0);
  const sipTotal = reminders.filter(r => r.type === "sip").reduce((s, r) => s + r.amount, 0);
  const insTotal = reminders.filter(r => r.type === "insurance").reduce((s, r) => s + r.amount, 0);
  const totalObl = reminders.reduce((s, r) => s + r.amount, 0);

  function handleFormChange(key: string, value: string) { setForm(f => ({ ...f, [key]: value })); }

  async function handleSubmit() {
    if (!form.task || !form.date) { setToast({ msg: "Task and date are required.", type: "error" }); return; }
    setBusy(true);
    try {
      await remindersApi.create({
        type: form.type, task: form.task, date: form.date, time: form.time,
        amount: parseFloat(form.amount) || 0, related_to: form.related_to,
        notify_before_min: parseInt(form.notify_before_min),
      });
      await fetchReminders();
      setToast({ msg: `Reminder "${form.task}" saved!`, type: "success" });
      setShowForm(false);
      setForm({ type:"emi", task:"", date:"", time:"09:00", amount:"", related_to:"", notify_before_min:"60" });
    } catch (e: any) {
      setToast({ msg: e?.response?.data?.detail || "Failed to save reminder.", type: "error" });
    } finally { setBusy(false); }
  }

  async function handleDelete(rid: number) {
    try { await remindersApi.delete(rid); await fetchReminders(); setToast({ msg: "Reminder deleted.", type: "success" }); }
    catch { setToast({ msg: "Failed to delete.", type: "error" }); }
  }

  async function handleComplete(rid: number) {
    try { await remindersApi.complete(rid); await fetchReminders(); setToast({ msg: "Reminder completed ✅", type: "success" }); }
    catch { setToast({ msg: "Failed to update.", type: "error" }); }
  }

  return (
    <div className="flex flex-col gap-4 animate-slide-up">
      <div className="flex gap-3 flex-wrap">
        <MetricCard label="Total Reminders"   value={reminders.length}   sub="All scheduled"              color="#818cf8" icon="📅" />
        <MetricCard label="EMI Due"           value={reminders.filter(r=>r.type==="emi").length} sub={formatCurrency(emiTotal,true)} color="#ef4444" icon="📋" />
        <MetricCard label="SIP Scheduled"     value={reminders.filter(r=>r.type==="sip").length} sub={formatCurrency(sipTotal,true)} color="#10b981" icon="📈" />
        <MetricCard label="Insurance"         value={reminders.filter(r=>r.type==="insurance").length} sub={formatCurrency(insTotal,true)} color="#f59e0b" icon="🛡" />
        <MetricCard label="Total Obligations" value={formatCurrency(totalObl,true)} sub="All reminders"   color="#06b6d4" icon="💰" />
      </div>

      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-1.5 flex-wrap">
          {TYPE_FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all capitalize ${filter===f?"bg-indigo-600 text-white border-indigo-600":"bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}>
              {f === "all" ? "All" : f.replace("_"," ")}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost text-[12px]" onClick={fetchReminders} disabled={loading}>{loading ? "..." : "↻ Refresh"}</button>
          <button className="btn-primary" onClick={() => setShowForm(s => !s)}>{showForm ? "✕ Cancel" : `+ ${t("addReminder")}`}</button>
        </div>
      </div>

      {showForm && (
        <Card title={`➕ ${t("addReminder")}`} subtitle="Schedule a financial obligation">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="label-sm">Type</label>
              <select value={form.type} onChange={e=>handleFormChange("type",e.target.value)} className="input">
                {["emi","sip","insurance","tax_saving","fd_maturity","rd","general"].map(tp=><option key={tp} value={tp}>{tp.replace("_"," ").toUpperCase()}</option>)}
              </select>
            </div>
            <div><label className="label-sm">{t("taskDesc")}</label><input value={form.task} onChange={e=>handleFormChange("task",e.target.value)} placeholder="e.g. Home loan EMI" className="input"/></div>
            <div><label className="label-sm">{t("amount")} (₹)</label><input value={form.amount} onChange={e=>handleFormChange("amount",e.target.value)} placeholder="0" type="number" className="input"/></div>
            <div><label className="label-sm">{t("date")}</label><input value={form.date} onChange={e=>handleFormChange("date",e.target.value)} type="date" className="input"/></div>
            <div><label className="label-sm">{t("time")}</label><input value={form.time} onChange={e=>handleFormChange("time",e.target.value)} type="time" className="input"/></div>
            <div>
              <label className="label-sm">{t("notifyBefore")}</label>
              <select value={form.notify_before_min} onChange={e=>handleFormChange("notify_before_min",e.target.value)} className="input">
                {["15","30","60","120","1440"].map(v=><option key={v} value={v}>{v==="1440"?"1 day before":`${v} min before`}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3"><label className="label-sm">Related To</label><input value={form.related_to} onChange={e=>handleFormChange("related_to",e.target.value)} placeholder="e.g. Home Loan - H123" className="input"/></div>
          </div>
          <div className="flex gap-2 mt-4">
            <button className="btn-primary" onClick={handleSubmit} disabled={busy}>{busy ? t("loading") : t("saveReminder")}</button>
            <button className="btn-ghost" onClick={() => setShowForm(false)}>{t("cancel")}</button>
          </div>
        </Card>
      )}

      {pending.length > 0 && (
        <Card title="📆 Upcoming This Month" subtitle="High-priority obligations">
          <div className="flex flex-wrap gap-3">
            {pending.slice(0,4).map(r => (
              <div key={r.rid} className="flex items-center gap-2 px-3 py-2 rounded-xl border text-[12px]"
                style={{ background:(REMINDER_TYPE_COLORS[r.type]||"#6b7280")+"10", borderColor:(REMINDER_TYPE_COLORS[r.type]||"#6b7280")+"40" }}>
                <span className="font-bold" style={{ color: REMINDER_TYPE_COLORS[r.type] }}>{r.date}</span>
                <span className="text-slate-600">{r.task}</span>
                {r.amount > 0 && <Pill label={formatCurrency(r.amount,true)} color={REMINDER_TYPE_COLORS[r.type]||"#6b7280"}/>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-10 text-slate-400 text-[13px]">Loading reminders...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(r => (
            <ReminderCard key={r.rid} reminder={r} onDelete={handleDelete} onComplete={handleComplete}/>
          ))}
          {filtered.length === 0 && <div className="col-span-full text-center py-12 text-slate-400 text-[14px]">No reminders found for this filter.</div>}
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  );
}
