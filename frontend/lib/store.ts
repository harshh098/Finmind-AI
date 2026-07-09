import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Transaction {
  id: number; type: "deposit" | "withdraw" | "transfer";
  amount: number; sender?: string; receiver?: string;
  message?: string; category?: string; date: string;
  fraud_score: number; fraud_flags: string[]; is_flagged: boolean;
  status: "completed" | "blocked" | "warning";
}
export interface Reminder {
  rid: number; type: string; task: string; date: string;
  time: string; amount: number; status: string;
  related_to?: string; notify_before_min: number;
}
export interface User { id: number; name: string; email: string; mobile?: string; }
export interface Notification {
  id: string; type: "deposit" | "transfer" | "withdraw" | "info";
  title: string; body: string; color: string; timestamp: string; read: boolean;
}
export interface ChatMessage {
  role: "user" | "assistant"; text: string; timestamp: string;
  steps?: { node: string; detail: string }[];
}

// ─── Auth ─────────────────────────────────────────────────────────────────
interface AuthState {
  token: string | null; user: User | null; isAuthenticated: boolean;
  setToken: (token: string) => void; setUser: (user: User) => void; logout: () => void;
}
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null, user: null, isAuthenticated: false,
      setToken: (token) => { if (typeof window !== "undefined") localStorage.setItem("finmind_token", token); set({ token, isAuthenticated: true }); },
      setUser: (user) => set({ user }),
      logout: () => { if (typeof window !== "undefined") localStorage.removeItem("finmind_token"); set({ token: null, user: null, isAuthenticated: false }); },
    }),
    { name: "finmind-auth" }
  )
);

// ─── Banking ──────────────────────────────────────────────────────────────
interface BankingState {
  balance: number; accountNo: string; accountType: string;
  transactions: Transaction[]; reminders: Reminder[];
  setBalance: (b: number) => void; setAccountNo: (n: string) => void;
  setAccountType: (t: string) => void; setTransactions: (txs: Transaction[]) => void;
  setReminders: (r: Reminder[]) => void; addTransaction: (tx: Transaction) => void;
}
export const useBankingStore = create<BankingState>((set) => ({
  balance: 0, accountNo: "", accountType: "savings", transactions: [], reminders: [],
  setBalance:      (balance)      => set({ balance }),
  setAccountNo:    (accountNo)    => set({ accountNo }),
  setAccountType:  (accountType)  => set({ accountType }),
  setTransactions: (transactions) => set({ transactions }),
  setReminders:    (reminders)    => set({ reminders }),
  addTransaction:  (tx)           => set((s) => ({ transactions: [tx, ...s.transactions] })),
}));

// ─── Notifications ────────────────────────────────────────────────────────
interface NotifState {
  notifications: Notification[];
  addNotification: (n: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markRead: (id: string) => void; markAllRead: () => void; clear: () => void;
}
export const useNotifStore = create<NotifState>((set) => ({
  notifications: [],
  addNotification: (n) => set((s) => ({
    notifications: [{ ...n, id: Date.now().toString(), timestamp: new Date().toISOString(), read: false }, ...s.notifications.slice(0, 49)],
  })),
  markRead:    (id) => set((s) => ({ notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n) })),
  markAllRead: ()   => set((s) => ({ notifications: s.notifications.map(n => ({ ...n, read: true })) })),
  clear:       ()   => set({ notifications: [] }),
}));

// ─── Chat ─────────────────────────────────────────────────────────────────
interface ChatState {
  messages: ChatMessage[]; isLoading: boolean;
  agentSteps: { node: string; detail: string }[];
  addMessage: (m: ChatMessage) => void; setLoading: (v: boolean) => void;
  setAgentSteps: (s: { node: string; detail: string }[]) => void; clearChat: () => void;
}
export const useChatStore = create<ChatState>((set) => ({
  messages: [{ role: "assistant", text: "Hi! I'm FinMind AI. Ask me about balance, expenses, fraud alerts, SIP, NEFT, EMI...", timestamp: new Date().toISOString() }],
  isLoading: false, agentSteps: [],
  addMessage:    (msg)   => set((s) => ({ messages: [...s.messages, msg] })),
  setLoading:    (v)     => set({ isLoading: v }),
  setAgentSteps: (steps) => set({ agentSteps: steps }),
  clearChat: () => set({ messages: [{ role: "assistant", text: "Chat cleared. How can I help?", timestamp: new Date().toISOString() }], agentSteps: [] }),
}));

// ─── UI / Language ────────────────────────────────────────────────────────
interface UIState {
  sidebarOpen: boolean; activePage: string; language: "en" | "hi"; theme: "light" | "dark";
  toggleSidebar: () => void; setActivePage: (p: string) => void;
  setLanguage: (l: "en" | "hi") => void; setTheme: (t: "light" | "dark") => void;
}
export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true, activePage: "dashboard", language: "en", theme: "light",
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setActivePage: (activePage) => set({ activePage }),
      setLanguage:   (language)   => set({ language }),
      setTheme:      (theme)      => set({ theme }),
    }),
    { name: "finmind-ui" }
  )
);
