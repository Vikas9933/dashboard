"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="dash-glass flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-rose-500/20 p-8 text-center">
      <h2 className="text-lg font-semibold text-rose-300">Admin module failed to load</h2>
      <p className="mt-2 max-w-md text-sm text-rose-400/80">
        {error.message || "An unexpected error occurred while loading admin data."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/15 px-4 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/25"
      >
        Try again
      </button>
    </div>
  );
}
