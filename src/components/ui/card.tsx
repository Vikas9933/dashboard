import { type ReactNode } from "react";

type CardVariant = "default" | "glass" | "clay" | "hero";

interface CardProps {
  children: ReactNode;
  className?: string;
  id?: string;
  variant?: CardVariant;
}

const variantStyles: Record<CardVariant, string> = {
  default: "rounded-xl border border-slate-200/80 bg-white shadow-sm",
  glass: "dash-glass rounded-2xl",
  clay: "dash-clay rounded-2xl",
  hero: "dash-glass dash-hero-glow rounded-2xl",
};

export function Card({ children, className = "", id, variant = "default" }: CardProps) {
  return (
    <div id={id} className={`${variantStyles[variant]} ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = "",
  variant = "default",
}: {
  children: ReactNode;
  className?: string;
  variant?: CardVariant;
}) {
  const border =
    variant === "default" ? "border-b border-slate-100" : "border-b border-white/5";
  return <div className={`${border} px-5 py-4 ${className}`}>{children}</div>;
}

export function CardBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}
