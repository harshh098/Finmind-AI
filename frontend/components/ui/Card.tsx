import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  noPad?: boolean;
}

export default function Card({ children, className, title, subtitle, action, noPad }: CardProps) {
  return (
    <div className={cn("bg-white rounded-xl border border-slate-200 shadow-sm", !noPad && "p-4", className)}>
      {(title || action) && (
        <div className="flex items-start justify-between mb-3">
          <div>
            {title && <h3 className="text-[14px] font-bold text-slate-900">{title}</h3>}
            {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
