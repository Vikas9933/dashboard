import { describe, expect, it } from "vitest";
import { z } from "zod";
import { jsonError, jsonValidationError, mapServiceError } from "./response";

describe("api response helpers", () => {
  it("returns json error with status", async () => {
    const response = jsonError("Forbidden", 403);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
  });

  it("maps validation errors", async () => {
    const parsed = z.string().email().safeParse("bad");
    if (parsed.success) throw new Error("expected failure");
    const response = jsonValidationError(parsed.error);
    expect(response.status).toBe(400);
  });

  it("maps permission errors to 403", () => {
    expect(mapServiceError("Export not permitted.").status).toBe(403);
    expect(mapServiceError("Insufficient permissions.").status).toBe(403);
  });

  it("maps auth errors to 401", () => {
    expect(mapServiceError("Not authenticated.").status).toBe(401);
  });
});
