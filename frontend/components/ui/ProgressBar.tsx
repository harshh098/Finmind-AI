interface ProgressBarProps {
  value: number;        // 0-100
  max?: number;
  color?: string;
  height?: number;
  showLabel?: boolean;
}

export default function ProgressBar({ value, max = 100, color = "#6366f1", height = 6, showLabel = false }: ProgressBarProps) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const barColor = pct >= 100 ? "#ef4444" : pct >= 80 ? "#f59e0b" : color;
  return (
    <div>
      <div className="rounded-full bg-slate-100 overflow-hidden" style={{ height }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
      {showLabel && (
        <span className="text-[10px] text-slate-400 mt-0.5 block">{pct}%</span>
      )}
    </div>
  );
}
