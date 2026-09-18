import { describe, expect, it } from "vitest";
import {
  DEFAULT_AGENCY_CODE,
  DEFAULT_AGENCY_NAME,
  DEFAULT_TEAM_NAME,
} from "./tenant-provisioning";

describe("tenant provisioning defaults", () => {
  it("uses stable default names", () => {
    expect(DEFAULT_AGENCY_CODE).toBe("HQ01");
    expect(DEFAULT_AGENCY_NAME).toBe("Head Office");
    expect(DEFAULT_TEAM_NAME).toBe("Default Team");
  });
});
