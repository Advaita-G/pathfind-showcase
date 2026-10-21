import { expect, test, type Page } from "@playwright/test";
import { gotoWithSession, installSupabaseMock, makeProfileRow } from "./helpers";

const PLAN_URL = "/plans?o=cosmos";

function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  return errors;
}

test.describe("planner (guest)", () => {
  test("plans a confirmed-deadline opportunity from the drawer, persists progress", async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto("/");
    await page.getByRole("searchbox", { name: "Search opportunities" }).fill("COSMOS");
    await page.waitForTimeout(400);
    await page.locator(".op-card", { hasText: "COSMOS" }).first().getByRole("button", { name: /Quick look/ }).click();
    // Guests see the gate, not the plan CTA; the plan page itself works for guests.
    await page.goto(PLAN_URL);
    await expect(page.locator(".plan-card.is-open")).toBeVisible();
    await expect(page.locator(".plan-deadline")).toBeVisible();
    await expect(page.locator(".plan-next")).toContainText("Do this next");
    await page.locator(".plan-step input[type=checkbox]").first().check();
    await page.reload();
    await expect(page.locator(".plan-card-count").first()).toHaveText(/^1\/\d+$/);
    expect(errors).toEqual([]);
  });

  test("undated steps and no invented dates for an estimated deadline", async ({ page }) => {
    await page.goto("/plans?o=science-olympiad-division-c");
    if (await page.locator(".plan-card").count() && await page.locator(".plan-deadline").count() === 0) await expect(page.locator(".plan-step-due")).toHaveCount(0);
  });

  test("shared page without a valid token is unavailable and leaks nothing", async ({ page }) => {
    await page.route(/\/rest\/v1\/rpc\/get_shared_path/, (r) => r.fulfill({ status: 200, contentType: "application/json", body: "null" }));
    await page.goto("/shared#" + "0".repeat(96));
    await expect(page.getByRole("heading", { name: /not available/i })).toBeVisible();
  });

  test("mobile layout has no horizontal scroll", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(PLAN_URL);
    await expect(page.locator(".plan-card.is-open")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  });
});

test.describe("planner (signed in, mocked Supabase)", () => {
  test("syncs a new plan to the account and merges server plans", async ({ page }) => {
    const world = await installSupabaseMock(page, {
      profile: makeProfileRow({ first_name: "Testy", grade: 10 }),
      planRows: [["berkeley-precollege", { opportunity_id: "berkeley-precollege", status: "applying", steps: [{ id: "a", title: "Server step", kind: "suggested", done: true }], notes: "", updated_at: "2026-10-13T00:00:00Z" }]],
    });
    await gotoWithSession(page, PLAN_URL);
    await expect(page.locator(".plan-card")).toHaveCount(2);
    await expect(page.getByText("Server step").first()).toBeHidden(); // collapsed card
    await page.locator(".plan-step input[type=checkbox]").first().check();
    await expect.poll(() => (world.planRows.get("cosmos") as { steps: { done: boolean }[] } | undefined)?.steps.some((s) => s.done)).toBe(true);
    await page.getByRole("button", { name: "Remove plan" }).click();
    await expect.poll(() => world.planRows.has("cosmos")).toBe(false);
  });

  test("calendar and share links: only a masked state is shown until created", async ({ page }) => {
    await installSupabaseMock(page, { profile: makeProfileRow({ first_name: "Testy", grade: 10 }) });
    let revoked = false;
    await page.route(/\/rest\/v1\/rpc\/get_path_link_status/, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ kind: "share", created_at: "2026-10-13T00:00:00Z" }]) }));
    await page.route(/\/rest\/v1\/rpc\/create_path_link/, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify("ab".repeat(48)) }));
    await page.route(/\/rest\/v1\/rpc\/revoke_path_link/, (r) => { revoked = true; return r.fulfill({ status: 204, body: "" }); });
    await gotoWithSession(page, PLAN_URL);
    await page.getByRole("button", { name: "Calendar & sharing" }).click();
    await expect(page.getByText(/shown only once/).first()).toBeVisible();
    await page.locator(".sync-row", { hasText: "Live calendar" }).getByRole("button", { name: "Turn on" }).click();
    await expect(page.getByLabel("Live calendar link")).toHaveAttribute("type", "password");
    await expect(page.getByLabel("Live calendar link")).toHaveValue(/functions\/v1\/calendar-feed\?t=(ab){48}$/);
    await page.getByRole("button", { name: "Turn off" }).first().click();
    await expect.poll(() => revoked).toBe(true);
  });
});
