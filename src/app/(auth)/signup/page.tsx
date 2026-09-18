import { redirect } from "next/navigation";
import { SignupForm } from "@/components/login/signup-form";
import { GoogleSignIn } from "@/components/login/google-sign-in";
import { SignupHeader } from "@/components/auth/signup-header";
import { SignupProgress } from "@/components/auth/signup-progress";
import { DEFAULT_SIGNUP_TENANT_SLUG } from "@/lib/auth/signup-constants";
import { needsPlatformBootstrap, resolveTenantBySlug } from "@/lib/auth/signup";
import { hasServiceRoleKey } from "@/lib/supabase/service";

export const metadata = {
  title: "Sign Up | Collection & Recovery Dashboard",
};

interface SignupPageProps {
  searchParams: Promise<{ tenant?: string }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const rawTenant = params.tenant?.trim().toLowerCase() ?? "";

  if (!rawTenant) {
    redirect(`/signup?tenant=${DEFAULT_SIGNUP_TENANT_SLUG}`);
  }

  const tenantSlug = rawTenant;
  const bootstrap = await needsPlatformBootstrap();
  const tenant = await resolveTenantBySlug(tenantSlug);
  const hasServiceRole = hasServiceRoleKey();
  const canRegister = bootstrap || !!tenant;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
      <SignupProgress currentStep={1} />
      <SignupHeader
        tenantName={tenant?.name}
        bootstrap={bootstrap}
        invalidSlug={!bootstrap && !tenant ? tenantSlug : null}
      />

      {!hasServiceRole && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Registration requires <code className="rounded bg-amber-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
          in <code className="rounded bg-amber-100 px-1">.env.local</code>. Add it and restart the dev
          server.
        </div>
      )}

      {canRegister && (
        <>
          <GoogleSignIn tenantSlug={tenantSlug} disabled={!hasServiceRole} />

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wide">
              <span className="bg-white px-3 text-slate-400">or continue with email</span>
            </div>
          </div>
        </>
      )}

      <SignupForm
        tenantSlug={tenantSlug}
        tenantName={tenant?.name}
        disabled={!canRegister || !hasServiceRole}
        bootstrap={bootstrap}
      />

      {!bootstrap && tenant && (
        <p className="mt-6 text-center text-xs leading-relaxed text-slate-400">
          By registering, you confirm you are authorized to access {tenant.name}&apos;s dashboard.
          Your administrator will review and activate your account.
        </p>
      )}
    </div>
  );
}
