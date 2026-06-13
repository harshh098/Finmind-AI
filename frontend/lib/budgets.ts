// FILE: frontend/lib/budgets.ts
/**
 * Dynamic budget computation — mirrors backend analytics_service.py logic.
 * Budgets are derived as percentages of the user's average monthly income,
 * with an absolute floor so they never collapse on low-income months.
 *
 * No API contract changes: callers pass transactions from the Zustand store
 * and receive the same shape as the static BUDGET_DEFAULTS object.
 */

export const CATEGORY_INCOME_PCT: Record<string, number> = {
  Rent:          25,
  Loan:          18,
  Transfer:      15,
  Groceries:      8,
  Food:           7,
  Shopping:       6,
  Transport:      4,
  Utilities:      4,
  Healthcare:     4,
  Education:      4,
  Investment:     4,
  Entertainment:  3,
  Cash:           5,
  Gifts:          3,
  General:        5,
};

export const CATEGORY_FLOOR: Record<string, number> = {
  Rent: 8000,    Loan: 5000,      Transfer: 5000,
  Groceries: 2000, Food: 1500,    Shopping: 2000,
  Transport: 1000, Utilities: 800, Healthcare: 1000,
  Education: 1000, Investment: 1000, Entertainment: 500,
  Cash: 2000,    Gifts: 500,      General: 2000,
};

export interface Transaction {
  type: string;
  amount: number;
  date: string;
  category?: string;
}

/**
 * Computes per-category monthly budgets based on the user's average monthly
 * income derived from their transaction history.
 *
 * @param transactions  All transactions from the banking store.
 * @returns             Map of category → budget amount (₹).
 */
export function computeDynamicBudgets(transactions: Transaction[]): Record<string, number> {
  // Sum income and count distinct months
  let totalIncome = 0;
  const incomeMonths = new Set<string>();

  for (const t of transactions) {
    if (t.type === "deposit") {
      totalIncome += t.amount;
      incomeMonths.add(t.date.slice(0, 7));
    }
  }

  const monthCount       = incomeMonths.size || 1;
  const avgMonthlyIncome = totalIncome / monthCount;

  const budgets: Record<string, number> = {};
  for (const [cat, pct] of Object.entries(CATEGORY_INCOME_PCT)) {
    const computed = avgMonthlyIncome * pct / 100;
    budgets[cat]   = Math.max(Math.round(computed), CATEGORY_FLOOR[cat] ?? 500);
  }
  return budgets;
}

/**
 * Generates month-over-month comparison insights from transaction data.
 */
export function getMoMInsights(transactions: Transaction[]): string[] {
  const byMonth: Record<string, { income: number; expense: number }> = {};

  for (const t of transactions) {
    const mo = t.date.slice(0, 7);
    if (!byMonth[mo]) byMonth[mo] = { income: 0, expense: 0 };
    if (t.type === "deposit") byMonth[mo].income += t.amount;
    else byMonth[mo].expense += t.amount;
  }

  const months = Object.keys(byMonth).sort();
  if (months.length < 2) return [];

  const insights: string[] = [];
  const last = months[months.length - 1];
  const prev = months[months.length - 2];
  const lastExp = byMonth[last].expense;
  const prevExp = byMonth[prev].expense;
  const lastInc = byMonth[last].income;
  const prevInc = byMonth[prev].income;

  if (prevExp > 0) {
    const expChg    = ((lastExp - prevExp) / prevExp * 100).toFixed(1);
    const direction = lastExp > prevExp ? "increased" : "decreased";
    const sign      = lastExp > prevExp ? "📈" : "📉";
    insights.push(
      `${sign} Spending ${direction} by ${Math.abs(Number(expChg))}% vs last month ` +
      `(₹${lastExp.toLocaleString("en-IN", { maximumFractionDigits: 0 })} vs ` +
      `₹${prevExp.toLocaleString("en-IN", { maximumFractionDigits: 0 })}).`
    );
  }

  if (prevInc > 0) {
    const incChg = ((lastInc - prevInc) / prevInc * 100);
    if (Math.abs(incChg) >= 5) {
      const direction = incChg > 0 ? "up" : "down";
      insights.push(
        `💰 Income is ${direction} ${Math.abs(incChg).toFixed(1)}% vs last month ` +
        `(₹${lastInc.toLocaleString("en-IN", { maximumFractionDigits: 0 })} vs ` +
        `₹${prevInc.toLocaleString("en-IN", { maximumFractionDigits: 0 })}).`
      );
    }
  }

  // 3-month rolling average (if enough history)
  if (months.length >= 4) {
    const rolling = months.slice(-4, -1).reduce((s, m) => s + byMonth[m].expense, 0) / 3;
    if (rolling > 0) {
      const delta = ((lastExp - rolling) / rolling * 100);
      if (Math.abs(delta) >= 10) {
        const verdict = delta > 0 ? "above" : "below";
        insights.push(
          `📊 This month's spend is ${Math.abs(delta).toFixed(1)}% ${verdict} your 3-month average ` +
          `(₹${lastExp.toLocaleString("en-IN", { maximumFractionDigits: 0 })} vs avg ` +
          `₹${Math.round(rolling).toLocaleString("en-IN")}).`
        );
      }
    }
  }

  return insights;
}