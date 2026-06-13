"use client";
import { useState } from "react";
import Card from "@/components/ui/Card";
import Toast from "@/components/ui/Toast";
import { useUIStore, useAuthStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { authApi } from "@/lib/api";
import { useRouter } from "next/navigation";

const SECTIONS = ["Profile","Security","Notifications","Appearance"] as const;
type Section = typeof SECTIONS[number];

export default function SettingsPage() {
  const { language, setLanguage, theme, setTheme } = useUIStore();
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const t = useT();
  const [active, setActive] = useState<Section>("Profile");
  const [toast,  setToast]  = useState<{ msg: string; type: "success"|"error" }|null>(null);

  const [profile, setProfile] = useState({
    name:   user?.name  || "Demo User",
    email:  user?.email || "demo@finmind.ai",
    mobile: user?.mobile || "+91 99875 68547",
    city: "Mumbai",
  });
  const [security, setSecurity] = useState({ otpOnTransfer:true, otpOnWithdraw:true, fraudAlerts:true, loginAlerts:false });
  const [notifications, setNotifications] = useState({ emailReminders:true, smsReminders:true, pushAlerts:false, weeklyReport:true });

  function save() { setToast({ msg: "Settings saved!", type: "success" }); }

  const InputRow = ({ label, value, onChange, type="text" }: { label:string; value:string; onChange:(v:string)=>void; type?:string }) => (
    <div>
      <label className="block text-[12px] font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">{label}</label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} className="input max-w-sm dark:bg-slate-800 dark:text-white dark:border-slate-700"/>
    </div>
  );

  const Toggle = ({ label, desc, value, onChange }: { label:string; desc?:string; value:boolean; onChange:(v:boolean)=>void }) => (
    <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
      <div><div className="text-[13px] font-semibold text-slate-800 dark:text-white">{label}</div>{desc && <div className="text-[11px] text-slate-400 dark:text-slate-400 mt-0.5">{desc}</div>}</div>
      <button onClick={()=>onChange(!value)} className={`w-11 h-6 rounded-full transition-colors relative ${value?"bg-indigo-600":"bg-slate-200 dark:bg-slate-600"}`}>
        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform shadow ${value?"translate-x-6":"translate-x-1"}`}/>
      </button>
    </div>
  );

  function handleSignOut() {
    logout();
    authApi.logout();
    router.push("/login");
  }

  return (
    <div className="flex gap-5 flex-wrap animate-slide-up">
      {/* Sidebar nav */}
      <div className="w-44 flex-shrink-0">
        <Card noPad>
          <nav className="py-2">
            {SECTIONS.map(s => (
              <button key={s} onClick={()=>setActive(s)}
                className={`w-full text-left px-4 py-2.5 text-[13px] font-medium transition-all ${active===s?"bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-semibold border-r-2 border-indigo-600":"text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50"}`}>
                {s}
              </button>
            ))}
          </nav>
        </Card>
        <button onClick={handleSignOut}
          className="w-full mt-3 px-4 py-2.5 text-[13px] font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors flex items-center gap-2 justify-center">
          <span>⏻</span>{t("signOut")}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-[280px] flex flex-col gap-4">
        {active==="Profile" && (
          <Card title={`👤 ${t("profile")}`} subtitle="Update your personal information">
            <div className="flex items-center gap-4 mb-5 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
              <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-2xl font-bold text-white">
                {user?.name?.split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2) || "DU"}
              </div>
              <div>
                <div className="text-[16px] font-bold text-slate-800 dark:text-white">{profile.name}</div>
                <div className="text-[13px] text-slate-500 dark:text-slate-400">{profile.email}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputRow label="Full Name"     value={profile.name}   onChange={v=>setProfile(p=>({...p,name:v}))}/>
              <InputRow label="Email"         value={profile.email}  onChange={v=>setProfile(p=>({...p,email:v}))} type="email"/>
              <InputRow label="Mobile Number" value={profile.mobile} onChange={v=>setProfile(p=>({...p,mobile:v}))} type="tel"/>
              <InputRow label="City"          value={profile.city}   onChange={v=>setProfile(p=>({...p,city:v}))}/>
            </div>
          </Card>
        )}

        {active==="Security" && (
          <Card title={`🔐 ${t("security")}`} subtitle="OTP, fraud alerts, and account protection">
            <Toggle label="OTP for Transfers"  desc="Require Twilio OTP for all fund transfers"  value={security.otpOnTransfer} onChange={v=>setSecurity(s=>({...s,otpOnTransfer:v}))}/>
            <Toggle label="OTP for Withdrawals" desc="Require OTP for cash withdrawals"           value={security.otpOnWithdraw} onChange={v=>setSecurity(s=>({...s,otpOnWithdraw:v}))}/>
            <Toggle label="Fraud Alerts"        desc="Get notified for suspicious transactions"    value={security.fraudAlerts}   onChange={v=>setSecurity(s=>({...s,fraudAlerts:v}))}/>
            <Toggle label="Login Alerts"        desc="SMS on new login to your account"            value={security.loginAlerts}   onChange={v=>setSecurity(s=>({...s,loginAlerts:v}))}/>
          </Card>
        )}

        {active==="Notifications" && (
          <Card title={`🔔 ${t("notifications")}`} subtitle="Control how you receive alerts">
            <Toggle label="Email Reminders"  value={notifications.emailReminders}  onChange={v=>setNotifications(n=>({...n,emailReminders:v}))}/>
            <Toggle label="SMS Reminders"    value={notifications.smsReminders}    onChange={v=>setNotifications(n=>({...n,smsReminders:v}))}/>
            <Toggle label="Push Alerts"      value={notifications.pushAlerts}      onChange={v=>setNotifications(n=>({...n,pushAlerts:v}))}/>
            <Toggle label="Weekly Report"    value={notifications.weeklyReport}    onChange={v=>setNotifications(n=>({...n,weeklyReport:v}))}/>
          </Card>
        )}

        {active==="Appearance" && (
          <Card title={`🎨 ${t("appearance")}`} subtitle="Theme, language, and display preferences">
            <div className="space-y-5">
              <div>
                <label className="label-sm dark:text-slate-400">{t("language")}</label>
                <div className="flex gap-3 mt-2">
                  {([["en","English"],["hi","हिन्दी"]] as const).map(([l,label]) => (
                    <button key={l} onClick={()=>setLanguage(l)}
                      className={`px-4 py-2 rounded-lg border text-[13px] font-semibold transition-all ${language===l?"bg-indigo-600 text-white border-indigo-600":"bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"}`}>
                      {label}
                    </button>
                  ))}
                </div>
                {language === "hi" && <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-2">✓ हिन्दी भाषा सक्रिय — UI पुनः लोड करने पर पूरी तरह हिन्दी में दिखेगा।</p>}
              </div>
              <div>
                <label className="label-sm dark:text-slate-400">{t("theme")}</label>
                <div className="flex gap-3 mt-2">
                  {["light","dark"].map(th => (
                    <button key={th} onClick={()=>setTheme(th as "light"|"dark")}
                      className={`px-4 py-2 rounded-lg border text-[13px] font-semibold capitalize transition-all ${theme===th?"bg-indigo-600 text-white border-indigo-600":"bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"}`}>
                      {th === "light" ? "☀ Light" : "🌙 Dark"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label-sm dark:text-slate-400">Currency</label>
                <select className="input max-w-xs dark:bg-slate-800 dark:text-white dark:border-slate-700"><option>INR (₹)</option><option>USD ($)</option><option>EUR (€)</option></select>
              </div>
              <div>
                <label className="label-sm dark:text-slate-400">Date Format</label>
                <select className="input max-w-xs dark:bg-slate-800 dark:text-white dark:border-slate-700"><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option><option>YYYY-MM-DD</option></select>
              </div>
            </div>
          </Card>
        )}

        <button className="btn-primary self-start" onClick={save}>{t("save")} Changes</button>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  );
}