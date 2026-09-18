"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { AlertTriangle, AlertOctagon, Info, Sparkles } from "lucide-react";
import type { AlertItem, InsightItem } from "@/lib/services";

const severityConfig: Record<AlertItem["severity"], { icon: typeof Info; cls: string }> = {
  info: { icon: Info, cls: "border-sky-500/20 bg-sky-500/10 text-sky-300" },
  warning: { icon: AlertTriangle, cls: "border-amber-500/20 bg-amber-500/10 text-amber-300" },
  danger: { icon: AlertOctagon, cls: "border-rose-500/20 bg-rose-500/10 text-rose-300" },
};

export function AlertsInsightsPanel({ alerts, insights }: { alerts: AlertItem[]; insights: InsightItem[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card variant="glass">
        <CardHeader variant="glass">
          <h2 className="text-base font-semibold text-white">Smart Alerts</h2>
          <p className="mt-0.5 text-sm text-slate-400">Automatically flagged risks based on live data</p>
        </CardHeader>
        <CardBody>
          {alerts.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No active alerts — portfolio is healthy.</p>
          ) : (
            <div className="space-y-3">
              {alerts.map((a) => {
                const cfg = severityConfig[a.severity];
                const Icon = cfg.icon;
                return (
                  <div key={a.id} className={`flex items-start gap-3 rounded-xl border p-3 ${cfg.cls}`}>
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-white">{a.title}</p>
                      <p className="mt-0.5 text-xs text-slate-300">{a.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      <Card variant="glass">
        <CardHeader variant="glass">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#00F2FE]" />
            <h2 className="text-base font-semibold text-white">AI Insights</h2>
          </div>
          <p className="mt-0.5 text-sm text-slate-400">Plain-English observations generated from your data</p>
        </CardHeader>
        <CardBody>
          <ul className="space-y-3">
            {insights.map((i) => (
              <li key={i.id} className="dash-clay flex items-start gap-2 rounded-xl p-3 text-sm text-slate-200">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-400" />
                {i.text}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
