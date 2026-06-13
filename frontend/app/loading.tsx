export default function Loading() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      {/* Metric cards skeleton */}
      <div className="flex gap-3 flex-wrap">
        {[1,2,3,4].map(i => (
          <div key={i} className="flex-1 min-w-[130px] h-24 bg-white rounded-xl border border-slate-200" />
        ))}
      </div>
      {/* Chart row skeleton */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-[2] min-w-[260px] h-52 bg-white rounded-xl border border-slate-200" />
        <div className="flex-1 min-w-[180px] h-52 bg-white rounded-xl border border-slate-200" />
      </div>
      {/* Table skeleton */}
      <div className="h-64 bg-white rounded-xl border border-slate-200" />
    </div>
  );
}
