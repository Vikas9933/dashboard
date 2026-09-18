import { z } from "zod";

const bucketSchema = z.enum(["B1", "B2", "B3", "B4", "B5", "B6_PLUS"]);

export const uploadRowSchema = z.object({
  loan_number: z.string().min(1),
  customer_name: z.string().min(1),
  mobile_number: z.string().min(10).max(15),
  bucket: bucketSchema,
  product_type: z.string().min(1),
  state: z.string().min(1),
  city: z.string().min(1),
  allocated_amount: z.coerce.number().positive(),
  outstanding_amount: z.coerce.number().nonnegative(),
  collected_amount: z.coerce.number().nonnegative().default(0),
  agency_code: z.string().optional(),
  team_name: z.string().optional(),
  agent_email: z.string().email().optional(),
});

export const uploadBatchSchema = z
  .array(uploadRowSchema)
  .min(1, "No valid rows found.")
  .max(1000, "Upload limit is 1000 rows per file.");

export type UploadRow = z.infer<typeof uploadRowSchema>;
