import axios, { AxiosInstance } from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("finmind_token");
  document.cookie = "finmind_auth=; path=/; max-age=0";
}

function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    headers: { "Content-Type": "application/json" },
  });

  client.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("finmind_token");
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err.response?.status === 401 && typeof window !== "undefined") {
        clearAuth();
        window.location.href = "/login";
      }
      return Promise.reject(err);
    }
  );

  return client;
}

export const api = createApiClient();

export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),

  register: (
    name: string,
    email: string,
    password: string,
    mobile?: string
  ) => api.post("/auth/register", { name, email, password, mobile }),

  me: () => api.get("/auth/me"),

  logout: () => {
    clearAuth();
    if (typeof window !== "undefined") window.location.href = "/login";
  },
};

export const bankingApi = {
  getBalance: () => api.get("/banking/balance"),

  getTransactions: (limit = 100, type?: string) =>
    api.get("/banking/transactions", {
      params: { limit, tx_type: type },
    }),

  // ===== BENEFICIARIES =====
  getBeneficiaries: () =>
    api.get("/banking/beneficiaries"),

  addBeneficiary: (
    name: string,
    account_no: string
  ) =>
    api.post("/banking/beneficiaries", {
      name,
      account_no,
    }),

  deleteBeneficiary: (id: number) =>
    api.delete(`/banking/beneficiaries/${id}`),

  deposit: (amount: number, sender: string, message?: string) =>
    api.post("/banking/deposit", {
      amount,
      sender,
      message,
    }),

  getSecurityQuestion: () =>
    api.get("/banking/withdraw/security-question"),

  verifySecurityAnswer: (answer: string) =>
    api.post("/banking/withdraw/verify-security", {
      answer,
    }),

  initiateWithdraw: (amount: number) =>
    api.post("/banking/withdraw/initiate", {
      amount,
    }),

  verifyWithdraw: (otp: string, sessionId: number) =>
    api.post("/banking/withdraw/verify", {
      otp,
      session_id: sessionId,
    }),

  initiateTransfer: (
    receiver: string,
    amount: number,
    message?: string,
    category?: string
  ) =>
    api.post("/banking/transfer/initiate", {
      receiver,
      amount,
      message,
      category,
    }),

  verifyTransfer: (otp: string, sessionId: number) =>
    api.post("/banking/transfer/verify", {
      otp,
      session_id: sessionId,
    }),
};

export const remindersApi = {
  getAll: (status?: string) =>
    api.get("/reminders/", { params: { status } }),

  create: (data: Record<string, unknown>) =>
    api.post("/reminders/", data),

  update: (rid: number, data: Record<string, unknown>) =>
    api.put(`/reminders/${rid}`, data),

  delete: (rid: number) =>
    api.delete(`/reminders/${rid}`),

  complete: (rid: number) =>
    api.patch(`/reminders/${rid}/complete`),
};

export const agentApi = {
  query: (query: string) =>
    api.post("/agent/query", { query }),

  health: () =>
    api.get("/agent/health"),
};

export const fraudApi = {
  getReport: () =>
    api.get("/fraud/report"),

  getRules: () =>
    api.get("/fraud/rules"),

  getStats: () =>
    api.get("/fraud/stats"),
};

export const analyticsApi = {
  expenseAnalysis: () =>
    api.get("/transactions/expense-analysis"),

  summary: () =>
    api.get("/analytics/summary"),

  categories: () =>
    api.get("/transactions/categories"),

  monthly: () =>
    api.get("/transactions/monthly"),
};