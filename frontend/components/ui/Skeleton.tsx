import { cn } from "@/lib/utils";

export default function Skeleton({ className, rows = 1 }: { className?: string; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={cn("skeleton", className || "h-4 w-full rounded")} />
      ))}
    </>
  );
}
