import { z } from "zod";
import { uploadBatchSchema } from "@/lib/schemas/upload";

export const exportFormatSchema = z.enum(["xlsx", "csv", "pdf"]);

export const settlementActionSchema = z.object({
  settlementId: z.string().uuid("Valid settlement ID is required."),
  action: z.enum(["approve", "reject"]),
});

export const uploadRequestSchema = z.object({
  rows: uploadBatchSchema,
});

export const auditLogsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  action: z.string().optional(),
});
