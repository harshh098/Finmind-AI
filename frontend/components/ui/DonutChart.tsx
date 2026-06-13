"use client";

interface Segment { label: string; value: number; color: string; }

interface DonutChartProps {
  segments: Segment[];
  size?: number;
  showLegend?: boolean;
}

export default function DonutChart({ segments, size = 120, showLegend = false }: DonutChartProps) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const cx = size / 2, cy = size / 2;
  const r = size * 0.38, ir = size * 0.22;
  let angle = -Math.PI / 2;

  const paths = segments.map((seg, i) => {
    const a = (seg.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
    const x2 = cx + r * Math.cos(angle + a), y2 = cy + r * Math.sin(angle + a);
    const ix1 = cx + ir * Math.cos(angle), iy1 = cy + ir * Math.sin(angle);
    const ix2 = cx + ir * Math.cos(angle + a), iy2 = cy + ir * Math.sin(angle + a);
    const large = a > Math.PI ? 1 : 0;
    const d = `M${x1} ${y1}A${r} ${r} 0 ${large} 1 ${x2} ${y2}L${ix2} ${iy2}A${ir} ${ir} 0 ${large} 0 ${ix1} ${iy1}Z`;
    angle += a;
    return <path key={i} d={d} fill={seg.color} opacity={0.88} />;
  });

  return (
    <div className={showLegend ? "flex items-center gap-4" : ""}>
      <svg width={size} height={size}>
        {paths}
        <circle cx={cx} cy={cy} r={ir - 3} fill="white" />
      </svg>
      {showLegend && (
        <div className="flex flex-col gap-1.5">
          {segments.slice(0, 5).map((s) => (
            <div key={s.label} className="flex items-center gap-2 text-[11px]">
              <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: s.color }} />
              <span className="text-slate-500 flex-1">{s.label}</span>
              <span className="font-semibold text-slate-700">
                ₹{(s.value / 1000).toFixed(1)}K
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
