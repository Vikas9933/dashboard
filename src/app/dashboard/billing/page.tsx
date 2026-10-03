import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/dashboard";
import { getBillingWorkspaceData } from "@/lib/services/billing-service";
import { BillingDashboard } from "@/components/billing/billing-dashboard";

export const metadata = {
  title: "Bank & Agency Billing & Payout | Collection & Recovery Dashboard",
  description:
    "Track commercial billing generated from case resolutions, configure flexible payout rules, and maintain end-to-end audit traceability.",
};

interface BillingPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const params = await searchParams;

  const filters = {
    bank: params.bank,
    product: params.product,
    agency: params.agency,
    teamLeader: params.teamLeader,
    agentId: params.agentId,
    bucket: params.bucket,
    approvalStatus: params.approvalStatus,
    paymentStatus: params.paymentStatus,
    datePreset: (params.preset as any) || "all",
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    searchQuery: params.q,
  };

  const data = await getBillingWorkspaceData(filters);

  return <BillingDashboard initialData={data} />;
}
