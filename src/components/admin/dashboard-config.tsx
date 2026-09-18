"use client";

import { useState, useTransition } from "react";
import { Loader2, Settings2 } from "lucide-react";
import { updateDashboardConfig } from "@/app/dashboard/admin/actions";
import type { DashboardConfig } from "@/lib/types";
import { Card, CardBody } from "@/components/ui/card";

interface DashboardConfigPanelProps {
  config: DashboardConfig;
}

export function DashboardConfigPanel({ config }: DashboardConfigPanelProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await updateDashboardConfig(formData);
      if (result.error) setError(result.error);
      else if (result.success) setMessage(result.success);
    });
  }

  return (
    <Card variant="glass">
      <CardBody>
        <div className="mb-4 flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-[#00F2FE]" />
          <h3 className="font-semibold text-white">Dashboard Configuration</h3>
        </div>

        {(message || error) && (
          <div
            className={`mb-4 rounded-xl px-4 py-3 text-sm ${
              error
                ? "border border-rose-500/30 bg-rose-500/10 text-rose-300"
                : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            }`}
          >
            {error ?? message}
          </div>
        )}

        <form action={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="dashboardTitle" className="mb-1 block text-sm font-medium text-slate-400">
              Dashboard Title
            </label>
            <input
              id="dashboardTitle"
              name="dashboardTitle"
              defaultValue={config.dashboardTitle}
              className="dash-input"
            />
          </div>
          <div>
            <label htmlFor="kpiTargetPercent" className="mb-1 block text-sm font-medium text-slate-400">
              KPI Target (%)
            </label>
            <input
              id="kpiTargetPercent"
              name="kpiTargetPercent"
              type="number"
              min={0}
              max={100}
              step={0.1}
              defaultValue={config.kpiTargetPercent}
              className="dash-input"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              name="showWeeklyTrend"
              defaultChecked={config.showWeeklyTrend}
              className="rounded border-white/20 bg-white/5 text-[#00F2FE]"
            />
            Show weekly collection trend
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              name="showMonthlyTrend"
              defaultChecked={config.showMonthlyTrend}
              className="rounded border-white/20 bg-white/5 text-[#00F2FE]"
            />
            Show monthly collection trend
          </label>
          <button
            type="submit"
            disabled={isPending}
            className="dash-btn-primary flex items-center justify-center gap-2 disabled:opacity-50 md:col-span-2"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save Configuration
          </button>
        </form>
      </CardBody>
    </Card>
  );
}
