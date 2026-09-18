export default function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mx-auto h-10 w-10 animate-pulse rounded-xl bg-indigo-200" />
        <div className="mx-auto h-6 w-48 animate-pulse rounded bg-slate-200" />
        <div className="space-y-3 pt-4">
          <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-10 animate-pulse rounded-lg bg-indigo-100" />
        </div>
      </div>
    </div>
  );
}
