"use client";

import { useRouter, usePathname } from "next/navigation";
import { signupPath } from "@/lib/auth/signup-constants";
import {
  ArrowRight,
  BarChart3,
  HandCoins,
  Shield,
  TrendingUp,
  UserPlus,
  LogIn,
  Users,
} from "lucide-react";

const ROLES = ["Admin", "Manager", "Team Leader", "Agent"];

interface AuthShellProps {
  children: React.ReactNode;
}

export function AuthShell({ children }: AuthShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isSignup = pathname.startsWith("/signup");

  function goToLogin() {
    router.push("/login");
  }

  function goToSignup() {
    router.push(signupPath());
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50">
      <div className="relative z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white">
            CR
          </div>
          <span className="font-semibold text-slate-900">Collection & Recovery</span>
        </div>
        <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-medium">
          <button
            type="button"
            onClick={goToLogin}
            className={`rounded-md px-3 py-1.5 transition ${
              !isSignup ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={goToSignup}
            className={`rounded-md px-3 py-1.5 transition ${
              isSignup ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
            }`}
          >
            Register
          </button>
        </div>
      </div>

      <div
        className={`absolute inset-y-0 left-0 z-20 hidden w-1/2 bg-slate-900 transition-transform duration-700 ease-in-out lg:block ${
          isSignup ? "translate-x-full" : "translate-x-0"
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 via-slate-900 to-slate-900" />
        <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute -right-10 bottom-20 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />

        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500 text-lg font-bold text-white">
                CR
              </div>
              <div>
                <p className="text-lg font-bold text-white">Collection & Recovery</p>
                <p className="text-sm text-indigo-200">Analytics Dashboard</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {ROLES.map((role) => (
                <span
                  key={role}
                  className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-indigo-200"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>

          <div
            className={`space-y-8 transition-all duration-500 ${
              isSignup
                ? "pointer-events-none absolute opacity-0 translate-x-4"
                : "opacity-100 translate-x-0"
            }`}
          >
            <div>
              <h2 className="text-3xl font-bold leading-tight text-white">
                Collection & Recovery Analytics
              </h2>
              <p className="mt-4 max-w-md text-slate-300">
                Monitor collection performance, agent productivity, PTP tracking,
                settlement tracking, and management reporting — all in one place.
              </p>
            </div>

            <div className="space-y-4">
              {[
                { icon: TrendingUp, text: "Daily, weekly & monthly collection trends" },
                { icon: BarChart3, text: "Bucket-wise & team-wise performance" },
                { icon: HandCoins, text: "PTP tracking — kept, broken & pending" },
                { icon: Shield, text: "Secure role-based access control" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 text-slate-300">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                    <Icon className="h-4 w-4 text-indigo-300" />
                  </div>
                  <span className="text-sm">{text}</span>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <p className="text-sm font-medium text-indigo-200">New to the platform?</p>
              <p className="mt-1 text-sm text-slate-400">
                Create an account — Admin, Manager, Team Leader, or Agent access is assigned after registration.
              </p>
              <button
                type="button"
                onClick={goToSignup}
                className="mt-4 flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-indigo-50"
              >
                <UserPlus className="h-4 w-4" />
                Create account
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div
            className={`space-y-8 transition-all duration-500 ${
              !isSignup
                ? "pointer-events-none absolute opacity-0 -translate-x-4"
                : "opacity-100 translate-x-0"
            }`}
          >
            <div>
              <h2 className="text-3xl font-bold leading-tight text-white">
                Join the recovery operations platform
              </h2>
              <p className="mt-4 max-w-md text-slate-300">
                Register to access dashboards for field visits, customer search,
                settlement tracking, and performance analytics.
              </p>
            </div>

            <div className="space-y-4">
              {[
                { icon: Users, text: "Register with your work email or Google" },
                { icon: Shield, text: "Admin assigns your role & team access" },
                { icon: BarChart3, text: "Access KPIs, reports & analytics" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 text-slate-300">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                    <Icon className="h-4 w-4 text-indigo-300" />
                  </div>
                  <span className="text-sm">{text}</span>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <p className="text-sm font-medium text-indigo-200">Already registered?</p>
              <p className="mt-1 text-sm text-slate-400">
                Sign in with your email or Google account.
              </p>
              <button
                type="button"
                onClick={goToLogin}
                className="mt-4 flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-indigo-50"
              >
                <LogIn className="h-4 w-4" />
                Sign in
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-500">Secure authentication · Role-based access · Supabase Auth</p>
        </div>
      </div>

      <div
        className={`relative z-10 flex min-h-[calc(100vh-57px)] items-center justify-center px-6 py-10 transition-transform duration-700 ease-in-out lg:min-h-screen lg:w-1/2 lg:px-12 ${
          isSignup ? "lg:translate-x-0" : "lg:translate-x-full"
        }`}
      >
        <div className="w-full max-w-md auth-form-enter" key={pathname}>
          {children}
        </div>
      </div>
    </div>
  );
}
