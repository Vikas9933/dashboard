import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { TeamPerformance } from "@/lib/types";

interface TeamTableProps {
  teams: TeamPerformance[];
}

export function TeamTable({ teams }: TeamTableProps) {
  return (
    <Card variant="glass">
      <CardHeader variant="glass">
        <h2 className="text-base font-semibold text-white">Team Performance</h2>
        <p className="mt-0.5 text-sm text-slate-400">Team leader allocation & collection metrics</p>
      </CardHeader>
      <CardBody className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-wider text-slate-500">
              <th className="px-5 py-3 font-medium">Rank</th>
              <th className="px-5 py-3 font-medium">Team Leader</th>
              <th className="px-5 py-3 font-medium">Team Size</th>
              <th className="px-5 py-3 font-medium">Allocation</th>
              <th className="px-5 py-3 font-medium">Collection</th>
              <th className="px-5 py-3 font-medium">Achievement %</th>
            </tr>
          </thead>
          <tbody>
            {teams.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                  No team data available
                </td>
              </tr>
            ) : (
              teams.map((team) => (
                <tr key={team.teamId} className="border-b border-white/[0.03] hover:bg-[#00F2FE]/5">
                  <td className="px-5 py-3.5">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#00F2FE]/20 bg-[#00F2FE]/10 text-xs font-bold text-[#00F2FE]">
                      {team.rank}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-medium text-white">{team.teamLeaderName}</td>
                  <td className="px-5 py-3.5 text-slate-400">{team.teamSize}</td>
                  <td className="px-5 py-3.5 text-slate-400">{formatCurrency(team.allocation)}</td>
                  <td className="px-5 py-3.5 font-semibold text-[#00F2FE]">{formatCurrency(team.collection)}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        team.achievement >= 50
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      {formatPercent(team.achievement)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}
