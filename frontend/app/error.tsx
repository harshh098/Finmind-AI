"use client";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
      <div className="text-6xl">⚠️</div>
      <h2 className="text-2xl font-black text-slate-800">Something went wrong</h2>
      <p className="text-slate-500 max-w-md text-[14px]">{error.message || "An unexpected error occurred."}</p>
      <button className="btn-primary" onClick={reset}>Try Again</button>
    </div>
  );
}
