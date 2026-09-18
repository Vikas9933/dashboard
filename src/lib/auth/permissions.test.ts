import { describe, expect, it } from "vitest";
import {
  canAccessAdmin,
  canAccessPlatform,
  canApproveSettlement,
  canExport,
  canManageConfig,
  canManageTenants,
  canManageUsers,
  hasPermission,
  mergeRoleScope,
} from "./permissions";
import type { Profile } from "@/lib/types";

const superAdmin: Profile = {
  id: "0",
  email: "super@test.com",
  full_name: "Super Admin",
  role: "super_admin",
  tenant_id: null,
  agency_id: null,
  is_active: true,
};

const clientAdmin: Profile = {
  id: "1",
  email: "admin@test.com",
  full_name: "Client Admin",
  role: "admin",
  tenant_id: "tenant-1",
  agency_id: null,
  is_active: true,
};

const supervisor: Profile = {
  id: "3",
  email: "mgr@test.com",
  full_name: "Supervisor",
  role: "manager",
  tenant_id: "tenant-1",
  agency_id: "agency-1",
  is_active: true,
};

const teamLeader: Profile = {
  id: "4",
  email: "tl@test.com",
  full_name: "Team Leader",
  role: "team_leader",
  tenant_id: "tenant-1",
  agency_id: "agency-1",
  team_id: "team-1",
  is_active: true,
};

const agent: Profile = {
  id: "2",
  email: "agent@test.com",
  full_name: "Agent",
  role: "agent",
  tenant_id: "tenant-1",
  agency_id: "agency-1",
  team_id: "team-1",
  is_active: true,
};

describe("permissions", () => {
  it("grants super admin platform and full admin access", () => {
    expect(canManageTenants(superAdmin)).toBe(true);
    expect(canAccessPlatform(superAdmin)).toBe(true);
    expect(canAccessAdmin(superAdmin)).toBe(true);
    expect(hasPermission(superAdmin, "admin:upload")).toBe(true);
    expect(hasPermission(superAdmin, "platform:subscriptions")).toBe(true);
  });

  it("grants client admin full tenant admin access", () => {
    expect(canManageTenants(clientAdmin)).toBe(false);
    expect(canAccessAdmin(clientAdmin)).toBe(true);
    expect(canManageUsers(clientAdmin)).toBe(true);
    expect(canManageConfig(clientAdmin)).toBe(true);
    expect(canExport(clientAdmin)).toBe(true);
  });

  it("grants supervisor operational admin without settings", () => {
    expect(canAccessAdmin(supervisor)).toBe(true);
    expect(canManageUsers(supervisor)).toBe(true);
    expect(canManageConfig(supervisor)).toBe(false);
    expect(hasPermission(supervisor, "reports:operational")).toBe(true);
    expect(canApproveSettlement(supervisor)).toBe(true);
  });

  it("grants team leader team reports and agent management", () => {
    expect(canAccessAdmin(teamLeader)).toBe(true);
    expect(hasPermission(teamLeader, "reports:team")).toBe(true);
    expect(canApproveSettlement(teamLeader)).toBe(false);
    expect(canManageConfig(teamLeader)).toBe(false);
  });

  it("restricts agent permissions", () => {
    expect(canAccessAdmin(agent)).toBe(false);
    expect(canExport(agent)).toBe(false);
    expect(canApproveSettlement(agent)).toBe(false);
  });

  it("scopes users to tenant in filters", () => {
    expect(mergeRoleScope(agent, {})).toEqual({
      tenantId: "tenant-1",
      agentId: "2",
    });
  });
});
