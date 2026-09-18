import { describe, expect, it } from "vitest";
import {
  auditLogsQuerySchema,
  exportFormatSchema,
  settlementActionSchema,
  uploadRequestSchema,
} from "./api";

describe("api schemas", () => {
  it("accepts valid export formats", () => {
    expect(exportFormatSchema.parse("xlsx")).toBe("xlsx");
    expect(exportFormatSchema.parse("csv")).toBe("csv");
    expect(exportFormatSchema.parse("pdf")).toBe("pdf");
  });

  it("rejects invalid export format", () => {
    expect(exportFormatSchema.safeParse("docx").success).toBe(false);
  });

  it("validates settlement actions", () => {
    const result = settlementActionSchema.safeParse({
      settlementId: "550e8400-e29b-41d4-a716-446655440000",
      action: "approve",
    });
    expect(result.success).toBe(true);
  });

  it("validates upload request body", () => {
    const result = uploadRequestSchema.safeParse({
      rows: [
        {
          loan_number: "LN-1",
          customer_name: "Test",
          mobile_number: "9876543210",
          bucket: "B1",
          product_type: "PL",
          state: "MH",
          city: "Mumbai",
          allocated_amount: 1000,
          outstanding_amount: 500,
          collected_amount: 0,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("applies audit log query defaults", () => {
    const result = auditLogsQuerySchema.parse({});
    expect(result).toEqual({ limit: 50, offset: 0 });
  });
});
