// FILE: frontend/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export function formatCurrency(amount: number, compact = false): string {
  if (compact) {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000)   return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

export const CATEGORY_COLORS: Record<string, string> = {
  Income:"#10b981", Transfer:"#6366f1", Cash:"#f59e0b", Rent:"#ef4444",
  Food:"#f97316", Groceries:"#84cc16", Interest:"#06b6d4", Gifts:"#ec4899",
  Loan:"#8b5cf6", Refund:"#14b8a6", General:"#6b7280", Shopping:"#f97316",
  Healthcare:"#06b6d4", Education:"#3b82f6", Transport:"#a78bfa",
  Investment:"#10b981", Utilities:"#64748b", Entertainment:"#ec4899",
};

export const TYPE_ICONS: Record<string, string> = { deposit:"↙", transfer:"↗", withdraw:"↓" };

export const REMINDER_TYPE_COLORS: Record<string, string> = {
  emi:"#ef4444", sip:"#10b981", insurance:"#f59e0b", tax_saving:"#818cf8",
  loan_payment:"#f97316", fd_maturity:"#06b6d4", rd:"#8b5cf6",
  mutual_fund_sip:"#10b981", general:"#6b7280",
};

export const REMINDER_TYPE_ICONS: Record<string, string> = {
  emi:"📋", sip:"📈", insurance:"🛡️", tax_saving:"💰",
  loan_payment:"🏦", fd_maturity:"🔒", rd:"💳",
  mutual_fund_sip:"📊", general:"📌",
};

export const BUDGET_DEFAULTS: Record<string, number> = {
  Rent:15000, Food:6000, Groceries:5000, Shopping:8000, Transport:3000,
  Healthcare:3000, Education:5000, General:10000, Transfer:30000,
  Cash:10000, Gifts:3000, Loan:20000, Investment:10000, Utilities:3000,
};

export function formatTime(time: string): string {
  // Expects "HH:mm" format
  const [hourStr, minute] = time.split(":");
  const hour = parseInt(hourStr, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${ampm}`;
}