import { Card, CardBody } from "@/components/ui/card";
import { formatBucket, formatCurrency, formatPercent } from "@/lib/format";
import type { BucketPerformance } from "@/lib/types";

interface BucketCardsProps {
  data: BucketPerformance[];
}

const bucketAccents: Record<string, { border: string; glow: string; bar: string }> = {
  B1: { border: "border-emerald-500/30", glow: "shadow-emerald-500/10", bar: "from-emerald-400 to-[#00F2FE]" },
  B2: { border: "border-cyan-500/30", glow: "shadow-cyan-500/10", bar: "from-cyan-400 to-[#00F2FE]" },
  B3: { border: "border-[#00F2FE]/30", glow: "shadow-[#00F2FE]/15", bar: "from-[#00F2FE] to-violet-400" },
  B4: { border: "border-violet-500/30", glow: "shadow-violet-500/10", bar: "from-violet-400 to-purple-500" },
  B5: { border: "border-amber-500/30", glow: "shadow-amber-500/10", bar: "from-amber-400 to-orange-500" },
  B6_PLUS: { border: "border-rose-500/30", glow: "shadow-rose-500/10", bar: "from-rose-400 to-red-500" },
};

export function BucketCards({ data }: BucketCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {data.map((bucket) => {
        const accent = bucketAccents[bucket.bucket] ?? bucketAccents.B3;
        return (
          <Card
            key={bucket.bucket}
            variant="clay"
            className={`transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${accent.border} ${accent.glow}`}
          >
            <CardBody>
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-white">{formatBucket(bucket.bucket)}</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-slate-400">
                  {bucket.accountCount} accts
                </span>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Allocation</span>
                  <span className="font-medium text-slate-200">{formatCurrency(bucket.allocated)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Collection</span>
                  <span className="font-medium text-[#00F2FE]">{formatCurrency(bucket.collected)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Achievement</span>
                  <span className="font-semibold text-violet-400">{formatPercent(bucket.achievement)}</span>
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${accent.bar} transition-all shadow-[0_0_12px_rgba(0,242,254,0.3)]`}
                  style={{ width: `${Math.min(bucket.achievement, 100)}%` }}
                />
              </div>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
