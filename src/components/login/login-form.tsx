"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Mail } from "lucide-react";
import { validateLogin } from "@/app/(auth)/actions";
import { signupPath } from "@/lib/auth/signup-constants";
import { loginSchema } from "@/lib/schemas/auth";
import { GoogleSignIn } from "@/components/login/google-sign-in";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    const clientParsed = loginSchema.safeParse({
      email: email.trim().toLowerCase(),
      password,
    });
    if (!clientParsed.success) {
      setError(clientParsed.error.errors[0]?.message ?? "Invalid login data.");
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.set("email", clientParsed.data.email);
    formData.set("password", clientParsed.data.password);
    const validated = await validateLogin(formData);
    if (validated.error) {
      setError(validated.error);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: validated.data!.email,
      password: validated.data!.password,
    });

    if (signInError) {
      if (signInError.message === "Email not confirmed") {
        setError(
          "Your email is not confirmed yet. Check your inbox for the confirmation link, or resend it below."
        );
      } else {
        setError(
          signInError.message === "Invalid login credentials"
            ? "Invalid email or password. Please try again."
            : signInError.message
        );
      }
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_active")
        .eq("id", user.id)
        .maybeSingle();

      if (profile && !profile.is_active) {
        router.push("/pending-approval");
        router.refresh();
        return;
      }
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function handleResendConfirmation() {
    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }

    setResending(true);
    setError(null);
    setInfo(null);

    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (resendError) {
      setError(resendError.message);
    } else {
      setInfo("Confirmation email sent. Check your inbox and spam folder.");
    }

    setResending(false);
  }

  return (
    <div className="space-y-6">
      <GoogleSignIn />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-slate-400">or sign in with email</span>
        </div>
      </div>

      <form onSubmit={handleSignIn} className="space-y-5">
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            {error}
            {error.includes("not confirmed") && (
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resending}
                className="mt-2 block font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-60"
              >
                {resending ? "Sending..." : "Resend confirmation email"}
              </button>
            )}
          </div>
        )}

        {info && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {info}
          </div>
        )}

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
            Email address
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
            Password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </button>

        <p className="text-center text-sm text-slate-500 lg:hidden">
          New user?{" "}
          <button
            type="button"
            onClick={() => router.push(signupPath())}
            className="font-medium text-indigo-600 hover:text-indigo-700"
          >
            Create an account
          </button>
        </p>
      </form>
    </div>
  );
}
