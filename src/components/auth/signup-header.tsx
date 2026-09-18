import { Building2, ShieldCheck } from "lucide-react";

interface SignupHeaderProps {
  tenantName?: string | null;
  bootstrap?: boolean;
  invalidSlug?: string | null;
}

export function SignupHeader({ tenantName, bootstrap = false, invalidSlug }: SignupHeaderProps) {
  return (
    <div className="mb-6">
      {bootstrap ? (
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          <ShieldCheck className="h-3.5 w-3.5" />
          Platform setup
        </div>
      ) : tenantName ? (
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-800">
          <Building2 className="h-3.5 w-3.5" />
          {tenantName}
        </div>
      ) : invalidSlug ? (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          Invalid client link: <code className="rounded bg-rose-100 px-1">{invalidSlug}</code>
        </div>
      ) : null}

      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        {bootstrap ? "Set up your platform" : "Request dashboard access"}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-500">
        {bootstrap
          ? "Create the first super admin account to launch the Collection & Recovery platform."
          : tenantName
            ? `Register with your work email to join ${tenantName}. Your Client Admin will assign your role and activate your account.`
            : "Use the sign-up link provided by your administrator to register for your organization."}
      </p>
    </div>
  );
}
