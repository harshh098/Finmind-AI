import { cn } from "@/lib/utils";

interface PillProps {
  label: string;
  color?: string;
  size?: "sm" | "md";
  className?: string;
}

export default function Pill({ label, color = "#6366f1", size = "sm", className }: PillProps) {
  return (
    <span
      className={cn("pill font-semibold whitespace-nowrap", size === "md" ? "text-[11px] px-2.5 py-1" : "text-[10px] px-2 py-0.5", className)}
      style={{ background: color + "22", color }}
    >
      {label}
    </span>
  );
}
