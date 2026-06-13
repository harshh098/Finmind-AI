/**
 * i18n translations — English + Hindi
 * Usage: const t = useT(); t("balance")
 */
export const translations = {
  en: {
    // Nav
    dashboard: "Dashboard", accounts: "Accounts", transactions: "Transactions",
    aiAssistant: "AI Assistant", expenseTracker: "Expense Tracker",
    fraudDetection: "Fraud Detection", financialInsights: "Financial Insights",
    reminders: "Reminders", settings: "Settings", signOut: "Sign Out",
    // Common
    balance: "Balance", amount: "Amount", send: "Send", cancel: "Cancel",
    confirm: "Confirm", loading: "Loading...", success: "Success", error: "Error",
    refresh: "Refresh", save: "Save", add: "Add", delete: "Delete", edit: "Edit",
    viewAll: "View All", retry: "Retry",
    // Banking
    deposit: "Deposit Funds", transfer: "Transfer Funds", withdraw: "Withdraw Cash",
    depositSuccess: "Deposited successfully", transferSuccess: "Transferred successfully",
    withdrawSuccess: "Withdrawn successfully", insufficientBalance: "Insufficient balance",
    enterAmount: "Enter amount", recipient: "Recipient Name", note: "Note (optional)",
    category: "Category", sender: "Source / Sender",
    // OTP
    otpSent: "OTP sent to your registered mobile.", enterOtp: "Enter 6-digit OTP",
    verifying: "Verifying...", invalidOtp: "Invalid or expired OTP.",
    otpVerify: "Verify OTP", otpTitle: "🔐 Enter OTP",
    // Security question
    securityQuestion: "Security Verification", securityDesc: "High-value withdrawal requires additional verification.",
    yourAnswer: "Your Answer", continueToOtp: "Continue to OTP",
    // Fraud
    suspiciousTitle: "⚠ Suspicious Transaction", suspiciousDesc: "This recipient appears suspicious.",
    riskScore: "Risk Score", flaggedReasons: "Flagged Reasons", continueAnyway: "Continue Anyway",
    transactionBlocked: "Transaction Blocked", blockedExplanation: "Your transaction was blocked by the fraud detection system.",
    // Notifications
    notif: "Notifications", noNotif: "No notifications yet", markAllRead: "Mark all read",
    // Dashboard
    totalBalance: "Total Balance", totalIncome: "Total Income", totalExpense: "Total Expense",
    netSavings: "Net Savings", recentTx: "Recent Transactions", fraudMonitor: "Fraud Monitor",
    // Reminders
    addReminder: "Add Reminder", saveReminder: "Save Reminder", taskDesc: "Task Description",
    date: "Date", time: "Time", notifyBefore: "Notify Before",
    // Settings
    profile: "Profile", security: "Security", notifications: "Notifications",
    aiRag: "AI & RAG", appearance: "Appearance", about: "About",
    language: "Language", theme: "Theme",
  },
  hi: {
    // Nav
    dashboard: "डैशबोर्ड", accounts: "खाता", transactions: "लेनदेन",
    aiAssistant: "AI सहायक", expenseTracker: "खर्च ट्रैकर",
    fraudDetection: "धोखाधड़ी जांच", financialInsights: "वित्तीय जानकारी",
    reminders: "रिमाइंडर", settings: "सेटिंग्स", signOut: "साइन आउट",
    // Common
    balance: "बैलेंस", amount: "राशि", send: "भेजें", cancel: "रद्द करें",
    confirm: "पुष्टि करें", loading: "लोड हो रहा है...", success: "सफलता", error: "त्रुटि",
    refresh: "रिफ्रेश", save: "सहेजें", add: "जोड़ें", delete: "हटाएं", edit: "संपादित करें",
    viewAll: "सब देखें", retry: "पुनः प्रयास",
    // Banking
    deposit: "पैसे जमा करें", transfer: "पैसे ट्रांसफर करें", withdraw: "नकद निकालें",
    depositSuccess: "सफलतापूर्वक जमा हुआ", transferSuccess: "सफलतापूर्वक ट्रांसफर हुआ",
    withdrawSuccess: "सफलतापूर्वक निकाला गया", insufficientBalance: "अपर्याप्त बैलेंस",
    enterAmount: "राशि दर्ज करें", recipient: "प्राप्तकर्ता का नाम", note: "नोट (वैकल्पिक)",
    category: "श्रेणी", sender: "स्रोत / भेजने वाला",
    // OTP
    otpSent: "OTP आपके पंजीकृत मोबाइल पर भेजा गया।", enterOtp: "6 अंकों का OTP दर्ज करें",
    verifying: "सत्यापित हो रहा है...", invalidOtp: "अमान्य या समयसीमा समाप्त OTP।",
    otpVerify: "OTP सत्यापित करें", otpTitle: "🔐 OTP दर्ज करें",
    // Security question
    securityQuestion: "सुरक्षा सत्यापन", securityDesc: "उच्च मूल्य निकासी के लिए अतिरिक्त सत्यापन आवश्यक है।",
    yourAnswer: "आपका उत्तर", continueToOtp: "OTP पर जारी रखें",
    // Fraud
    suspiciousTitle: "⚠ संदिग्ध लेनदेन", suspiciousDesc: "यह प्राप्तकर्ता संदिग्ध लगता है।",
    riskScore: "जोखिम स्कोर", flaggedReasons: "चिह्नित कारण", continueAnyway: "फिर भी जारी रखें",
    transactionBlocked: "लेनदेन अवरुद्ध", blockedExplanation: "आपका लेनदेन धोखाधड़ी प्रणाली द्वारा अवरुद्ध किया गया।",
    // Notifications
    notif: "सूचनाएं", noNotif: "अभी कोई सूचना नहीं", markAllRead: "सभी पढ़ा हुआ चिह्नित करें",
    // Dashboard
    totalBalance: "कुल बैलेंस", totalIncome: "कुल आय", totalExpense: "कुल खर्च",
    netSavings: "शुद्ध बचत", recentTx: "हाल के लेनदेन", fraudMonitor: "धोखाधड़ी मॉनिटर",
    // Reminders
    addReminder: "रिमाइंडर जोड़ें", saveReminder: "रिमाइंडर सहेजें", taskDesc: "कार्य विवरण",
    date: "तारीख", time: "समय", notifyBefore: "पहले सूचित करें",
    // Settings
    profile: "प्रोफ़ाइल", security: "सुरक्षा", notifications: "सूचनाएं",
    aiRag: "AI और RAG", appearance: "रूप", about: "के बारे में",
    language: "भाषा", theme: "थीम",
  },
} as const;

export type LangKey = keyof typeof translations.en;

export function useT() {
  // Must be called inside React component — reads from useUIStore
  if (typeof window === "undefined") {
    return (key: LangKey) => translations.en[key] ?? key;
  }
  try {
    const stored = JSON.parse(localStorage.getItem("finmind-ui") || "{}");
    const lang: "en" | "hi" = stored?.state?.language === "hi" ? "hi" : "en";
    return (key: LangKey) => (translations[lang] as Record<string, string>)[key] ?? (translations.en as Record<string, string>)[key] ?? key;
  } catch {
    return (key: LangKey) => translations.en[key] ?? key;
  }
}
