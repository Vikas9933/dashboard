"use client";

import { useState } from "react";
import {
  Building2,
  FolderSearch,
  Landmark,
  ListTree,
  Package,
  Phone,
  PhoneCall,
  Plug,
  Users,
  UserRound,
} from "lucide-react";
import { DialerKpiGrid } from "@/components/dialer/dialer-kpi-grid";
import { DialerFunnel } from "@/components/dialer/dialer-funnel";
import { DialerLevelTable } from "@/components/dialer/dialer-level-table";
import { DialerActivityChart } from "@/components/dialer/dialer-activity-chart";
import { DialerDrilldown, type DialerDrillLevel, type DialerPathStep } from "@/components/dialer/dialer-drilldown";
import { DialerIngestPanel } from "@/components/dialer/dialer-ingest-panel";
import { DialerAccountability } from "@/components/dialer/dialer-accountability";
import { DialerCasesTable } from "@/components/dialer/dialer-cases-table";
import type { DialerAccountabilityGaps } from "@/lib/services/dialer-metrics";
import type { DialerWorkspaceData } from "@/lib/services/dialer-performance-service";

const TABS = [
  { id: "overview", label: "Overview", icon: Phone },
  { id: "funnel", label: "Funnel", icon: PhoneCall },
  { id: "client", label: "Client", icon: Building2 },
  { id: "bank", label: "Bank", icon: Landmark },
  { id: "product", label: "Product", icon: Package },
  { id: "agency", label: "Agency", icon: Building2 },
  { id: "tl", label: "TL", icon: Users },
  { id: "agent", label: "Agent", icon: UserRound },
  { id: "activity", label: "Activity", icon: PhoneCall },
  { id: "cases", label: "Cases", icon: FolderSearch },
  { id: "drilldown", label: "Drill-down", icon: ListTree },
  { id: "ingest", label: "Ingest", icon: Plug },
] as const;

type TabId = (typeof TABS)[number]["id"];
type CaseFilter = "all" | keyof DialerAccountabilityGaps | "resolved" | "followUp";

export function DialerWorkspace({ data }: { data: DialerWorkspaceData }) {
  const [tab, setTab] = useState<TabId>("overview");
  const [drillPath, setDrillPath] = useState<DialerPathStep[]>([]);
  const [caseFilter, setCaseFilter] = useState<CaseFilter>("all");

  function openLevel(level: DialerDrillLevel, name: string) {
    setDrillPath([{ level, value: name }]);
    setTab("drilldown");
  }

  function openCases(filter: CaseFilter) {
    setCaseFilter(filter);
    setTab("cases");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm transition ${
                active
                  ? "bg-[#00F2FE]/15 text-[#00F2FE] shadow-[0_0_20px_rgba(0,242,254,0.12)]"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" && (
        <div className="space-y-4">
          <DialerKpiGrid
            summary={data.summary}
            onOpen={(view) => {
              if (view === "cases") openCases("all");
              else setTab(view);
            }}
          />
          <DialerAccountability gaps={data.gaps} onSelect={(key) => openCases(key)} />
          <DialerFunnel data={data.funnel} />
          <DialerActivityChart data={data.daily} />
        </div>
      )}
      {tab === "funnel" && (
        <div className="space-y-4">
          <DialerFunnel data={data.funnel} />
          <DialerAccountability gaps={data.gaps} onSelect={(key) => openCases(key)} />
        </div>
      )}
      {tab === "client" && (
        <DialerLevelTable
          title="Client-level performance"
          subtitle="Calling activity and case resolution rolled up by client. Click a row to drill toward the case."
          rows={data.clients}
          onSelect={(name) => openLevel("client", name)}
        />
      )}
      {tab === "bank" && (
        <DialerLevelTable
          title="Bank-level performance"
          subtitle="How much each bank portfolio was worked versus resolved."
          rows={data.banks}
          onSelect={(name) => openLevel("bank", name)}
        />
      )}
      {tab === "product" && (
        <DialerLevelTable
          title="Product-level performance"
          subtitle="Dialer effort and resolution by product."
          rows={data.products}
          onSelect={(name) => openLevel("product", name)}
        />
      )}
      {tab === "agency" && (
        <DialerLevelTable
          title="Agency-level performance"
          subtitle="Agency accountability: allocated cases versus calling and recoveries."
          rows={data.agencies}
          onSelect={(name) => openLevel("agency", name)}
        />
      )}
      {tab === "tl" && (
        <DialerLevelTable
          title="Team leader performance"
          subtitle="TL roll-up of agent calling, PTP, and resolution."
          rows={data.teamLeaders}
          onSelect={(name) => openLevel("tl", name)}
        />
      )}
      {tab === "agent" && (
        <DialerLevelTable
          title="Agent-level performance"
          subtitle="Every allocated case, attempt, connect, RPC, PTP, and resolution."
          rows={data.agents}
          onSelect={(name) => openLevel("agent", name)}
        />
      )}
      {tab === "activity" && <DialerActivityChart data={data.daily} />}
      {tab === "cases" && <DialerCasesTable rows={data.cases} filter={caseFilter} />}
      {tab === "drilldown" && (
        <DialerDrilldown
          key={drillPath.map((s) => `${s.level}:${s.value}`).join("|")}
          rows={data.cases}
          initialPath={drillPath}
        />
      )}
      {tab === "ingest" && <DialerIngestPanel />}
    </div>
  );
}
