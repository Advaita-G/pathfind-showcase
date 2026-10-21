import { expect, test, type Page } from "@playwright/test";
import { gotoWithSession, installSupabaseMock, makeProfileRow } from "./helpers";

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
  });
  return errors;
}

async function signedIn(page: Page) {
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

test.describe("site regression (signed in)", () => {
  test("landing renders with nav, hero, and opportunity sections", async ({ page }) => {
    const errors = collectErrors(page);
    await signedIn(page);

    await expect(page.getByRole("heading", { name: "Find what you'll do next." })).toBeVisible();
    for (const name of ["Explore", "Build My Path", "My Path", "Saved"]) {
      await expect(page.getByRole("button", { name, exact: true }).first()).toBeVisible();
    }
    await expect(page.locator(".op-card").first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("nav: Explore resets to full list; Build My Path + My Path scroll to the builder", async ({ page }) => {
    const errors = collectErrors(page);
    await signedIn(page);

    await page.getByRole("button", { name: "Build My Path", exact: true }).first().click();
    await expect(page.locator("#build-my-path-heading")).toBeVisible();

    await page.getByRole("button", { name: "My Path", exact: true }).first().click();
    await expect(page.locator("#build-my-path-heading")).toBeVisible();

    await page.getByRole("button", { name: "Explore", exact: true }).first().click();
    await expect(page.locator(".op-card").first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("explore: search narrows results and grade filter works", async ({ page }) => {
    const errors = collectErrors(page);
    await signedIn(page);

    const search = page.getByRole("searchbox", { name: "Search opportunities" });
    await search.fill("robotics");
    await page.waitForTimeout(400);
    await expect(page.getByRole("heading", { name: /opportunit(y|ies) found/ })).toBeVisible();
    await expect(page.locator(".op-card")).not.toHaveCount(0);

    await search.fill("");
    await page.waitForTimeout(300);
    await page.getByRole("radio", { name: "11" }).check();
    await expect(page.locator(".op-card").first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("saved: bookmark a card, then Saved view lists it and removing works", async ({ page }) => {
    const errors = collectErrors(page);
    const world = await signedIn(page);

    const card = page.locator(".op-card").first();
    const title = (await card.locator(".op-card-title").innerText()).trim();
    await card.locator(".op-card-bookmark").click();

    await page.getByRole("button", { name: /^Saved/ }).first().click();
    await expect(page.locator(".saved-workspace").getByRole("heading", { name: "Opportunities", exact: true })).toBeVisible();
    const savedCard = page.locator(".op-card", { hasText: title }).first();
    await expect(savedCard).toBeVisible();

    // The detail drawer's Save reflects the bookmarked state, and unsaving works from there.
    await savedCard.getByRole("button", { name: `Quick look at ${title}` }).click();
    const drawer = page.getByRole("dialog", { name: new RegExp(`${title} details`) });
    await expect(drawer).toBeVisible();
    await drawer.getByRole("button", { name: "Saved", exact: true }).click();
    await expect(drawer.getByRole("button", { name: "Save", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();

    // Removing the bookmark drops it from the server-side saved set (one save, one remove).
    await expect
      .poll(() => world.getSavedOpportunityIds(), { timeout: 5_000 })
      .toEqual([]);
    expect(errors).toEqual([]);
  });

  test("build my path: completing steps reveals a route", async ({ page }) => {
    const errors = collectErrors(page);
    await signedIn(page);

    await page.getByRole("button", { name: "Build My Path", exact: true }).first().click();
    const builder = page.locator(".build-my-path-section");
    const stepNav = builder.locator(".path-step-nav");

    // Step through the builder the way a student does: jump between steps, pick options, and
    // finish on the last step. The short waits absorb each step's 0.22s transition so clicks
    // never land on an element that's mid-animation.
    const pickFirstOption = async () => {
      await page.waitForTimeout(400);
      const option = builder.locator(".path-selection-list button").first();
      if (await option.count()) {
        const pressed = await option.getAttribute("aria-pressed");
        if (pressed !== "true") await option.click({ timeout: 10_000 });
      }
    };

    await stepNav.getByRole("button", { name: /Interests/ }).click();
    await pickFirstOption();

    await stepNav.getByRole("button", { name: /Goals/ }).click();
    await pickFirstOption();

    await stepNav.getByRole("button", { name: /Time/ }).click();
    await pickFirstOption();

    // "View my path" lives on the last step, which is the optional Colleges step.
    await stepNav.getByRole("button", { name: /colleges/i }).click();
    await builder.getByRole("button", { name: /View my path/ }).click();

    await expect(page.locator(".path-reveal")).toBeVisible();
    await expect(page.getByRole("heading", { name: /route you can start now/i })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("footer legal links open Terms and Privacy", async ({ page }) => {
    await signedIn(page);
    const footer = page.locator("footer");
    // Legal links live inside the "About & privacy" accordion.
    await footer.getByRole("button", { name: /About & privacy/ }).click();
    await page.locator("footer").getByRole("button", { name: "Privacy Policy" }).click();
    await expect(page.getByRole("dialog", { name: "Privacy Policy" })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.locator("footer").getByRole("button", { name: "Terms of Use" }).click();
    await expect(page.getByRole("dialog", { name: "Terms of Use" })).toBeVisible();
  });
});

test.describe("site regression (signed out)", () => {
  test("account button opens Google sign-in and never claims a session", async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("button", { name: "Sign in" }).first()).toBeVisible();
    await page.getByRole("button", { name: "Sign in" }).first().click();
    await expect(page.getByRole("button", { name: /Continue with Google/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" }).first()).toBeVisible();
    await page.keyboard.press("Escape");
    expect(errors).toEqual([]);
  });

  test("saving while signed out keeps the bookmark locally", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const card = page.locator(".op-card").first();
    const title = (await card.locator(".op-card-title").innerText()).trim();
    await card.locator(".op-card-bookmark").click();
    await page.getByRole("button", { name: /^Saved/ }).first().click();
    await expect(page.locator(".op-card", { hasText: title }).first()).toBeVisible();

    await page.reload();
    await page.getByRole("button", { name: /^Saved/ }).first().click();
    await expect(page.locator(".op-card", { hasText: title }).first()).toBeVisible();
  });
});

test.describe("responsive", () => {
  test("mobile: hamburger menu navigates and no horizontal overflow", async ({ page }) => {
    const errors = collectErrors(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Open menu" }).click();
    const mobileNav = page.locator(".top-nav-mobile");
    await expect(mobileNav).toBeVisible();
    await mobileNav.getByRole("button", { name: "Explore", exact: true }).click();
    await expect(mobileNav).toBeHidden();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);

    // A card + its detail drawer fit the phone.
    await page.locator(".op-card").first().locator(".op-card-action").click();
    await expect(page.getByRole("dialog", { name: /details/ })).toBeVisible();
    const drawerOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(drawerOverflow).toBeLessThanOrEqual(1);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: /details/ })).toBeHidden();

    // The header keeps only the account icon and the menu button on a phone: both have to be
    // big enough to hit, and the card's own controls are the main touch surface.
    for (const selector of [".top-nav-action", ".top-nav-hamburger"]) {
      const box = await page.locator(selector).first().boundingBox();
      expect(box, `${selector} is missing`).not.toBeNull();
      expect(Math.min(box!.width, box!.height), `${selector} is too small to tap`).toBeGreaterThanOrEqual(40);
    }

    const smallTargets = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>("header a[href], header button, .op-card a, .op-card button"))
        .map((el) => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && (rect.height < 24 || rect.width < 20)
            ? `${(el.className || el.tagName).toString().slice(0, 40)} ${Math.round(rect.width)}x${Math.round(rect.height)}`
            : null;
        })
        .filter(Boolean),
    );
    expect(smallTargets).toEqual([]);
    expect(errors).toEqual([]);
  });

  test("desktop: no horizontal overflow on the landing page", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
