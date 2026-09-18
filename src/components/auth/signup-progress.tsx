import { Check } from "lucide-react";

const STEPS = [
  { id: 1, label: "Create account" },
  { id: 2, label: "Admin approval" },
  { id: 3, label: "Access dashboard" },
] as const;

export function SignupProgress({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  return (
    <ol className="mb-8 flex items-center justify-between gap-2">
      {STEPS.map((step, index) => {
        const done = step.id < currentStep;
        const active = step.id === currentStep;
        const upcoming = step.id > currentStep;

        return (
          <li key={step.id} className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex min-w-0 flex-col items-center gap-2 text-center">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition ${
                  done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : active
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-200 bg-white text-slate-400"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : step.id}
              </div>
              <span
                className={`text-xs font-medium leading-tight ${
                  active ? "text-indigo-700" : upcoming ? "text-slate-400" : "text-emerald-700"
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`mb-5 hidden h-0.5 flex-1 sm:block ${
                  step.id < currentStep ? "bg-emerald-400" : "bg-slate-200"
                }`}
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
