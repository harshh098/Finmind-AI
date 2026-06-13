interface StatRowProps {
  label: string;
  value: string | number;
  color?: string;
  borderBottom?: boolean;
}

export default function StatRow({ label, value, color, borderBottom = true }: StatRowProps) {
  return (
    <div className={`flex justify-between items-center py-2 text-[12px] ${borderBottom ? "border-b border-slate-50" : ""}`}>
      <span className="text-slate-500 font-medium">{label}</span>
      <span className="font-bold text-slate-800" style={color ? { color } : undefined}>
        {value}
      </span>
    </div>
  );
}
