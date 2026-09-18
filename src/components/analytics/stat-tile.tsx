"use client";

import type { ReactNode } from "react";

interface StatTileProps {
  label: string;
  value: string;
  hint?: string;
  accent?: "teal" | "purple" | "emerald" | "amber" | "rose" | "slate";
  trend?: { value: number; positiveIsGood?: boolean };
  onClick?: () => void;
  icon?: ReactNode;
}

const accentText: Record<string, string> = {
  teal: "text-[#00F2FE]",
  purple: "text-violet-400",
  emerald: "text-emerald-400",
  amber: "text-amber-400",
  rose: "text-rose-400",
  slate: "text-slate-300",
};

export function StatTile({ label, value, hint, accent = "teal", trend, onClick, icon }: StatTileProps) {
  const isClickable = Boolean(onClick);
  const trendGood =
    trend != null ? (trend.positiveIsGood === false ? trend.value <= 0 : trend.value >= 0) : null;

  return (
    <div
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      className={`dash-clay rounded-2xl p-4 transition-all duration-300 ${
        isClickable ? "cursor-pointer hover:-translate-y-1 hover:shadow-[#00F2FE]/10" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
        {icon && <span className={accentText[accent]}>{icon}</span>}
      </div>
      <p className={`mt-2 break-words text-xl font-bold leading-tight tracking-tight text-white sm:text-2xl`}>
        {value}
      </p>
      <div className="mt-1 flex items-center gap-2">
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
        {trend != null && (
          <span
            className={`text-xs font-semibold ${trendGood ? "text-emerald-400" : "text-rose-400"}`}
          >
            {trend.value >= 0 ? "▲" : "▼"} {Math.abs(trend.value).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}
