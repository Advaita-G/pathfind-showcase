import { describe, expect, it } from "vitest";
import { parseIntent } from "../../supabase/functions/assistant/intent.ts";
import { buildSystemPrompt, describeOpportunities, taskBlock, type OpportunityRow } from "../../supabase/functions/assistant/prompt.ts";
import { OPPORTUNITIES } from "../data/opportunities";
import type { Opportunity } from "../data/types";
import { resolveOpportunityIds } from "./assistantCatalog";
import { matchOpportunities } from "./matchOpportunities";

// Synthetic catalog evidence and a fixed clock keep this suite offline and reproducible.
const TODAY = "2026-10-14";
const row = (overrides: Partial<OpportunityRow> = {}): OpportunityRow => ({
  id: "robotics-challenge", title: "Student Robotics Challenge", org: "Example STEM",
  type: "Competition", interests: ["engineering"], min_grade: 10, max_grade: 12,
  description: "Build and document a robot with your school team.",
  deadline: "2026-11-01", deadline_confirmed: true, free: true,
  location: "Remote", city: null, state: null,
  link: "https://example.org/robotics/rules", recurring: true,
  ...overrides,
});
const opportunity = (overrides: Partial<Opportunity> = {}): Opportunity => ({
  id: "robotics", title: "Student Robotics Challenge", org: "Example STEM",
  type: "Competition", interests: ["engineering"], minGrade: 10, maxGrade: 12,
  description: "Build a robot.", link: "https://example.org/robotics/rules",
  free: true, location: "Remote", ...overrides,
});
const match = (grade: number | null, rows = [opportunity()]) =>
  matchOpportunities(rows, ["engineering"], ["Competition"], { grade, today: new Date(`${TODAY}T12:00:00`) });
const task = (message: string, rows: OpportunityRow[] = []) =>
  taskBlock(parseIntent(message), { opportunities: rows, colleges: [], pinned: false, hasProfile: false }, TODAY);

describe("offline recommendation evaluation", () => {
  it("a freshman never gets a competition restricted to grades 10–12", () => {
    expect(match(9).matches).toEqual([]);
  });
  it("a sophomore qualifies at the lower grade boundary", () => {
    expect(match(10).matches.map((o) => o.id)).toEqual(["robotics"]);
  });
  it("a senior qualifies at the upper grade boundary", () => {
    expect(match(12).matches.map((o) => o.id)).toEqual(["robotics"]);
  });
  it("fallback never relaxes grade eligibility", () => {
    const result = matchOpportunities([opportunity()], ["writing"], ["Research"], { grade: 9 });
    expect(result.noEligiblePrograms).toBe(true);
    expect(result.total).toBe(0);
  });
  it("discontinued competitions are excluded", () => {
    expect(match(10, [opportunity({ inactive: true })]).matches).toEqual([]);
  });
  it("a closed cycle is counted as closed, never open", () => {
    const result = match(10, [opportunity({ deadline: "2026-10-13" })]);
    expect(result.openCount).toBe(0);
    expect(result.closedCycleCount).toBe(1);
    expect(describeOpportunities([row({ deadline: "2026-10-13" })], TODAY)).toContain("has passed");
  });
  it("a deadline today is still due today", () => {
    expect(describeOpportunities([row({ deadline: TODAY })], TODAY)).toContain("due today");
  });
  it("a future confirmed deadline has the exact date and days remaining", () => {
    expect(describeOpportunities([row()], TODAY)).toContain("due 2026-11-01, 18 days from now");
  });
  it("an estimated deadline cannot read as confirmed", () => {
    expect(describeOpportunities([row({ deadline_confirmed: false })], TODAY)).toContain("estimated");
  });
  it("missing deadline confirmation is explicitly unverified", () => {
    expect(describeOpportunities([row({ deadline_confirmed: null })], TODAY)).toContain("unverified");
  });
  it("an annual program without a date is not invented rolling admission", () => {
    const text = describeOpportunities([row({ deadline: null })], TODAY);
    expect(text).toContain("next cycle not yet published");
    expect(text).not.toContain("rolling admission");
  });
  it("a known rolling opportunity remains rolling", () => {
    expect(describeOpportunities([row({ deadline: null, recurring: false })], TODAY)).toContain("rolling admission");
  });
  it("an invalid deadline remains unknown without NaN or an invented open date", () => {
    const text = describeOpportunities([row({ deadline: "unpublished" })], TODAY);
    expect(text).toContain("unknown");
    expect(text).not.toMatch(/NaN|due unpublished/);
  });
  it("an unsupported named school gets no invented school facts", () => {
    expect(task("Tell me about Cedar Grove High School")).toContain("must not state facts about it");
  });
  it("an empty search suggests changing filters without inventing a recommendation", () => {
    expect(task("Find robotics competitions for grade 10")).toContain("nothing matched");
    expect(resolveOpportunityIds(["invented-full-ride-robotics-award"])).toEqual([]);
  });
  it("a guest seeking personal advice is asked for missing context", () => {
    expect(task("What should I work on this semester?")).toContain("ask ONE specific question");
    expect(buildSystemPrompt(null, TODAY)).toContain("Never invent");
  });
  it("the model receives the exact catalog source link with the relevant eligibility", () => {
    const text = task("Find robotics competitions", [row()]);
    expect(text).toContain("https://example.org/robotics/rules");
    expect(text).toContain("grades 10-12");
  });
  it("recommendation cards retain canonical source evidence, never model-authored facts", () => {
    const canonical = OPPORTUNITIES.find((o) => o.id === "cosmos")!;
    const [resolved] = resolveOpportunityIds(["cosmos", "invented-program"]);
    expect(resolved).toBe(canonical);
    expect(resolved.sourceUrl || resolved.link).toMatch(/^https:\/\//);
    expect(resolved.lastChecked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
