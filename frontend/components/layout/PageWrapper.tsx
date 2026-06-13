// FILE: frontend/components/layout/PageWrapper.tsx
import { cn } from "@/lib/utils";

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}

export default function PageWrapper({ children, className, title, subtitle }: PageWrapperProps) {
  return (
    <div className={cn("flex flex-col gap-4 animate-slide-up", className)}>
      {(title || subtitle) && (
        <div>
          {title    && <h1 className="text-[20px] font-bold text-slate-900 tracking-tight">{title}</h1>}
          {subtitle && <p  className="text-[13px] text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
