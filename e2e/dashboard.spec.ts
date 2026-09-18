import { test, expect } from "@playwright/test";

test.describe("Dashboard (unauthenticated)", () => {
  test("redirects to login when not authenticated", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("admin route redirects to login when not authenticated", async ({ page }) => {
    await page.goto("/dashboard/admin");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("API routes", () => {
  test("export requires authentication", async ({ request }) => {
    const response = await request.get("/api/export?format=xlsx");
    expect(response.status()).toBeGreaterThanOrEqual(401);
  });

  test("admin users API requires authentication", async ({ request }) => {
    const response = await request.get("/api/admin/users");
    expect(response.status()).toBeGreaterThanOrEqual(401);
  });

  test("admin audit logs API requires authentication", async ({ request }) => {
    const response = await request.get("/api/admin/audit-logs");
    expect(response.status()).toBeGreaterThanOrEqual(401);
  });

  test("upload API rejects invalid body", async ({ request }) => {
    const response = await request.post("/api/admin/upload", {
      data: { rows: "invalid" },
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("export rejects invalid format", async ({ request }) => {
    const response = await request.get("/api/export?format=docx");
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });
});
