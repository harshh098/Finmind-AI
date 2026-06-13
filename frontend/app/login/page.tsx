"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { authApi } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { setToken, setUser } = useAuthStore();
  const [mode,     setMode]     = useState<"login"|"register">("login");
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [mobile,   setMobile]   = useState("");
  const [password, setPassword] = useState("");
  const [busy,     setBusy]     = useState(false);
  const [error,    setError]    = useState("");

  const DEMO_USERS = [
    { label:"Harsh Mishra",  email:"harsh@finmind.ai" },
    { label:"Priya Sharma",  email:"priya@finmind.ai" },
    { label:"Rohan Verma",   email:"rohan@finmind.ai" },
    { label:"Neha Gupta",    email:"neha@finmind.ai"  },
    { label:"Ajay Patel",    email:"ajay@finmind.ai"  },
    { label:"Sunita Rao",    email:"sunita@finmind.ai"}
  ];

  async function handleSubmit() {
    if (!email || !password) { setError("Email and password are required."); return; }
    if (mode === "register" && !name) { setError("Name is required."); return; }
    setBusy(true); setError("");
    try {
      const res = mode === "login"
        ? await authApi.login(email, password)
        : await authApi.register(name, email, password, mobile || undefined);

      const data = res.data;
      // Store token in localStorage AND cookie before redirect
      localStorage.setItem("finmind_token", data.access_token);
      document.cookie = `finmind_auth=${data.access_token}; path=/; max-age=86400`;
      setToken(data.access_token);

      try {
        const me = await authApi.me();
        setUser(me.data);
      } catch {
        setUser({ id: data.user_id, name: data.name || name, email });
      }
      router.push("/");
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Authentication failed. Check credentials.");
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-3xl mx-auto mb-4 shadow-xl">⬡</div>
          <h1 className="text-[28px] font-bold text-white tracking-tight">FinMind AI</h1>
          <p className="text-slate-400 text-[14px] mt-1">AI-Powered Banking Assistant</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
            {(["login","register"] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 py-2 rounded-lg text-[13px] font-semibold capitalize transition-all ${mode===m?"bg-white text-indigo-700 shadow-sm":"text-slate-500 hover:text-slate-700"}`}>
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            {mode === "register" && (
              <div>
                <label className="label-sm">Full Name</label>
                <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Harsh Mishra" className="input" onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
              </div>
            )}
            <div>
              <label className="label-sm">Email</label>
              <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@finmind.ai" type="email" className="input" onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
            </div>
            {mode === "register" && (
              <div>
                <label className="label-sm">Mobile (optional)</label>
                <input value={mobile} onChange={e=>setMobile(e.target.value)} placeholder="+91 99xxx xxxxx" type="tel" className="input"/>
              </div>
            )}
            <div>
              <label className="label-sm">Password</label>
              <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" type="password" className="input" onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
            </div>

            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-700 font-medium">{error}</div>}

            <button className="btn-primary w-full mt-2" onClick={handleSubmit} disabled={busy}>
              {busy ? "Please wait..." : mode==="login" ? "Sign In →" : "Create Account →"}
            </button>
          </div>

          {mode === "login" && (
            <div className="mt-6 pt-5 border-t border-slate-100">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3 text-center">
                Demo Users — password: <code className="bg-slate-100 px-1 rounded">Demo@1234</code>
              </p>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_USERS.map(u => (
                  <button key={u.email} onClick={() => { setEmail(u.email); setPassword("Demo@1234"); }}
                    className="text-left px-3 py-2 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                    <div className="text-[12px] font-semibold text-slate-700">{u.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{u.note}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <p className="text-center text-slate-500 text-[12px] mt-6">Secure · AI-Powered · Real-time fraud detection</p>
      </div>
    </div>
  );
}
