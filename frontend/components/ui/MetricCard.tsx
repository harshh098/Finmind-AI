import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  color?: string;
  icon?: string;
  className?: string;
}

export default function MetricCard({ label, value, sub, trend, color = "#818cf8", icon, className }: MetricCardProps) {
  const trendColor = trend === "up" ? "#10b981" : trend === "down" ? "#ef4444" : "#64748b";
  const trendArrow = trend === "up" ? "▲" : trend === "down" ? "▼" : "";

  return (
    <div className={cn("metric-card flex-1 min-w-[130px]", className)}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
        {icon && <span className="text-base">{icon}</span>}
      </div>
      <div className="text-[22px] font-bold tracking-tight" style={{ color }}>
        {value}
      </div>
      {sub && (
        <div className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color: trendColor }}>
          {trendArrow && <span>{trendArrow}</span>}
          <span>{sub}</span>
        </div>
      )}
    </div>
  );
}
