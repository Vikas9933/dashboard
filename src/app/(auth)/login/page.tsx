import { LoginForm } from "@/components/login/login-form";

export const metadata = {
  title: "Sign In | Collection & Recovery Dashboard",
};

interface LoginPageProps {
  searchParams: Promise<{ error?: string; message?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const oauthError =
    params.error === "oauth"
      ? params.message ?? "Google sign-in failed. Try again or use email/password."
      : params.error === "auth"
        ? "Sign-in could not be completed. Try again."
        : null;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Secure login for collection & recovery analytics
        </p>
      </div>
      {oauthError && (
        <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {oauthError}
        </div>
      )}
      <LoginForm />
    </div>
  );
}
