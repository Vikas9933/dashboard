import { test, expect } from "@playwright/test";

test("health API returns ok", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.status).toBe("ok");
});

test("login page loads", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
});

test("signup page loads", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
});

test("not found page renders", async ({ page }) => {
  await page.goto("/does-not-exist-page");
  await expect(page.getByText(/not found|404/i)).toBeVisible();
});
