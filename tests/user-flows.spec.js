// @ts-check
import { test, expect } from "@playwright/test";

test.describe("Live site — user-facing flows", () => {
  test("home: banner base, logo, footer, and four project shapes", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Gal Nakel/i);
    await expect(page.locator(".hero-banner")).toBeVisible();
    await expect(page.locator(".site-logo")).toBeVisible();
    await expect(page.locator("#site-footer")).toContainText("Shenkar");
    for (const id of ["zormim", "smores", "cloud-nine", "exponential"]) {
      await expect(
        page.locator(`#drag-stage [data-project-id="${id}"]`),
      ).toBeVisible();
    }
  });

  test("tap shape opens case study; Back home returns", async ({ page }) => {
    await page.goto("/");
    await page.locator('[data-project-id="zormim"]').click();
    await expect(page).toHaveURL(/work\.html\?id=zormim/);
    await expect(page.locator("#work-title")).toContainText("Zormim");
    await expect(page.locator("#work-media img")).toBeVisible();
    await page.locator("a.back").click();
    await expect(page.locator("#drag-stage")).toBeVisible();
    await expect(page).not.toHaveURL(/work\.html/);
  });

  test("header pills: about me + side quests", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /about me/i }).click();
    await expect(page).toHaveURL(/id=about-me/);
    await expect(page.locator("#work-title")).toContainText(/about/i);

    await page.goto("/");
    await page.getByRole("link", { name: /side quests/i }).click();
    await expect(page).toHaveURL(/id=side-quests/);
    await expect(page.locator("#work-title")).toContainText(/side quest/i);
  });

  test("dragging a shape (large move) does not navigate", async ({ page }) => {
    await page.goto("/");
    const shape = page.locator('[data-project-id="smores"]');
    await shape.waitFor({ state: "visible" });
    const box = await shape.boundingBox();
    expect(box).toBeTruthy();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 140, cy + 90, { steps: 12 });
    await page.mouse.up();
    await expect(page).not.toHaveURL(/work\.html/);
    await expect(shape).toBeVisible();
  });

  test("theme toggle switches html data-theme", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    const before = await html.getAttribute("data-theme");
    await page.locator("[data-theme-toggle]").first().click();
    const after = await html.getAttribute("data-theme");
    expect(after).not.toBe(before);
    await page.locator("[data-theme-toggle]").first().click();
    const restored = await html.getAttribute("data-theme");
    expect(restored).toBe(before);
  });

  test("keyboard: focus + Enter opens project", async ({ page }) => {
    await page.goto("/");
    await page.locator('[data-project-id="exponential"]').focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/id=exponential/);
    await expect(page.locator("#work-title")).toContainText(/exponential/i);
  });
});
