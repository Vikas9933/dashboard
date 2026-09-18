import { describe, expect, it } from "vitest";
import { uploadRowSchema } from "./upload";

describe("uploadRowSchema", () => {
  it("accepts valid row", () => {
    const result = uploadRowSchema.safeParse({
      loan_number: "LN-001",
      customer_name: "Test User",
      mobile_number: "9876543210",
      bucket: "B2",
      product_type: "Personal Loan",
      state: "Maharashtra",
      city: "Mumbai",
      allocated_amount: 50000,
      outstanding_amount: 40000,
      collected_amount: 10000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid bucket", () => {
    const result = uploadRowSchema.safeParse({
      loan_number: "LN-001",
      customer_name: "Test",
      mobile_number: "9876543210",
      bucket: "B9",
      product_type: "Loan",
      state: "MH",
      city: "Mumbai",
      allocated_amount: 1000,
      outstanding_amount: 500,
      collected_amount: 0,
    });
    expect(result.success).toBe(false);
  });
});
