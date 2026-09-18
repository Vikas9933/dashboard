"use client";

import {
  Briefcase,
  CircleDollarSign,
  HandCoins,
  Percent,
  UserCheck,
  Users,
  Wallet,
  XCircle,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";

export const KPI_ICONS = {
  briefcase: Briefcase,
  wallet: Wallet,
  percent: Percent,
  handCoins: HandCoins,
  checkCircle: CheckCircle2,
  xCircle: XCircle,
  userCheck: UserCheck,
  users: Users,
  circleDollar: CircleDollarSign,
} as const;

export type KpiIconName = keyof typeof KPI_ICONS;

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: KpiIconName;
  accent?: "teal" | "purple" | "emerald" | "amber" | "rose";
}

const accentStyles = {
  teal: "bg-[#00F2FE]/15 text-[#00F2FE] shadow-[#00F2FE]/20",
  purple: "bg-violet-500/15 text-violet-400 shadow-violet-500/20",
  emerald: "bg-emerald-500/15 text-emerald-400 shadow-emerald-500/20",
  amber: "bg-amber-500/15 text-amber-400 shadow-amber-500/20",
  rose: "bg-rose-500/15 text-rose-400 shadow-rose-500/20",
};

export function KpiCard({
  title,
  value,
  subtitle,
  icon,
  accent = "teal",
}: KpiCardProps) {
  const Icon: LucideIcon = KPI_ICONS[icon];

  return (
    <Card
      variant="clay"
      className="group transition-all duration-300 hover:-translate-y-1 hover:shadow-[#00F2FE]/10"
    >
      <CardBody>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{title}</p>
            <p className="mt-2 break-words text-xl font-bold leading-tight tracking-tight text-white sm:text-2xl">
              {value}
            </p>
            {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
          </div>
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-lg sm:h-12 sm:w-12 ${accentStyles[accent]}`}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
