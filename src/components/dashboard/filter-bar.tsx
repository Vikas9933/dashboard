"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Filter, X } from "lucide-react";
import type { FilterOptions } from "@/lib/types";

interface FilterBarProps extends FilterOptions {
  basePath?: string;
}

export function FilterBar({
  agencies,
  teams,
  teamLeaders,
  agents,
  buckets,
  states,
  cities,
  productTypes,
  basePath = "/dashboard",
}: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${basePath}?${params.toString()}`);
  }

  function clearAll() {
    router.push(basePath);
  }

  const selectClass =
    "min-w-[130px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-[#00F2FE]/40 focus:ring-2 focus:ring-[#00F2FE]/10";

  const hasFilters = [
    "from", "to", "agency", "team", "leader", "agent",
    "bucket", "state", "city", "product",
  ].some((k) => searchParams.get(k));

  return (
    <div className="dash-glass rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Filter className="h-4 w-4 text-[#00F2FE]" />
          Portfolio Filters
        </div>
        {hasFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="flex items-center gap-1 text-xs font-medium text-[#00F2FE] hover:text-white"
          >
            <X className="h-3 w-3" />
            Clear all
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <input
          type="date"
          className={selectClass}
          value={searchParams.get("from") ?? ""}
          onChange={(e) => updateFilter("from", e.target.value)}
          title="Date from"
        />
        <input
          type="date"
          className={selectClass}
          value={searchParams.get("to") ?? ""}
          onChange={(e) => updateFilter("to", e.target.value)}
          title="Date to"
        />
        <select className={selectClass} value={searchParams.get("agency") ?? ""} onChange={(e) => updateFilter("agency", e.target.value)}>
          <option value="">All Agencies</option>
          {agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select className={selectClass} value={searchParams.get("leader") ?? ""} onChange={(e) => updateFilter("leader", e.target.value)}>
          <option value="">All Team Leaders</option>
          {teamLeaders.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select className={selectClass} value={searchParams.get("team") ?? ""} onChange={(e) => updateFilter("team", e.target.value)}>
          <option value="">All Teams</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select className={selectClass} value={searchParams.get("agent") ?? ""} onChange={(e) => updateFilter("agent", e.target.value)}>
          <option value="">All Agents</option>
          {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select className={selectClass} value={searchParams.get("bucket") ?? ""} onChange={(e) => updateFilter("bucket", e.target.value)}>
          <option value="">All Buckets</option>
          {buckets.map((b) => <option key={b} value={b}>{b === "B6_PLUS" ? "B6+" : b}</option>)}
        </select>
        <select className={selectClass} value={searchParams.get("state") ?? ""} onChange={(e) => updateFilter("state", e.target.value)}>
          <option value="">All States</option>
          {states.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={selectClass} value={searchParams.get("city") ?? ""} onChange={(e) => updateFilter("city", e.target.value)}>
          <option value="">All Cities</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className={selectClass} value={searchParams.get("product") ?? ""} onChange={(e) => updateFilter("product", e.target.value)}>
          <option value="">All Products</option>
          {productTypes.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
    </div>
  );
}
