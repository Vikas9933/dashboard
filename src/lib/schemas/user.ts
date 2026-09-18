import { z } from "zod";

const userRoleSchema = z.enum(["admin", "manager", "team_leader", "agent"]);

export const createUserSchema = z
  .object({
    email: z.string().email(),
    fullName: z.string().min(2),
    password: z.string().min(6),
    role: userRoleSchema,
    agencyId: z.string().uuid().nullable(),
    teamId: z.string().uuid().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.role !== "admin" && !data.agencyId) {
      ctx.addIssue({ code: "custom", message: "Agency is required for non-admin roles.", path: ["agencyId"] });
    }
    if ((data.role === "agent" || data.role === "team_leader") && !data.teamId) {
      ctx.addIssue({ code: "custom", message: "Team is required for agents and team leaders.", path: ["teamId"] });
    }
  });

export const updateUserSchema = z
  .object({
    profileId: z.string().uuid(),
    role: userRoleSchema,
    agencyId: z.string().uuid().nullable(),
    teamId: z.string().uuid().nullable(),
    isActive: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (!data.isActive) return;

    if (data.role !== "admin" && !data.agencyId) {
      ctx.addIssue({
        code: "custom",
        message: "Agency is required before activating a non-admin user.",
        path: ["agencyId"],
      });
    }
    if ((data.role === "agent" || data.role === "team_leader") && !data.teamId) {
      ctx.addIssue({
        code: "custom",
        message: "Team is required before activating an agent or team leader.",
        path: ["teamId"],
      });
    }
  });

export const dashboardConfigSchema = z.object({
  dashboardTitle: z.string().min(1).max(120),
  kpiTargetPercent: z.coerce.number().min(0).max(100),
  showWeeklyTrend: z.boolean(),
  showMonthlyTrend: z.boolean(),
});
