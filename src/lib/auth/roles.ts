import type { Profile, UserRole } from "@/lib/types";

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Client Admin",
  manager: "Supervisor",
  team_leader: "Team Leader",
  agent: "Agent",
};

/** Roles this actor may create or assign (never includes super_admin). */
export function creatableRoles(actorRole: UserRole): UserRole[] {
  switch (actorRole) {
    case "super_admin":
    case "admin":
      return ["admin", "manager", "team_leader", "agent"];
    case "manager":
      return ["team_leader", "agent"];
    case "team_leader":
      return ["agent"];
    default:
      return [];
  }
}

export function canManageRole(actor: Profile, targetRole: UserRole): boolean {
  if (!actor.is_active) return false;
  if (targetRole === "super_admin") return false;
  return creatableRoles(actor.role).includes(targetRole);
}

export function roleRequiresAgency(role: UserRole): boolean {
  return role !== "admin";
}

export function roleRequiresTeam(role: UserRole): boolean {
  return role === "agent" || role === "team_leader";
}
