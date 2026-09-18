export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatBucket(bucket: string): string {
  return bucket === "B6_PLUS" ? "B6+" : bucket;
}

export function formatRole(role: string): string {
  const labels: Record<string, string> = {
    super_admin: "Super Admin",
    admin: "Client Admin",
    manager: "Supervisor",
    team_leader: "Team Leader",
    agent: "Agent",
  };
  if (labels[role]) return labels[role];
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Fixed locale so server and client render the same string (avoids hydration errors). */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}
