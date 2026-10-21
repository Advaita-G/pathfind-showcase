import { expect, test } from "@playwright/test";
import { gotoWithSession, installSupabaseMock, makeProfileRow } from "./helpers";

for (const width of [375, 1280]) {
  test(`demo recommendations, source evidence and recovery at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    await installSupabaseMock(page, { profile: makeProfileRow({ grade: 10, interests: ["engineering"] }) });
    await gotoWithSession(page, "/");
    const { annual, canonical } = await page.evaluate(async () => {
      const catalogPath = "/src/data/opportunities.ts";
      const { OPPORTUNITIES } = await import(catalogPath);
      return {
        annual: OPPORTUNITIES.find((o) => o.recurring && !o.deadline && !o.inactive),
        canonical: OPPORTUNITIES.find((o) => o.id === "cosmos"),
      };
    });
    expect(annual).toBeDefined();
    let requests = 0;
    await page.route("**/functions/v1/assistant", (route) => {
      requests++;
      // A malformed second stream exercises recovery without a provider call or HTTP console error.
      const body = requests === 2 ? "not-json\n" : [
        { type: "results", opportunityIds: ["cosmos", annual.id, "invented-program"], collegeIds: [] },
        { type: "delta", text: "Check the official page before applying; the annual program's next date is unknown." },
        { type: "done" },
      ].map((event) => JSON.stringify(event)).join("\n") + "\n";
      return route.fulfill({ status: 200, contentType: "application/x-ndjson", body });
    });
    await page.getByRole("button", { name: "Open Pathfind assistant", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Pathfind assistant", exact: true });
    await dialog.getByRole("textbox", { name: "Message the assistant" }).fill("Find engineering programs for grade 10");
    await dialog.getByRole("button", { name: "Send", exact: true }).click();
    await expect(dialog.locator(".assistant-result")).toHaveCount(2);
    await expect(dialog.getByText("Next cycle not yet published", { exact: true })).toBeVisible();
    await expect(dialog.getByText("invented-program")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await dialog.getByRole("textbox", { name: "Message the assistant" }).fill("What should I prepare?");
    await dialog.getByRole("button", { name: "Send", exact: true }).click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await dialog.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(dialog.getByRole("alert")).toHaveCount(0);
    await expect(dialog.locator(".assistant-result")).toHaveCount(4);
    await dialog.getByRole("link").filter({ hasText: "COSMOS" }).first().click();
    await expect(page).toHaveURL(/\/opportunities\/cosmos$/);
    await expect(page.locator(`a[href="${canonical.link}"]`).first()).toBeVisible();
    expect(requests).toBe(3);
    expect(errors).toEqual([]);
  });
}
