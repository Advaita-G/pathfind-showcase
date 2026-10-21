import { expect, test, type Page } from "@playwright/test";
import { gotoWithSession, installSupabaseMock, makeProfileRow } from "./helpers";

async function setup(page: Page) {
  const world = await installSupabaseMock(page, {
    profile: makeProfileRow({
      first_name: "Testy",
      last_name: "McTestface",
      school: "Test High",
      grade: 10,
      graduation_year: 2028,
    }),
  });
  await gotoWithSession(page, "/");
  await page.waitForLoadState("networkidle");
  return world;
}

async function findCard(page: Page, title: string) {
  // Search to isolate the card, then return it.
  const search = page.getByRole("searchbox", { name: "Search opportunities" });
  await search.fill(title);
  await page.waitForTimeout(400);
  return page.locator(".op-card", { hasText: title }).first();
}

/**
 * Opens the in-app "Quick look" drawer from a card. The card *title* is a real link to
 * Pathfind's public opportunity page (so search engines can crawl it) — "Quick look" is
 * the surface that keeps a browsing student inside Explore.
 */
async function openDetailFromCard(page: Page, title: string) {
  const card = await findCard(page, title);
  await card.getByRole("button", { name: `Quick look at ${title}` }).click();
  const drawer = page.getByRole("dialog", { name: new RegExp(`${title} details`) });
  await expect(drawer).toBeVisible();
  return drawer;
}

test.describe("opportunity detail experience", () => {
  test("clicking AMC 10/12 opens Pathfind detail, not the external site", async ({ page }) => {
    await setup(page);

    // No external navigation should happen on card click.
    let externalNav = false;
    page.on("popup", () => { externalNav = true; });

    const drawer = await openDetailFromCard(page, "AMC 10/12");

    // Beginner-friendly explainer content present.
    await expect(drawer.locator(".opportunity-detail-org")).toHaveText(
      "Mathematical Association of America",
    );
    await expect(drawer.getByRole("heading", { name: "Is this for you?" })).toBeVisible();
    await expect(drawer.getByRole("heading", { name: "The facts" })).toBeVisible();

    // Verified facts only.
    const facts = drawer.locator(".opportunity-detail-facts");
    await expect(facts.getByText("Grades 9–12")).toBeVisible();
    await expect(facts.getByText("No entry fee")).toBeVisible();
    await expect(facts.getByText("In-Person")).toBeVisible();

    // Primary actions: Save + Visit Official Website. Visit is a real external link.
    const visit = drawer.getByRole("link", { name: /Visit Official Website/ });
    await expect(visit).toBeVisible();
    await expect(visit).toHaveAttribute("href", "https://maa.org/student-programs/amc/");
    await expect(visit).toHaveAttribute("target", "_blank");
    expect(externalNav).toBe(false);

    // Close returns to the page (no navigation).
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    expect(externalNav).toBe(false);
  });

  test("the card title is an internal link to Pathfind's opportunity page, not the official site", async ({
    page,
  }) => {
    await setup(page);

    let externalNav = false;
    page.on("popup", () => {
      externalNav = true;
    });

    const card = await findCard(page, "AMC 10/12");
    const titleLink = card.getByRole("link", { name: "AMC 10/12", exact: true });
    await expect(titleLink).toHaveAttribute("href", "/opportunities/amc");

    await titleLink.click();
    await expect(page).toHaveURL(/\/opportunities\/amc$/);
    await expect(page.getByRole("heading", { level: 1, name: "AMC 10/12" })).toBeVisible();
    // A student reads Pathfind's explanation first; the official site is a deliberate click.
    await expect(page.getByRole("link", { name: /official site/i })).toHaveAttribute(
      "href",
      "https://maa.org/student-programs/amc/",
    );
    expect(externalNav).toBe(false);

    // And from here the Save action works too.
    await page.getByRole("button", { name: "Save opportunity", exact: true }).click();
    await expect(page.getByRole("button", { name: "Saved", exact: true })).toBeVisible();
  });

  test("Plan this opportunity from detail creates and opens its planner checklist", async ({ page }) => {
    await setup(page);

    const card = await findCard(page, "COSMOS");
    await card.getByRole("link", { name: "COSMOS", exact: true }).click();
    await expect(page).toHaveURL(new RegExp("/opportunities/cosmos$"));
    await page.getByRole("link", { name: "Plan this opportunity" }).click();
    await expect(page).toHaveURL(new RegExp("/plans\\?o=cosmos$"));
    await expect(page.locator(".plan-card.is-open")).toContainText("COSMOS");
    await expect(page.locator(".plan-next")).toContainText("Do this next");
  });

  test("Save from the detail drawer adds to Saved and updates the card state", async ({ page }) => {
    const world = await setup(page);

    const drawer = await openDetailFromCard(page, "Congressional App Challenge");
    await drawer.getByRole("button", { name: "Save", exact: true }).click();
    await expect(drawer.getByRole("button", { name: "Saved", exact: true })).toBeVisible();

    // Server got the save (signed-in student).
    expect(world.getSavedOpportunityIds()).toContain("congressional-app-challenge");

    // Close; the Saved nav count should reflect it.
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(page.getByRole("button", { name: /Saved \(\d+\)/ })).toContainText("1");
  });

  test("interest tag inside detail filters the results", async ({ page }) => {
    await setup(page);

    const drawer = await openDetailFromCard(page, "AMC 10/12");
    await drawer.getByRole("button", { name: "#Math" }).click();

    // Drawer closes and results are filtered to that interest.
    await expect(drawer).toBeHidden();
    await expect(page.getByRole("heading", { name: /opportunit(y|ies) found/ })).toBeVisible();
    await expect(page.locator(".op-card", { hasText: "AMC 10/12" }).first()).toBeVisible();
  });

  test("spotlight and closing-soon surfaces open the detail too", async ({ page }) => {
    await setup(page);

    // Spotlight featured article's "View details".
    const spotlight = page.locator(".spotlight-feature").first();
    await spotlight.getByRole("button", { name: /View details/ }).click();
    const drawer = page.getByRole("dialog", { name: /details/ });
    await expect(drawer).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();

    // Closing-soon rail title.
    const rail = page.locator(".closing-soon-section").first();
    await rail.locator(".closing-soon-title-btn").first().click();
    await expect(drawer).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("drawer with missing metadata (no deadline) shows rolling admission honestly", async ({ page }) => {
    await setup(page);

    const drawer = await openDetailFromCard(page, "FBLA Competitive Events");
    await expect(drawer.getByText(/Rolling admission/i)).toBeVisible();
  });

  test("detail drawer works on mobile width", async ({ page }) => {
    await setup(page);
    await page.setViewportSize({ width: 390, height: 844 });

    const drawer = await openDetailFromCard(page, "AMC 10/12");
    await expect(drawer).toBeVisible();

    // Footer actions stack vertically and are both clickable.
    const save = drawer.getByRole("button", { name: "Save", exact: true });
    const visit = drawer.getByRole("link", { name: /Visit Official Website/ });
    await save.scrollIntoViewIfNeeded();
    await expect(save).toBeVisible();
    await expect(visit).toBeVisible();

    // No horizontal overflow.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
