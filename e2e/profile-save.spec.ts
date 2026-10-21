import { expect, test, type Page } from "@playwright/test";
import {
  gotoWithSession,
  installSupabaseMock,
  makeProfileRow,
  type SupabaseMockOptions,
  type SupabaseMockWorld,
} from "./helpers";

async function openProfileDrawer(page: Page) {
  const drawer = page.getByRole("dialog", { name: "Edit profile" });
  // Post-reload hydration can briefly replace the nav button mid-click (auth state
  // re-renders); retry the click once if the drawer doesn't appear. The nav name button
  // navigates to /profile — only click it when we're not already there (e.g. after a
  // page.reload() that left us on /profile).
  for (let attempt = 0; attempt < 3; attempt++) {
    if (!page.url().includes("/profile")) {
      await page.getByRole("button", { name: /testy/i }).first().click();
      await page.waitForURL(/\/profile/);
    }
    await page.getByRole("button", { name: "Edit profile" }).click();
    try {
      await expect(drawer).toBeVisible({ timeout: 3_000 });
      return drawer;
    } catch {
      // Drawer didn't open — likely a detached-node click during hydration. Retry.
    }
  }
  await expect(drawer).toBeVisible();
  return drawer; // final attempt's failure surfaces here
}

async function setup(
  page: Page,
  options: SupabaseMockOptions = {},
): Promise<SupabaseMockWorld> {
  const world = await installSupabaseMock(page, options);
  await gotoWithSession(page, "/");
  await page.waitForLoadState("networkidle");
  return world;
}

test.describe("profile drawer save", () => {
  test("edit interest → Save → close → reopen → reload: selection persists", async ({ page }) => {
    const world = await setup(page, {
      profile: makeProfileRow({
        first_name: "Testy",
        last_name: "McTestface",
        school: "Test High",
        grade: 10,
        graduation_year: 2028,
      }),
    });

    const drawer = await openProfileDrawer(page);

    // Pick an interest pill (Computer Science) and save.
    await drawer.getByRole("button", { name: "Computer Science" }).click();
    await drawer.getByRole("button", { name: "Save profile" }).click();
    await expect(drawer.getByText("Profile saved.")).toBeVisible();

    // The upsert must contain the new interest.
    expect(
      world.upsertLog.some(({ payload }) => {
        const p = payload as Record<string, unknown>;
        return Array.isArray(p.interests) && (p.interests as string[]).includes("cs");
      }),
    ).toBe(true);

    // Close and reopen without reload — state must still show selected.
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    const drawer2 = await openProfileDrawer(page);
    await expect(
      drawer2.getByRole("button", { name: "Computer Science" }),
    ).toHaveClass(/is-selected/);

    // Hard reload — the durable test.
    await page.reload();
    const drawer3 = await openProfileDrawer(page);
    await expect(
      drawer3.getByRole("button", { name: "Computer Science" }),
    ).toHaveClass(/is-selected/);

    // And the mocked server row actually received it.
    expect(world.getProfileRow().interests).toContain("cs");
  });

  test("save persists identity fields (school/grade/year)", async ({ page }) => {
    const world = await setup(page, {
      // Complete profile so needsProfileSetup is false and the drawer does NOT auto-open
      // over the nav before the test clicks the account button.
      profile: makeProfileRow({
        first_name: "Testy",
        last_name: "McTestface",
        school: "Old School",
        grade: 10,
        graduation_year: 2028,
      }),
    });

    const drawer = await openProfileDrawer(page);
    await drawer.getByLabel("School").fill("New School");
    await drawer.getByLabel("Grade").selectOption("11");
    await drawer.getByLabel("Graduation year").fill("2027");
    await drawer.getByRole("button", { name: "Save profile" }).click();
    await expect(drawer.getByText("Profile saved.")).toBeVisible();

    expect(
      world.upsertLog.some(
        ({ payload }) => (payload as Record<string, unknown>).school === "New School",
      ),
    ).toBe(true);
    expect(
      world.upsertLog.some(({ payload }) => (payload as Record<string, unknown>).grade === 11),
    ).toBe(true);

    await page.reload();
    const drawer2 = await openProfileDrawer(page);
    await expect(drawer2.getByLabel("School")).toHaveValue("New School");
    await expect(drawer2.getByLabel("Grade")).toHaveValue("11");
  });


  test("interest edit still saves after the drawer is closed quickly (debounce race)", async ({ page }) => {
    const world = await setup(page, {
      profile: makeProfileRow({
        first_name: "Testy",
        last_name: "McTestface",
        school: "Test High",
        grade: 10,
        graduation_year: 2028,
      }),
    });

    const drawer = await openProfileDrawer(page);
    await drawer.getByRole("button", { name: "Biology & Medicine" }).click();
    // Click Save then immediately close (within the 600ms debounce window).
    await drawer.getByRole("button", { name: "Save profile" }).click();
    await page.waitForTimeout(50);
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();

    // flushPendingSave must have fired the write immediately.
    expect(world.getProfileRow().interests).toContain("biology");

    await page.reload();
    const drawer2 = await openProfileDrawer(page);
    await expect(
      drawer2.getByRole("button", { name: "Biology & Medicine" }),
    ).toHaveClass(/is-selected/);
  });

  test("drawer reopened within 1.2s of save is NOT slammed shut by stale timer (regression)", async ({ page }) => {
    const world = await setup(page, {
      profile: makeProfileRow({
        first_name: "Testy",
        last_name: "McTestface",
        school: "Test High",
        grade: 10,
        graduation_year: 2028,
      }),
    });

    const drawer = await openProfileDrawer(page);
    await drawer.getByRole("button", { name: "Computer Science" }).click();
    const saveAt = Date.now();
    await drawer.getByRole("button", { name: "Save profile" }).click();
    await expect(drawer.getByText("Profile saved.")).toBeVisible();

    // Student closes and immediately reopens — inside the 1200ms auto-close window.
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await page.getByRole("button", { name: "Edit profile" }).click();

    // Wait up to 4s for the drawer to open...
    let openedAt = -1;
    for (let i = 0; i < 40; i++) {
      const present = await page.evaluate(() => !!document.querySelector('[role="dialog"]'));
      if (present) {
        openedAt = Date.now();
        break;
      }
      await page.waitForTimeout(100);
    }
    expect(openedAt).toBeGreaterThan(0);

    // ...then verify it STAYS open well past the 1200ms stale-timer boundary.
    await page.waitForTimeout(Math.max(0, 1600 - (Date.now() - saveAt)));
    const stillOpen = await page.evaluate(() => !!document.querySelector('[role="dialog"]'));
    expect(stillOpen).toBe(true);
    expect(Date.now() - saveAt).toBeGreaterThan(1300);

    // Selections must reflect the saved edit.
    await expect(
      drawer.getByRole("button", { name: "Computer Science" }),
    ).toHaveClass(/is-selected/);

    // And the server row has it.
    expect(world.getProfileRow().interests).toContain("cs");
  });

  test("custom 'Other' goal survives save + reload", async ({ page }) => {
    await setup(page, {
      profile: makeProfileRow({
        first_name: "Testy",
        last_name: "McTestface",
        school: "Test High",
        grade: 10,
        graduation_year: 2028,
      }),
    });

    const drawer = await openProfileDrawer(page);
    const goalsSection = drawer.locator(".profile-section", { hasText: "Goals" }).first();
    await goalsSection.getByPlaceholder("Other goal…").fill("Start a robotics club");
    await goalsSection.getByRole("button", { name: "Add" }).click();
    await drawer.getByRole("button", { name: "Save profile" }).click();
    await expect(drawer.getByText("Profile saved.")).toBeVisible();

    await page.reload();
    const drawer2 = await openProfileDrawer(page);
    await expect(
      drawer2
        .locator(".profile-section", { hasText: "Goals" })
        .first()
        .getByRole("button", { name: /Start a robotics club/ }),
    ).toBeVisible();
  });
});
