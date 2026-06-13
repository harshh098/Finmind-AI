import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
      <div className="text-6xl">🔍</div>
      <h1 className="text-3xl font-black text-slate-800">404 — Page Not Found</h1>
      <p className="text-slate-500 text-[15px] max-w-md">
        The page you're looking for doesn't exist. Head back to the dashboard.
      </p>
      <Link href="/" className="btn-primary mt-2 inline-block">
        ← Back to Dashboard
      </Link>
    </div>
  );
}
