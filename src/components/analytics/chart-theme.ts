export const TEAL = "#00F2FE";
export const PURPLE = "#A855F7";
export const EMERALD = "#34D399";
export const AMBER = "#F59E0B";
export const ROSE = "#F87171";
export const GRID = "rgba(148, 163, 184, 0.1)";
export const TICK = "#64748b";

export const CHART_PALETTE = [TEAL, PURPLE, EMERALD, AMBER, ROSE, "#38BDF8", "#F472B6"];

export const tooltipStyle = {
  borderRadius: "12px",
  border: "1px solid rgba(0, 242, 254, 0.2)",
  background: "rgba(11, 17, 32, 0.95)",
  boxShadow: "0 0 30px rgba(0, 242, 254, 0.15)",
  color: "#f8fafc",
};

export function bandColorHex(band: "green" | "yellow" | "red"): string {
  if (band === "green") return "#34D399";
  if (band === "yellow") return "#F59E0B";
  return "#F87171";
}
