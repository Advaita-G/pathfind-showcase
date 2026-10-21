import { expect, test, type Page } from "@playwright/test";

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
  });
  return errors;
}

test.describe("production smoke", () => {
  test("homepage + explore + opportunity detail + save (signed out)", async ({ page }) => {
    const errors = collectErrors(page);

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Find what you'll do next." })).toBeVisible();
    await expect(page.locator(".op-card").first()).toBeVisible();

    // Search isolates a known verified opportunity.
    await page.getByRole("searchbox", { name: "Search opportunities" }).fill("AMC 10");
    await page.waitForTimeout(600);

    const card = page.locator(".op-card", { hasText: "AMC 10/12" }).first();
    await expect(card).toBeVisible();
    // The title is a link to Pathfind's own page; "Quick look" opens the in-app drawer.
    await card.getByRole("button", { name: /Quick look/ }).click();

    // Detail experience (signed-out view).
    const drawer = page.getByRole("dialog", { name: /AMC 10\/12 details/ });
    await expect(drawer).toBeVisible();
    await expect(drawer.locator(".opportunity-detail-org")).toHaveText(
      "Mathematical Association of America",
    );
    // Signed out, the drawer shows the summary and gates the rest behind sign-in.
    await expect(drawer.getByText("Sign in to see the rest")).toBeVisible();

    // Save works while signed out (localStorage) and reflects in the drawer.
    await drawer.getByRole("button", { name: "Save", exact: true }).click();
    await expect(drawer.getByRole("button", { name: "Saved", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();

    // Saved view lists it.
    await page.getByRole("button", { name: /^Saved/ }).first().click();
    await expect(page.locator(".saved-workspace").getByRole("heading", { name: "Opportunities", exact: true })).toBeVisible();
    await expect(page.locator(".op-card", { hasText: "AMC 10/12" }).first()).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("live homepage and public SEO pages serve crawlable HTML", async ({ page }) => {
    const errors = collectErrors(page);

    // The homepage hydrates the prerendered hero instead of regenerating it.
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Find what you'll do next." })).toBeVisible();
    await expect(page.locator(".op-card").first()).toBeVisible();

    const home = await (await page.request.get("/")).text();
    expect(home).toContain("<title>Pathfind — Verified Opportunities for High School Students</title>");
    expect(home).toContain('<link rel="canonical" href="https://www.getpathfind.com/" />');
    expect(home.replace(/\s+/g, "")).toContain('"alternateName":["GetPathfind","getpathfind.com"]');
    const body = home.slice(home.indexOf("<body"));
    const bodyText = body.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ");
    expect(bodyText.trim().length).toBeGreaterThan(5_000);
    expect([...new Set([...body.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]))].length).toBeGreaterThan(20);

    // Category, guide and opportunity pages are real HTML too.
    for (const path of ["/stem", "/opportunities/amc"]) {
      const html = await (await page.request.get(path)).text();
      expect(html, path).toMatch(/<h1[\s>]/);
      expect(html, path).toContain(`<link rel="canonical" href="https://www.getpathfind.com${path}" />`);
    }

    await page.goto("/opportunities/amc");
    await expect(page.getByRole("heading", { level: 1, name: "AMC 10/12" })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("build my path opens and steps render", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Build My Path", exact: true }).first().click();
    await expect(page.locator("#build-my-path-heading")).toBeVisible();
    await expect(page.locator(".path-step-nav")).toBeVisible();
    // Step 01 is dream colleges (combobox); the Interests step has the option rows.
    await page.locator(".path-step-nav").getByRole("button", { name: /Interests/ }).click();
    await expect(page.locator(".path-selection-list button").first()).toBeVisible();
  });

  test("auth UI behaves: sign-in opens Google consent, no session claimed", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/");

    await expect(page.getByRole("button", { name: "Sign in" }).first()).toBeVisible();
    await page.getByRole("button", { name: "Sign in" }).first().click();
    await expect(page.getByRole("button", { name: /Continue with Google/ })).toBeVisible();
    // Still signed out — the account button must not claim a session.
    await expect(page.getByRole("button", { name: "Sign in" }).first()).toBeVisible();
    await page.keyboard.press("Escape");
    expect(errors).toEqual([]);
  });

  test("mobile: landing renders, detail opens, no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.locator(".op-card").first()).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    await page.locator(".op-card").first().getByRole("button", { name: /Quick look/ }).click();
    await expect(page.getByRole("dialog", { name: /details/ })).toBeVisible();
    const drawerOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(drawerOverflow).toBeLessThanOrEqual(1);
  });
});
