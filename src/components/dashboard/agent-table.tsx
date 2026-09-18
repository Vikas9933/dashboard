import { Crown, Medal, Trophy } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import type { AgentPerformance } from "@/lib/types";

interface AgentTableProps {
  agents: AgentPerformance[];
}

function rankStyle(rank: number) {
  if (rank === 1) return "dash-leaderboard-gold text-amber-300";
  if (rank === 2) return "dash-leaderboard-silver text-slate-300";
  if (rank === 3) return "dash-leaderboard-bronze text-orange-300";
  return "border-white/10 bg-white/5 text-slate-400";
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="h-3.5 w-3.5 text-amber-400" />;
  if (rank === 2) return <Medal className="h-3.5 w-3.5 text-slate-300" />;
  if (rank === 3) return <Crown className="h-3.5 w-3.5 text-orange-400" />;
  return null;
}

export function AgentTable({ agents }: AgentTableProps) {
  return (
    <Card variant="glass" id="agents">
      <CardHeader variant="glass">
        <h2 className="text-base font-semibold text-white">Agent Performance Leaderboard</h2>
        <p className="mt-0.5 text-sm text-slate-400">
          Ranked by collection efficiency, PTP tracking & recovery metrics
        </p>
      </CardHeader>
      <CardBody className="overflow-x-auto p-0">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02] text-xs uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3 font-medium">Rank</th>
              <th className="px-4 py-3 font-medium">Agent</th>
              <th className="px-4 py-3 font-medium">Accounts</th>
              <th className="px-4 py-3 font-medium">Collection</th>
              <th className="px-4 py-3 font-medium">Recovery %</th>
              <th className="px-4 py-3 font-medium">PTP</th>
              <th className="px-4 py-3 font-medium">PTP Amt</th>
              <th className="px-4 py-3 font-medium">Kept</th>
              <th className="px-4 py-3 font-medium">Broken</th>
            </tr>
          </thead>
          <tbody>
            {agents.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-10 text-center text-slate-500">
                  No agent data available
                </td>
              </tr>
            ) : (
              agents.map((agent) => (
                <tr
                  key={agent.agentId}
                  className="border-b border-white/[0.03] transition hover:bg-[#00F2FE]/5"
                >
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex h-8 w-8 items-center justify-center gap-0.5 rounded-xl border text-xs font-bold ${rankStyle(agent.rank)}`}
                    >
                      <RankIcon rank={agent.rank} />
                      {agent.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-medium text-white">{agent.agentName}</td>
                  <td className="px-4 py-3.5 text-slate-400">{agent.allocatedAccounts}</td>
                  <td className="px-4 py-3.5 font-semibold text-[#00F2FE]">
                    {formatCurrency(agent.collectedAmount)}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        agent.collectionPercentage >= 50
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      {formatPercent(agent.collectionPercentage)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-400">{formatNumber(agent.ptpCount)}</td>
                  <td className="px-4 py-3.5 text-slate-400">{formatCurrency(agent.ptpAmount)}</td>
                  <td className="px-4 py-3.5 text-emerald-400">{formatNumber(agent.keptPtp)}</td>
                  <td className="px-4 py-3.5 text-rose-400">{formatNumber(agent.brokenPtp)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}
