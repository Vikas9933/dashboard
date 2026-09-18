"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function DashboardError({
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
    <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-50 p-8 text-center">
      <h2 className="text-lg font-semibold text-rose-900">Dashboard failed to load</h2>
      <p className="mt-2 max-w-md text-sm text-rose-700">
        {error.message || "An unexpected error occurred while loading dashboard data."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
      >
        Try again
      </button>
    </div>
  );
}
