"use client";

interface HealthScoreProps {
  score: number;
  size?: number;
}

export default function HealthScore({ score, size = 90 }: HealthScoreProps) {
  const r = size * 0.38;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const dash = (score / 100) * circumference;
  const color = score >= 70 ? "#10b981" : score >= 45 ? "#f59e0b" : "#ef4444";
  const grade = score >= 80 ? "A" : score >= 65 ? "B" : score >= 45 ? "C" : "D";
  const label = score >= 70 ? "Good" : score >= 45 ? "Fair" : "At Risk";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={size * 0.09} />
          <circle
            cx={cx} cy={cy} r={r} fill="none"
            stroke={color} strokeWidth={size * 0.09}
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[20px] font-bold leading-none" style={{ color }}>{score}</span>
          <span className="text-[10px] text-slate-400">/100</span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-[12px] font-bold" style={{ color }}>{grade} — {label}</div>
      </div>
    </div>
  );
}
