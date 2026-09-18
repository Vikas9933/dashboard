import { redirect } from "next/navigation";
import { Building2, Clock, Mail } from "lucide-react";
import { PendingApprovalActions } from "@/components/auth/pending-approval-actions";
import { SignupProgress } from "@/components/auth/signup-progress";
import { hasEmailConfig } from "@/lib/email/config";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Pending Approval | Collection & Recovery Dashboard",
};

export default async function PendingApprovalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, tenant_id, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_active) {
    redirect("/dashboard");
  }

  let tenantName: string | null = null;
  if (profile?.tenant_id) {
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", profile.tenant_id)
      .maybeSingle();
    tenantName = tenant?.name ?? null;
  }

  const emailEnabled = hasEmailConfig();

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
      <SignupProgress currentStep={2} />

      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600 ring-8 ring-amber-50/80">
          <Clock className="h-8 w-8" />
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Waiting for administrator approval
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Hi {profile?.full_name ?? "there"}, your account is created and queued for review.
          </p>
        </div>

        {tenantName ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm font-semibold text-indigo-800">
            <Building2 className="h-4 w-4" />
            {tenantName}
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-1.5 text-sm font-semibold text-rose-700">
            No client assigned — platform admin will review
          </div>
        )}

        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-5 py-5 text-left text-sm text-amber-950">
          <p className="font-semibold text-amber-900">What happens next</p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-amber-900/90">
            <li>
              {tenantName
                ? `Your Client Admin for ${tenantName} assigns your role, agency, and team.`
                : "A platform super admin assigns you to the correct client organization."}
            </li>
            <li>They activate your account in the Admin panel.</li>
            <li>You receive an email when access is granted, then sign in to the dashboard.</li>
          </ol>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-left text-sm text-emerald-900">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <p>
            {emailEnabled
              ? tenantName
                ? `Your Client Admin for ${tenantName} has been emailed. You'll receive a confirmation at ${profile?.email ?? "your address"} once approved.`
                : `The platform administrator has been emailed. You'll receive a confirmation at ${profile?.email ?? "your address"} once approved.`
              : tenantName
                ? `Your Client Admin for ${tenantName} will review your request in the Admin panel.`
                : "The platform administrator will review your request in the Admin panel."}
          </p>
        </div>

        <PendingApprovalActions />
      </div>
    </div>
  );
}
