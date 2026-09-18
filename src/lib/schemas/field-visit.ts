import { z } from "zod";

export const fieldVisitSchema = z
  .object({
    accountId: z.string().uuid(),
    visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Valid visit date required."),
    customerMet: z.boolean(),
    promiseToPay: z.boolean(),
    settlementInterest: z.boolean(),
    ptpAmount: z.coerce.number().positive().nullable().optional(),
    remarks: z.string().max(2000).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.promiseToPay && (!data.ptpAmount || data.ptpAmount <= 0)) {
      ctx.addIssue({ code: "custom", message: "PTP amount required when Promise to Pay is checked.", path: ["ptpAmount"] });
    }
  });
