"use client";  // full accounts frontend setup
import { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import MetricCard from "@/components/ui/MetricCard";
import Pill from "@/components/ui/Pill";
import Modal from "@/components/ui/Modal";
import Toast from "@/components/ui/Toast";
import { useBankingStore, useNotifStore } from "@/lib/store";
import { useBalance } from "@/hooks/useBalance";
import { useTransactions } from "@/hooks/useTransactions";
import { bankingApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { useT } from "@/lib/i18n";

type Flow = null | "deposit" | "transfer" | "withdraw";
type Step = "form" | "add_beneficiary" | "security" | "fraud_warn" | "otp" | "blocked";

const CATEGORIES = [
  "General","Food","Rent","Shopping","Healthcare","Education",
  "Transport","Groceries","Gifts","Investment","Utilities",
];

interface Beneficiary {
  id: number;
  name: string;
  account_no: string;
}

interface TransferLimitSummary {
  daily_limit: number;
  used_today: number;
  remaining: number;
}

function validateAccountNo(val: string): string {
  if (!val) return "Account number is required.";
  if (!/^\d+$/.test(val)) return "Account number must contain digits only.";
  if (val.length !== 13) return `Account number must be exactly 13 digits (currently ${val.length}).`;
  return "";
}

export default function AccountsPage() {
  const { balance, accountNo, transactions } = useBankingStore();
  const { refresh: refreshBalance } = useBalance();
  const { refresh: refreshTx }      = useTransactions();
  const { addNotification }         = useNotifStore();
  const t = useT();

  const [flow,        setFlow]        = useState<Flow>(null);
  const [step,        setStep]        = useState<Step>("form");
  const [amount,      setAmount]      = useState("");
  const [note,        setNote]        = useState("");
  const [category,    setCategory]    = useState("General");
  const [sender,      setSender]      = useState("External");
  const [otp,         setOtp]         = useState("");
  const [sessionId,   setSessionId]   = useState<number | null>(null);
  const [fraudInfo,   setFraudInfo]   = useState<any>(null);
  const [blockedInfo, setBlockedInfo] = useState<any>(null);
  const [secQuestion, setSecQuestion] = useState("");
  const [secAttemptsUsed, setSecAttemptsUsed] = useState(0);
  const [secAnswer,   setSecAnswer]   = useState("");
  const [busy,        setBusy]        = useState(false);
  const [error,       setError]       = useState("");
  const [toast,       setToast]       = useState<{
    msg: string; type: "success"|"error"|"warning"|"info"
  } | null>(null);

  // Search state
  const [searchQuery,      setSearchQuery]      = useState("");
  const [searchBusy,       setSearchBusy]       = useState(false);
  const [searchDone,       setSearchDone]       = useState(false);
  const [selectedBenef,    setSelectedBenef]    = useState<Beneficiary | null>(null);
  const [benefFoundMsg,    setBenefFoundMsg]    = useState("");

  // Add-beneficiary inline form state
  const [showAddForm,      setShowAddForm]      = useState(false);
  const [newBenefName,     setNewBenefName]     = useState("");
  const [newBenefAccNo,    setNewBenefAccNo]    = useState("");
  const [accNoError,       setAccNoError]       = useState("");
  const [benefBusy,        setBenefBusy]        = useState(false);

  // ── NEW: Quick Transfer (recent beneficiaries) ──────────────────────────
  const [recentBenefs,     setRecentBenefs]     = useState<Beneficiary[]>([]);
  const [recentBenefsBusy, setRecentBenefsBusy] = useState(false);

  // ── NEW: Daily Limit summary ──────────────────────────────────────────────
  const [limitSummary,     setLimitSummary]     = useState<TransferLimitSummary | null>(null);
  const [limitSummaryBusy, setLimitSummaryBusy] = useState(false);

  const income  = transactions.filter(tx => tx.type === "deposit" && tx.status === "completed").reduce((s, tx) => s + tx.amount, 0);
  const expense = transactions.filter(tx => tx.type !== "deposit" && tx.status === "completed").reduce((s, tx) => s + tx.amount, 0);

  const accNoValidationError = validateAccountNo(newBenefAccNo);
  const canAddBeneficiary = newBenefName.trim().length > 0 && accNoValidationError === "";

  function openFlow(f: Flow) {
    setFlow(f); setStep("form"); setAmount(""); setNote("");
    setSender("External"); setOtp(""); setSessionId(null); setFraudInfo(null);
    setBlockedInfo(null); setSecQuestion(""); setSecAnswer(""); setSecAttemptsUsed(0);
    setError("");
    setSearchQuery(""); setSearchBusy(false); setSearchDone(false);
    setSelectedBenef(null); setBenefFoundMsg(""); setShowAddForm(false);
    setNewBenefName(""); setNewBenefAccNo(""); setAccNoError("");
    if (f === "transfer") {
      fetchRecentBeneficiaries();
      fetchLimitSummary();
    }
  }
  function closeFlow() { openFlow(null); }

  async function afterSuccess(res: any) {
    const n = res.data?.notification;
    if (n) addNotification(n);
    await refreshBalance();
    await refreshTx();
  }

    // ── NEW: fetch recent beneficiaries for Quick Transfer ───────────────────
  async function fetchRecentBeneficiaries() {
    setRecentBenefsBusy(true);
    try {
      const res = await bankingApi.getBeneficiaries();

      const recent = [...(res.data || [])]
        .sort((a, b) => b.id - a.id)
        .slice(0, 3);

      setRecentBenefs(recent);
    } catch {
      // Fail silently — Quick Transfer is a convenience feature, not core flow
      setRecentBenefs([]);
    } finally {
      setRecentBenefsBusy(false);
    }
  }

  // ── NEW: fetch daily transfer limit summary ──────────────────────────────
async function fetchLimitSummary() {
  setLimitSummaryBusy(true);

  try {
    const res = await bankingApi.getLimits();

    console.log("SUCCESS");
    console.log(res.status);
    console.log(res.data);

    setLimitSummary(res.data.transfer);
  } catch (err: any) {
    console.error("========== LIMIT ERROR ==========");
    console.error("Status:", err.response?.status);
    console.error("Data:", err.response?.data);
    console.error("Headers:", err.response?.headers);
    console.error("URL:", err.config?.url);
    console.error("Request:", err.config);
    console.error(err);
    console.error("================================");

    setLimitSummary(null);
  } finally {
    setLimitSummaryBusy(false);
  }
}

  // ── NEW: Quick Transfer click — reuses existing "found" flow exactly ────
  function handleQuickTransferSelect(benef: Beneficiary) {
    setSearchQuery(benef.name);
    setSearchDone(true);
    setSelectedBenef(benef);
    setBenefFoundMsg(`Beneficiary found: ${benef.name} (${benef.account_no})`);
    setShowAddForm(false);
    setError("");
  }

  // ── Search Beneficiary ────────────────────────────────────────────────────
  async function handleSearchBeneficiary() {
    const q = searchQuery.trim();
    if (!q) { setError("Enter a name or account number to search."); return; }
    setSearchBusy(true); setError(""); setSearchDone(false);
    setSelectedBenef(null); setBenefFoundMsg(""); setShowAddForm(false);
    try {
      const res = await bankingApi.getBeneficiaries();
      const all: Beneficiary[] = res.data;
      const found = all.find(
        b => b.name.toLowerCase().includes(q.toLowerCase()) ||
             b.account_no.includes(q)
      );
      setSearchDone(true);
      if (found) {
        setSelectedBenef(found);
        setBenefFoundMsg(`Beneficiary found: ${found.name} (${found.account_no})`);
        setShowAddForm(false);
      } else {
        setBenefFoundMsg("");
        setShowAddForm(true);
        // Pre-fill account number if query looks like a number
        if (/^\d+$/.test(q)) setNewBenefAccNo(q.slice(0, 13));
        else setNewBenefName(q);
      }
    } catch {
      setError("Failed to search beneficiaries. Try again.");
    } finally { setSearchBusy(false); }
  }

  // ── Transfer initiate ─────────────────────────────────────────────────────
async function handleTransferInitiate(benef: Beneficiary) {
  const amt = parseFloat(amount);

  setBusy(true);
  setError("");

  try {
    const res = await bankingApi.initiateTransfer(
      benef.name,
      amt,
      note,
      category
    );

    // Backend returned a warning -> DO NOT open OTP yet
    if (res.data.status === "warning") {
      setFraudInfo(res.data.fraud_check);
      setStep("fraud_warn");
      return;
    }

    // OTP session already created
    setFraudInfo(res.data.fraud_check);
    setSessionId(res.data.session_id);

    setStep("otp");
    setToast({
      msg: t("otpSent"),
      type: "info",
    });

  } catch (e: any) {
    const detail = e?.response?.data?.detail;

    if (detail?.action === "blocked") {
      setBlockedInfo(detail);
      setStep("blocked");
      // FIX: a blocked transaction is persisted for audit but must never
      // count toward the daily limit. The card was still showing a stale
      // "used today" value from before this attempt, so refresh it here
      // to reflect the backend's true (unaffected) usage total.
      fetchLimitSummary();
    } else {
      setError(
        typeof detail === "string"
          ? detail
          : t("error")
      );
      setStep("form");
    }

  } finally {
    setBusy(false);
  }
}
  // ── Transfer form — Next ──────────────────────────────────────────────────
  async function handleTransferFormNext() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError(t("enterAmount")); return; }
    if (!selectedBenef) { setError("Search and select a beneficiary first."); return; }
    setError("");
    await handleTransferInitiate(selectedBenef);
  }

  // ── Add Beneficiary (inline) ──────────────────────────────────────────────
  async function handleAddBeneficiary() {
    const err = validateAccountNo(newBenefAccNo);
    if (err) { setAccNoError(err); return; }
    if (!newBenefName.trim()) { setAccNoError("Beneficiary name is required."); return; }
    setBenefBusy(true); setAccNoError("");
    try {
      const res = await bankingApi.addBeneficiary(newBenefName.trim(), newBenefAccNo.trim());
      const saved: Beneficiary = res.data;
      setSelectedBenef(saved);
      setBenefFoundMsg(`Beneficiary "${saved.name}" added.`);
      setShowAddForm(false);
      setToast({ msg: `Beneficiary "${saved.name}" added successfully.`, type: "success" });
    } catch (e: any) {
      setAccNoError(e?.response?.data?.detail || "Failed to add beneficiary.");
    } finally { setBenefBusy(false); }
  }

  // ── Deposit ───────────────────────────────────────────────────────────────
  async function handleDeposit() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError(t("enterAmount")); return; }
    setBusy(true); setError("");
    try {
      const res = await bankingApi.deposit(amt, sender || "External", note || "Deposit");
      await afterSuccess(res);
      setToast({ msg: `${t("depositSuccess")} — ${formatCurrency(amt)}`, type: "success" });
      closeFlow();
    } catch (e: any) {
      setError(e?.response?.data?.detail || t("error"));
    } finally { setBusy(false); }
  }

  // ── Withdraw initiate ─────────────────────────────────────────────────────
  async function handleWithdrawInitiate() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError(t("enterAmount")); return; }
    setBusy(true); setError("");
    try {
      if (amt > 50000) {
        const sqRes = await bankingApi.getSecurityQuestion();
        setSecQuestion(sqRes.data.question);
        setSecAttemptsUsed(sqRes.data.attempts_used || 0);
        setStep("security");
        setBusy(false);
        return;
      }
      const res = await bankingApi.initiateWithdraw(amt);
      setSessionId(res.data.session_id);
      setStep("otp");
      setToast({ msg: t("otpSent"), type: "info" });
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      if (detail?.locked) {
        setError(`Withdrawal locked until ${new Date(detail.locked_until).toLocaleTimeString()}. Too many incorrect answers.`);
      } else {
        setError(typeof detail === "string" ? detail : t("error"));
      }
    } finally { setBusy(false); }
  }


  async function handleWarningContinue() {
  if (!selectedBenef) return;

  setBusy(true);

  try {
    const res = await bankingApi.initiateTransfer(
      selectedBenef.name,
      parseFloat(amount),
      note,
      category,
      true // confirm_risk
    );

    setFraudInfo(res.data.fraud_check);
    setSessionId(res.data.session_id);
    setStep("otp");
    setToast({ msg: t("otpSent"), type: "info" });
  } catch (e: any) {
    setError(e?.response?.data?.detail || "Failed");
  } finally {
    setBusy(false);
  }
}

  // ── Security answer verify ────────────────────────────────────────────────
  async function handleSecurityConfirm() {
    if (!secAnswer.trim()) { setError("Please answer the security question."); return; }
    setBusy(true); setError("");
    try {
      await bankingApi.verifySecurityAnswer(secAnswer);
      const amt = parseFloat(amount);
      const res = await bankingApi.initiateWithdraw(amt);
      setSessionId(res.data.session_id);
      setStep("otp");
      setToast({ msg: t("otpSent"), type: "info" });
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      if (detail?.locked) {
        setError(`Withdrawal temporarily locked. Too many incorrect answers. Try again later.`);
        setToast({ msg: "Withdrawal locked for 30 minutes.", type: "error" });
        closeFlow();
      } else if (detail?.attempts_left !== undefined) {
        setError(`Incorrect answer. ${detail.attempts_left} attempt(s) remaining.`);
        setSecAttemptsUsed(3 - detail.attempts_left);
        setSecAnswer("");
      } else {
        setError(typeof detail === "string" ? detail : "Verification failed.");
      }
    } finally { setBusy(false); }
  }

  // ── OTP verify ────────────────────────────────────────────────────────────
  async function handleVerify() {
    if (otp.length !== 6) { setError(t("invalidOtp")); return; }
    if (!sessionId) return;
    setBusy(true); setError("");
    try {
      const res = flow === "transfer"
        ? await bankingApi.verifyTransfer(otp, sessionId)
        : await bankingApi.verifyWithdraw(otp, sessionId);
      await afterSuccess(res);
      setToast({ msg: res.data.message, type: "success" });
      // NEW: refresh daily limit summary after a successful transfer
      if (flow === "transfer") {
        fetchLimitSummary();
      }
      closeFlow();
    } catch (e: any) {
      setError(e?.response?.data?.detail || t("invalidOtp"));
    } finally { setBusy(false); }
  }

  const attemptsLeft = Math.max(0, 3 - secAttemptsUsed);

  return (
    <div className="flex flex-col gap-4 animate-slide-up">

      {/* Summary Cards */}
      <div className="flex gap-3 flex-wrap">
        <MetricCard label={t("totalBalance")} value={formatCurrency(balance, true)} sub="Live balance"  color="#818cf8" icon="💰" />
        <MetricCard label="Account Number"    value={accountNo ? `${accountNo.slice(0,4)}...${accountNo.slice(-4)}` : "—"} sub={accountNo || "—"} color="#6366f1" icon="🏦" />
        <MetricCard label={t("totalIncome")}  value={formatCurrency(income, true)}  sub="All deposits"  color="#10b981" icon="↑" />
        <MetricCard label={t("totalExpense")} value={formatCurrency(expense, true)} sub="All outflows"  color="#f59e0b" icon="↓" />
      </div>

      {/* Virtual Card */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div
            className="w-full sm:w-72 h-40 rounded-2xl p-5 flex flex-col justify-between text-white"
            style={{ background: "linear-gradient(135deg,#6366f1 0%,#a78bfa 100%)" }}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="text-[11px] opacity-70 mb-0.5">FinMind AI</div>
                <div className="text-[13px] font-bold">SAVINGS ACCOUNT</div>
              </div>
              <div className="text-2xl">⬡</div>
            </div>
            <div>
              <div className="text-[11px] opacity-70 mb-1">Account Number</div>
              <div className="text-[15px] font-mono font-bold tracking-widest">{accountNo || "—"}</div>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <div className="text-[10px] opacity-70">Balance</div>
                <div className="text-[18px] font-bold">{formatCurrency(balance)}</div>
              </div>
              <Pill label="ACTIVE" color="#10b981" />
            </div>
          </div>

          <div className="flex-1">
            <h3 className="text-[15px] font-bold text-slate-800 mb-3">{t("accounts")}</h3>
            <div className="grid grid-cols-2 gap-3 text-[13px]">
              {[
                ["Account Type","Individual Savings"],
                ["IFSC Code","FINM0001234"],
                ["Branch","Mumbai Main"],
                ["Currency","INR (₹)"],
                ["Status","Active"],
                ["Nominee","Not Assigned"],
              ].map(([l,v]) => (
                <div key={l} className="bg-slate-50 rounded-lg p-2.5">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">{l}</div>
                  <div className="font-semibold text-slate-800">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: `💸 ${t("transfer")}`, color: "#6366f1", f: "transfer" as const },
          { label: `🏧 ${t("withdraw")}`, color: "#f59e0b", f: "withdraw" as const },
          { label: `📥 ${t("deposit")}`,  color: "#10b981", f: "deposit"  as const },
        ].map(btn => (
          <button
            key={btn.label}
            onClick={() => openFlow(btn.f)}
            className="flex-1 min-w-[130px] py-2.5 px-4 rounded-xl font-semibold text-[13px] text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: btn.color }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* ── Deposit Modal ── */}
      <Modal open={flow === "deposit"} onClose={closeFlow} title={`📥 ${t("deposit")}`} size="sm">
        <div className="flex flex-col gap-3">
          <div>
            <label className="label-sm">{t("amount")} (₹)</label>
            <input value={amount} onChange={e=>setAmount(e.target.value)} placeholder="e.g. 5000" type="number" className="input"/>
            <p className="text-xs text-slate-500 mt-1">
              Daily deposit limit: ₹2,00,000
            </p>
          </div>
          <div>
            <label className="label-sm">{t("sender")}</label>
            <input value={sender} onChange={e=>setSender(e.target.value)} placeholder="e.g. Employer" className="input"/>
          </div>
          <div>
            <label className="label-sm">{t("note")}</label>
            <input value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. January Salary" className="input"/>
          </div>
          {error && <p className="text-[12px] text-red-500 font-semibold">{error}</p>}
          <div className="flex gap-2 mt-1">
            <button className="btn-primary flex-1" onClick={handleDeposit} disabled={busy}>
              {busy ? t("loading") : t("deposit")}
            </button>
            <button className="btn-ghost" onClick={closeFlow}>{t("cancel")}</button>
          </div>
        </div>
      </Modal>

      {/* ── Transfer Modal ── */}
      <Modal
        open={flow === "transfer" && step === "form"}
        onClose={closeFlow}
        title={`💸 ${t("transfer")}`}
        size="sm"
      >
        <div className="flex flex-col gap-3">

          {/* NEW: Quick Transfer — recently used beneficiaries */}
          {recentBenefs.length > 0 && (
            <div>
              <label className="label-sm">Quick Transfer</label>
              <div className="flex gap-2 flex-wrap">
                {recentBenefs.slice(0, 3).map(rb => (
                  <button
                    key={rb.id}
                    onClick={() => handleQuickTransferSelect(rb)}
                    className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-all active:scale-95 ${
                      selectedBenef?.id === rb.id
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                    }`}
                  >
                    {rb.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Beneficiary Search */}
          <div>
            <label className="label-sm">Recipient Name / Account Number</label>
            <div className="flex gap-2">
              <input
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  // Reset search state when query changes
                  if (searchDone) {
                    setSearchDone(false);
                    setSelectedBenef(null);
                    setBenefFoundMsg("");
                    setShowAddForm(false);
                  }
                }}
                placeholder="Search by name or account no."
                className="input flex-1"
                onKeyDown={e => e.key === "Enter" && handleSearchBeneficiary()}
              />
              <button
                onClick={handleSearchBeneficiary}
                disabled={searchBusy}
                className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-[12px] font-semibold hover:bg-indigo-700 disabled:opacity-60 whitespace-nowrap"
              >
                {searchBusy ? "…" : "Search"}
              </button>
            </div>
          </div>

          {/* Beneficiary Found */}
          {searchDone && selectedBenef && (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
              <span className="text-emerald-600 text-[13px]">✓</span>
              <div className="flex-1">
                <p className="text-[12px] font-semibold text-emerald-700">{selectedBenef.name}</p>
                <p className="text-[11px] text-emerald-600 font-mono">{selectedBenef.account_no}</p>
              </div>
              <span className="text-[10px] text-emerald-500 font-semibold uppercase tracking-wide">Found</span>
            </div>
          )}

          {/* Inline Add Beneficiary Form */}
          {showAddForm && (
            <div className="flex flex-col gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-[12px] text-amber-700 font-semibold">
                Beneficiary not found. Add them to continue.
              </p>
              <div>
                <label className="label-sm">Beneficiary Name</label>
                <input
                  value={newBenefName}
                  onChange={e => setNewBenefName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="input"
                />
              </div>
              <div>
                <label className="label-sm">
                  Account Number <span className="text-slate-400 font-normal">(13 digits)</span>
                </label>
                <input
                  value={newBenefAccNo}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, "").slice(0, 13);
                    setNewBenefAccNo(val);
                    setAccNoError(val.length > 0 ? validateAccountNo(val) : "");
                  }}
                  placeholder="1234567890123"
                  className={`input font-mono ${accNoError ? "border-red-400 focus:ring-red-300" : ""}`}
                  maxLength={13}
                />
                <div className="flex justify-between mt-1">
                  {accNoError
                    ? <p className="text-[11px] text-red-500 font-semibold">{accNoError}</p>
                    : <span />
                  }
                  <span className={`text-[11px] ${newBenefAccNo.length === 13 ? "text-emerald-600 font-semibold" : "text-slate-400"}`}>
                    {newBenefAccNo.length}/13
                  </span>
                </div>
              </div>
              <button
                className="btn-primary text-[12px] py-2"
                onClick={handleAddBeneficiary}
                disabled={benefBusy || !canAddBeneficiary}
              >
                {benefBusy ? "Saving…" : "Save Beneficiary"}
              </button>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="label-sm">{t("amount")} (₹)</label>
            <input value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Enter amount" type="number" className="input"/>
            <p className="text-[11px] text-slate-500 mt-1">
            </p>
          </div>

          {/* NEW: Daily Limit Card */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Daily Limit</p>
            {limitSummaryBusy && !limitSummary ? (
              <p className="text-[12px] text-slate-400">Loading…</p>
            ) : limitSummary ? (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-[10px] text-slate-400">Daily Limit</div>
                  <div className="text-[13px] font-bold text-slate-800">{formatCurrency(limitSummary.daily_limit)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Used Today</div>
                  <div className="text-[13px] font-bold text-amber-600">{formatCurrency(limitSummary.used_today)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Remaining</div>
                  <div className="text-[13px] font-bold text-emerald-600">{formatCurrency(limitSummary.remaining)}</div>
                </div>
              </div>
            ) : (
              <p className="text-[12px] text-slate-400">Unable to load limit summary.</p>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="label-sm">{t("note")} <span className="text-slate-400 font-normal">(Optional)</span></label>
            <input value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g. Rent, Dinner split" className="input"/>
          </div>

          {/* Category */}
          <div>
            <label className="label-sm">{t("category")}</label>
            <select value={category} onChange={e=>setCategory(e.target.value)} className="input">
              {CATEGORIES.map(c=><option key={c}>{c}</option>)}
            </select>
          </div>

          {error && <p className="text-[12px] text-red-500 font-semibold">{error}</p>}

          <div className="flex gap-2 mt-1">
            <button
              className="btn-primary flex-1"
              onClick={handleTransferFormNext}
              disabled={busy || !selectedBenef}
            >
              {busy ? t("loading") : "Send OTP →"}
            </button>
            <button className="btn-ghost" onClick={closeFlow}>{t("cancel")}</button>
          </div>
        </div>
      </Modal>

      {/* ── Withdraw — form ── */}
      <Modal
        open={flow === "withdraw" && step === "form"}
        onClose={closeFlow}
        title={`🏧 ${t("withdraw")}`}
        size="sm"
      >
        <div className="flex flex-col gap-3">
          <div>
            <label className="label-sm">{t("amount")} (₹)</label>
            <input value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Enter amount" type="number" className="input"/>
            <p className="text-[11px] text-slate-500 mt-1">
              Daily withdrawal limit: ₹1,00,000
            </p>
          </div>
          {parseFloat(amount) > 50000 && (
            <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-700">
              ⚠ High-value withdrawal requires security verification before OTP.
            </div>
          )}
          {error && <p className="text-[12px] text-red-500 font-semibold">{error}</p>}
          <div className="flex gap-2 mt-1">
            <button
              className="btn-primary flex-1"
              onClick={handleWithdrawInitiate}
              disabled={busy}
            >
              {busy ? t("loading") : "Send OTP →"}
            </button>
            <button className="btn-ghost" onClick={closeFlow}>{t("cancel")}</button>
          </div>
        </div>
      </Modal>

      {/* ── Security Question Modal ── */}
      <Modal
        open={flow==="withdraw" && step==="security"}
        onClose={closeFlow}
        title={`🔒 ${t("securityQuestion")}`}
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-slate-600">{t("securityDesc")}</p>
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-[13px] text-indigo-800 font-semibold">
            {secQuestion || "Loading question..."}
          </div>
          <div>
            <label className="label-sm">{t("yourAnswer")}</label>
            <input
              value={secAnswer}
              onChange={e=>setSecAnswer(e.target.value)}
              placeholder="Your answer..."
              className="input"
              onKeyDown={e => e.key === "Enter" && handleSecurityConfirm()}
            />
          </div>
          {secAttemptsUsed > 0 && (
            <div className="text-[12px] text-amber-600 font-semibold">
              ⚠ {attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""} remaining before withdrawal is locked.
            </div>
          )}
          {error && <p className="text-[12px] text-red-500 font-semibold">{error}</p>}
          <div className="flex gap-2">
            <button className="btn-primary flex-1" onClick={handleSecurityConfirm} disabled={busy}>
              {busy ? t("loading") : t("continueToOtp")}
            </button>
            <button className="btn-ghost" onClick={closeFlow}>{t("cancel")}</button>
          </div>
        </div>
      </Modal>

      {/* ── Fraud Warning Modal ── */}
      <Modal open={step==="fraud_warn"} onClose={closeFlow} title={t("suspiciousTitle")} size="sm">
        <div className="flex flex-col gap-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
            <p className="font-bold text-[14px] mb-2">Recipient appears suspicious.</p>
            <p className="text-[13px] mb-3">
              Risk Score: <strong>{fraudInfo?.risk_score}/100</strong>
            </p>
            {fraudInfo?.flags?.length > 0 && (
              <div>
                <p className="text-[12px] font-semibold mb-1">Reasons:</p>
                <ul className="text-[12px] list-disc list-inside space-y-0.5">
                  {fraudInfo.flags.map((f:any) => <li key={f.rule_id}>{f.rule}</li>)}
                </ul>
              </div>
            )}
            <p className="text-[13px] font-semibold mt-3">Do you want to continue?</p>
          </div>
          <div className="flex gap-2">
            <button
              className="flex-1 py-2.5 rounded-lg bg-amber-500 text-white font-semibold text-[13px] hover:bg-amber-600"
              onClick={handleWarningContinue}
            >
              Continue
            </button>
            <button
              className="flex-1 py-2.5 rounded-lg bg-slate-100 text-slate-700 font-semibold text-[13px] hover:bg-slate-200"
              onClick={closeFlow}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Blocked Modal ── */}
      <Modal open={step==="blocked"} onClose={closeFlow} title="🛑 Transaction Blocked" size="sm">
        <div className="flex flex-col gap-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-[15px] font-bold text-red-700 mb-1">Transaction blocked.</p>
            <p className="text-[13px] text-red-700 mb-3">
              Risk Score: <strong>{blockedInfo?.risk_score}/100</strong>
            </p>
            {blockedInfo?.flag_reasons?.length > 0 && (
              <div className="mb-3">
                <p className="text-[12px] font-semibold text-red-700 mb-1">Reasons:</p>
                <ul className="text-[12px] text-red-600 list-disc list-inside space-y-0.5">
                  {blockedInfo.flag_reasons.map((r:string, i:number) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
            {blockedInfo?.explanation && (
              <p className="text-[11px] text-red-500 border-t border-red-200 pt-2 mt-2">
                {blockedInfo.explanation}
              </p>
            )}
          </div>
          <button className="btn-primary" onClick={closeFlow}>Close</button>
        </div>
      </Modal>

      {/* ── OTP Modal ── */}
      <Modal
        open={(flow==="transfer" || flow==="withdraw") && step==="otp"}
        onClose={closeFlow}
        title={t("otpTitle")}
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-slate-600">{t("otpSent")}</p>
          <input
            value={otp}
            onChange={e=>setOtp(e.target.value.replace(/\D/g,"").slice(0,6))}
            placeholder="000000"
            maxLength={6}
            className="input font-mono text-xl tracking-[0.5em] text-center"
            onKeyDown={e => e.key === "Enter" && handleVerify()}
          />
          {error && <p className="text-[12px] text-red-500 font-semibold">{error}</p>}
          <div className="flex gap-2">
            <button className="btn-primary flex-1" onClick={handleVerify} disabled={busy}>
              {busy ? t("verifying") : t("otpVerify")}
            </button>
            <button className="btn-ghost" onClick={closeFlow}>{t("cancel")}</button>
          </div>
        </div>
      </Modal>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  );
}