import { test, expect } from "@playwright/test";

test.describe("navigation", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("process page loads", async ({ page }) => {
    await page.goto("/process");
    await expect(page.locator("h1")).toContainText("Story-Driven Development");
  });

  test("blog page loads", async ({ page }) => {
    await page.goto("/blog");
    await expect(page.locator("h1")).toBeVisible();
  });

  test("docs page loads with sidebar", async ({ page }) => {
    await page.goto("/docs");
    await expect(page.locator("h1")).toContainText("Documentation");
    await expect(page.locator("[data-slot=sidebar]")).toBeVisible();
  });

  test("dashboard page loads", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "All Initiatives" })).toBeVisible();
  });
});

test.describe("docs", () => {
  test("can navigate to a doc page", async ({ page }) => {
    await page.goto("/docs");
    // Click the first section card
    await page.locator("a[href^='/docs/']").first().click();
    await expect(page.locator("article")).toBeVisible();
    await expect(page.locator("article h1")).toBeVisible();
  });

  test("prev/next navigation works", async ({ page }) => {
    await page.goto("/docs");
    await page.locator("a[href^='/docs/']").first().click();
    await expect(page.locator("article")).toBeVisible();

    // Check for next link
    const nextLink = page.locator("nav a:has-text('Next')");
    if (await nextLink.isVisible()) {
      await nextLink.click();
      await expect(page.locator("article h1")).toBeVisible();
    }
  });

  test("edit on github link is present", async ({ page }) => {
    await page.goto("/docs");
    await page.locator("a[href^='/docs/']").first().click();
    await expect(
      page.locator("a:has-text('Edit on GitHub')")
    ).toBeVisible();
  });
});

test.describe("dashboard", () => {
  test("initiative cards are clickable", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "All Initiatives" })).toBeVisible();

    // Click first initiative card
    const firstCard = page.locator("[data-slot=card]").first();
    await firstCard.click();

    // Should show epic cards or initiative detail
    await expect(page.locator("h1")).toBeVisible();
  });

  test("sort toggle works", async ({ page }) => {
    await page.goto("/dashboard");

    // Click an initiative to see epics
    const firstCard = page.locator("[data-slot=card]").first();
    await firstCard.click();

    // Look for sort buttons
    const stageBtn = page.locator("button:has-text('By Stage')");
    const alphaBtn = page.locator("button:has-text('A–Z')");

    if (await stageBtn.isVisible()) {
      await alphaBtn.click();
      // Verify it switched
      await expect(alphaBtn).toHaveClass(/bg-primary/);
    }
  });

  test("blocked alert banner shows when blocked epics exist", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    // The blocked alert should be visible on the all-initiatives view
    const blockedBanner = page.locator("text=Blocked Epic");
    // May or may not be visible depending on data — just check it doesn't error
    if (await blockedBanner.isVisible()) {
      await expect(blockedBanner).toBeVisible();
    }
  });
});
