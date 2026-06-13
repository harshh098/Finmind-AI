"use client";

interface BarItem { label: string; income?: number; expense?: number; value?: number; }

interface BarChartProps {
  data: BarItem[];
  height?: number;
  color?: string;
  dual?: boolean;
}

export default function BarChart({ data, height = 90, color = "#6366f1", dual = false }: BarChartProps) {
  const max = Math.max(...data.map((d) => Math.max(d.income ?? d.value ?? 0, d.expense ?? 0))) || 1;

  return (
    <div>
      <div className="flex items-end gap-1" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5 h-full">
            <div className="flex-1 w-full flex items-end gap-0.5">
              {dual ? (
                <>
                  <div
                    className="flex-1 rounded-t-sm min-h-[2px] transition-all duration-500"
                    style={{ height: `${((d.income ?? 0) / max) * 100}%`, background: "#10b981", opacity: 0.85 }}
                    title={`Income: ₹${(d.income ?? 0).toLocaleString("en-IN")}`}
                  />
                  <div
                    className="flex-1 rounded-t-sm min-h-[2px] transition-all duration-500"
                    style={{ height: `${((d.expense ?? 0) / max) * 100}%`, background: "#ef4444", opacity: 0.75 }}
                    title={`Expense: ₹${(d.expense ?? 0).toLocaleString("en-IN")}`}
                  />
                </>
              ) : (
                <div
                  className="w-full rounded-t-sm min-h-[2px] transition-all duration-500"
                  style={{
                    height: `${((d.value ?? 0) / max) * 100}%`,
                    background: color,
                    opacity: i === data.length - 1 ? 1 : 0.55,
                  }}
                />
              )}
            </div>
            <span className="text-[9px] text-slate-400 whitespace-nowrap">{d.label}</span>
          </div>
        ))}
      </div>
      {dual && (
        <div className="flex gap-4 mt-2">
          <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 block" /> Income
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-500 block" /> Expense
          </span>
        </div>
      )}
    </div>
  );
}
