export default function AnalyticsLoading() {
  return (
    <div className="space-y-4">
      <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
      <div className="h-12 animate-pulse rounded-2xl bg-white/5" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/5" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-2xl bg-white/5" />
    </div>
  );
}
