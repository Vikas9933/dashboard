"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BrainCircuit,
  CreditCard,
  FileDown,
  LayoutDashboard,
  LogOut,
  MapPin,
  Plug,
  Scale,
  Search,
  Shield,
  Settings,
  Users,
  Webhook,
  X,
  Menu,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { canAccessAdmin, canAccessPlatform } from "@/lib/auth/permissions";
import { formatRole } from "@/lib/format";
import type { Profile, SubscriptionFeatureKey, TenantSubscriptionContext } from "@/lib/types";
import { useState } from "react";

const navItems: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  hash: string;
  featureKey?: SubscriptionFeatureKey;
  requiresExport?: boolean;
}[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, hash: "", featureKey: "dashboard" },
  { href: "/dashboard#agents", label: "Agents", icon: Users, hash: "#agents", featureKey: "dashboard" },
  { href: "/dashboard#teams", label: "Teams", icon: Users, hash: "#teams", featureKey: "dashboard" },
  { href: "/dashboard#buckets", label: "Buckets", icon: BarChart3, hash: "#buckets", featureKey: "dashboard" },
  { href: "/dashboard#search", label: "Customer Search", icon: Search, hash: "#search", featureKey: "search_filters" },
  { href: "/dashboard#visits", label: "Field Visits", icon: MapPin, hash: "#visits", featureKey: "customer_management" },
  { href: "/dashboard#settlements", label: "Settlements", icon: Scale, hash: "#settlements", featureKey: "settlement_tracking" },
  { href: "/dashboard#reports", label: "Reports", icon: FileDown, hash: "#reports", featureKey: "basic_reports", requiresExport: true },
  { href: "/dashboard/analytics", label: "Analytics", icon: BrainCircuit, hash: "", featureKey: "advanced_analytics" },
  { href: "/dashboard/integrations", label: "API & Integrations", icon: Plug, hash: "", featureKey: "api_integration" },
  { href: "/dashboard/webhooks", label: "Webhooks", icon: Webhook, hash: "", featureKey: "webhooks" },
  { href: "/dashboard/subscription", label: "Subscription", icon: CreditCard, hash: "" },
];

interface SidebarProps {
  profile: Profile | null;
  mobile?: boolean;
  onClose?: () => void;
  enabledFeatures?: Record<SubscriptionFeatureKey, boolean>;
  subscriptionContext?: TenantSubscriptionContext | null;
}

function SidebarContent({
  profile,
  onClose,
  enabledFeatures,
  subscriptionContext,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function isFeatureEnabled(key?: SubscriptionFeatureKey) {
    if (!key) return true;
    if (!enabledFeatures) return true;
    return enabledFeatures[key] !== false;
  }

  return (
    <>
      <div className="border-b border-white/5 px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#00F2FE] to-violet-500 font-bold text-[#0B1120] shadow-lg shadow-[#00F2FE]/20">
              CR
              <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-br from-[#00F2FE] to-violet-500 opacity-30 blur-sm" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-normal text-white">
                Collection <span className="text-[#00F2FE]">& Recovery</span>
              </p>
            </div>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-white lg:hidden">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        {subscriptionContext && !subscriptionContext.isSuperAdmin && (
          <p className="mt-3 truncate rounded-lg border border-[#00F2FE]/10 bg-[#00F2FE]/5 px-2 py-1 text-xs text-[#00F2FE]">
            {subscriptionContext.planName} Plan
          </p>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems
          .filter((item) => isFeatureEnabled(item.featureKey))
          .filter((item) => !item.requiresExport || isFeatureEnabled("excel_export"))
          .map((item) => {
            const Icon = item.icon;
            const active = item.hash ? pathname === "/dashboard" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href + item.hash}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active && !item.hash
                    ? "dash-nav-active text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        {profile && canAccessPlatform(profile) && (
          <Link
            href="/dashboard/platform"
            onClick={onClose}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              pathname.startsWith("/dashboard/platform")
                ? "dash-nav-active text-white"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Shield className="h-4 w-4 shrink-0" />
            Super Admin
          </Link>
        )}
        {profile && canAccessAdmin(profile) && (
          <Link
            href="/dashboard/admin"
            onClick={onClose}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              pathname.startsWith("/dashboard/admin")
                ? "dash-nav-active text-white"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {profile.role === "super_admin"
              ? "Admin"
              : profile.role === "admin"
                ? "Client Admin"
                : profile.role === "manager"
                  ? "Supervisor"
                  : profile.role === "team_leader"
                    ? "Team Admin"
                    : "Admin"}
          </Link>
        )}
      </nav>

      <div className="border-t border-white/5 p-4">
        <div className="mb-3 rounded-xl dash-clay px-3 py-2.5">
          <p className="truncate text-sm font-medium text-white">{profile?.full_name ?? "User"}</p>
          <p className="truncate text-xs text-slate-500">{profile?.email}</p>
          <p className="mt-1 text-xs font-medium text-[#00F2FE]">
            {profile ? formatRole(profile.role) : "—"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-slate-400 transition hover:border-[#00F2FE]/30 hover:bg-[#00F2FE]/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </>
  );
}

export function Sidebar({
  profile,
  enabledFeatures,
  subscriptionContext,
}: {
  profile: Profile | null;
  enabledFeatures?: Record<SubscriptionFeatureKey, boolean>;
  subscriptionContext?: TenantSubscriptionContext | null;
}) {
  return (
    <aside className="relative flex h-full w-64 flex-col border-r border-[#00F2FE]/10 bg-[#0B1120]/95 text-white backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#00F2FE]/5 via-transparent to-violet-500/5" />
      <div className="relative flex h-full flex-col">
        <SidebarContent
          profile={profile}
          enabledFeatures={enabledFeatures}
          subscriptionContext={subscriptionContext}
        />
      </div>
    </aside>
  );
}

export function MobileNav({
  profile,
  enabledFeatures,
  subscriptionContext,
}: {
  profile: Profile | null;
  enabledFeatures?: Record<SubscriptionFeatureKey, boolean>;
  subscriptionContext?: TenantSubscriptionContext | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-[#00F2FE]/20 bg-[#00F2FE]/10 p-2 text-[#00F2FE] lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col border-r border-[#00F2FE]/10 bg-[#0B1120] text-white shadow-2xl shadow-[#00F2FE]/10">
            <SidebarContent
              profile={profile}
              onClose={() => setOpen(false)}
              enabledFeatures={enabledFeatures}
              subscriptionContext={subscriptionContext}
            />
          </aside>
        </div>
      )}
    </>
  );
}
