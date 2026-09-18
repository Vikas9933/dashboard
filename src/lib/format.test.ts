import { describe, expect, it } from "vitest";
import { formatCurrency, formatNumber, formatPercent, formatRole } from "./format";

describe("format utilities", () => {
  it("formats currency in INR", () => {
    expect(formatCurrency(1500)).toContain("1");
  });

  it("formats numbers with locale", () => {
    expect(formatNumber(1000)).toBe("1,000");
  });

  it("formats percent", () => {
    expect(formatPercent(75.5)).toBe("75.5%");
  });

  it("formats roles", () => {
    expect(formatRole("team_leader")).toBe("Team Leader");
    expect(formatRole("admin")).toBe("Client Admin");
    expect(formatRole("manager")).toBe("Supervisor");
    expect(formatRole("super_admin")).toBe("Super Admin");
  });
});
