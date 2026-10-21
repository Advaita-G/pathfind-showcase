import { describe, expect, test } from "vitest";
import type { Opportunity, OpportunityType } from "../data/types";
import { OPPORTUNITIES } from "../data/opportunities";
import { matchOpportunities } from "./matchOpportunities";

const TODAY = new Date(2026, 8, 18);

function makeOpportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: "test",
    title: "Test Opportunity",
    org: "Test Org",
    type: "Program",
    interests: ["cs"],
    minGrade: 9,
    maxGrade: 12,
    description: "A test opportunity open to a wide range of high school students.",
    link: "https://example.com",
    free: true,
    location: "Remote",
    ...overrides,
  };
}

const ids = (opportunities: Opportunity[]) => opportunities.map((opportunity) => opportunity.id);

describe("matchOpportunities", () => {
  test("returns a total and per-type breakdown for matching opportunities", () => {
    const opportunities = [
      makeOpportunity({ id: "a", type: "Research", interests: ["cs", "ai"] }),
      makeOpportunity({ id: "b", type: "Research", interests: ["cs"] }),
      makeOpportunity({ id: "c", type: "Competition", interests: ["cs"] }),
      makeOpportunity({ id: "d", type: "Internship", interests: ["biology"] }),
    ];

    const result = matchOpportunities(opportunities, ["cs"], [], { grade: 10, today: TODAY });

    expect(result.total).toBe(3);
    expect(result.byType).toEqual([
      { type: "Research", count: 2 },
      { type: "Competition", count: 1 },
    ]);
    expect(ids(result.matches)).toEqual(["a", "b", "c"]);
    expect(result.tier).toBe(1);
    expect(result.note).toBeNull();
  });

  test("omits types with zero matches from the breakdown", () => {
    const opportunities = [makeOpportunity({ id: "a", type: "Research", interests: ["cs"] })];

    expect(matchOpportunities(opportunities, ["cs"], ["Research"], { today: TODAY }).byType).toEqual([
      { type: "Research", count: 1 },
    ]);
  });

  test("does not pad a type-constrained list with the wrong type", () => {
    const opportunities = [
      makeOpportunity({ id: "a", type: "Research", interests: ["cs"] }),
      makeOpportunity({ id: "b", type: "Competition", interests: ["cs"] }),
    ];

    const result = matchOpportunities(opportunities, ["cs"], ["Competition"], { grade: 10, today: TODAY });

    expect(result.total).toBe(1);
    expect(ids(result.matches)).toEqual(["b"]);
    expect(result.byType).toEqual([{ type: "Competition", count: 1 }]);
  });

  test("with no interests or types selected, matches everything eligible", () => {
    const opportunities = [
      makeOpportunity({ id: "a", type: "Research" }),
      makeOpportunity({ id: "b", type: "Program" }),
    ];

    expect(matchOpportunities(opportunities, [], [], { today: TODAY }).total).toBe(2);
  });

  /* ------------------------------------------------ 1-5: interests, including "Others" */

  test("1. a normal interest leads with direct matches and needs no fallback", () => {
    const opportunities = [
      makeOpportunity({ id: "cs-1", interests: ["cs"] }),
      makeOpportunity({ id: "cs-2", interests: ["cs", "math"] }),
      makeOpportunity({ id: "cs-3", interests: ["cs", "engineering"] }),
      makeOpportunity({ id: "bio", interests: ["biology"] }),
      makeOpportunity({ id: "law", interests: ["law"] }),
    ];

    const result = matchOpportunities(opportunities, ["cs"], [], { today: TODAY });

    expect(result.tier).toBe(1);
    expect(result.note).toBeNull();
    // The direct matches lead; programs that additionally overlap the related-interest tags
    // (math, engineering) rank above a plain computer science listing.
    expect(ids(result.matches).slice(0, 3).sort()).toEqual(["cs-1", "cs-2", "cs-3"]);
  });

  test("2. another interest never returns zero just because it was not tagged literally", () => {
    const opportunities = [
      makeOpportunity({ id: "civics", interests: ["law"], type: "Program" }),
      makeOpportunity({ id: "science", interests: ["biology"], type: "Research" }),
    ];

    const result = matchOpportunities(opportunities, ["political science"], [], { grade: 9, today: TODAY });

    expect(result.total).toBeGreaterThan(0);
    expect(result.matches[0]?.id).toBe("civics");
  });

  test("3. Others + 'environmental engineering' surfaces the environmental and engineering programs", () => {
    const opportunities = [
      makeOpportunity({ id: "env-eng", interests: ["environmental", "engineering"] }),
      makeOpportunity({ id: "python-club", interests: ["cs"] }),
      makeOpportunity({ id: "poetry", interests: ["writing"] }),
    ];

    const result = matchOpportunities(opportunities, ["environmental engineering"], [], {
      grade: 11,
      today: TODAY,
    });

    expect(result.matches[0]?.id).toBe("env-eng");
  });

  test("4. Others + 'AI ethics' ranks an AI program first", () => {
    const opportunities = [
      makeOpportunity({ id: "poetry", interests: ["writing"] }),
      makeOpportunity({ id: "ai-lab", interests: ["ai"] }),
    ];

    const result = matchOpportunities(opportunities, ["AI ethics"], [], { grade: 10, today: TODAY });

    expect(result.matches[0]?.id).toBe("ai-lab");
  });

  test("5. Others + 'sports analytics' still returns usable results", () => {
    const opportunities = [
      makeOpportunity({ id: "stats", interests: ["ai", "math"] }),
      makeOpportunity({ id: "band", interests: ["arts"] }),
    ];

    const result = matchOpportunities(opportunities, ["sports analytics"], [], { grade: 10, today: TODAY });

    expect(result.total).toBe(2);
    expect(result.matches[0]?.id).toBe("stats");
  });

  /* --------------------------------------------------------------- 6-7: grade handling */

  test("6. a 9th grader receives matches, not an empty page", () => {
    const result = matchOpportunities(OPPORTUNITIES, ["political science"], [], {
      grade: 9,
      today: TODAY,
    });

    expect(result.noEligiblePrograms).toBe(false);
    expect(result.total).toBeGreaterThanOrEqual(3);
  });

  test("7. a 12th grader is never shown programs that exclude their grade", () => {
    const opportunities = [
      makeOpportunity({ id: "juniors-only", interests: ["cs"], minGrade: 11, maxGrade: 11 }),
      makeOpportunity({ id: "seniors", interests: ["cs"], minGrade: 12, maxGrade: 12 }),
    ];

    const result = matchOpportunities(opportunities, ["cs"], [], { grade: 12, today: TODAY });

    expect(ids(result.matches)).toEqual(["seniors"]);
  });

  test("hard eligibility is never relaxed, even in the deepest fallback tier", () => {
    const opportunities = [
      makeOpportunity({ id: "seniors-only", interests: ["cs"], minGrade: 12, maxGrade: 12 }),
      makeOpportunity({ id: "wide", interests: ["biology"], minGrade: 9, maxGrade: 12 }),
    ];

    const result = matchOpportunities(opportunities, ["political science"], [], {
      grade: 9,
      today: TODAY,
    });

    expect(ids(result.matches)).toEqual(["wide"]);
  });

  test("says so, and only says so, when nothing in the catalog accepts that grade", () => {
    const opportunities = [makeOpportunity({ id: "juniors", minGrade: 11, maxGrade: 12 })];

    const result = matchOpportunities(opportunities, [], [], { grade: 9, today: TODAY });

    expect(result.total).toBe(0);
    expect(result.noEligiblePrograms).toBe(true);
    expect(result.note).toBe("No programs in Pathfind's current catalog accept grade 9 students yet.");
  });

  /* --------------------------------------------------- 8-9: location and other preferences */

  test("8. a remote-only preference ranks remote programs first without hiding others", () => {
    const opportunities = [
      makeOpportunity({ id: "in-person", interests: ["cs"], location: "In-Person" }),
      makeOpportunity({ id: "remote", interests: ["cs"], location: "Remote" }),
    ];

    const result = matchOpportunities(opportunities, ["cs"], [], {
      grade: 10,
      location: "Remote",
      today: TODAY,
    });

    expect(result.matches[0]?.id).toBe("remote");
    expect(result.total).toBe(2);
  });

  test("9. a local preference is a ranking signal, not a filter", () => {
    const opportunities = [
      makeOpportunity({ id: "elsewhere", interests: ["cs"], location: "In-Person" }),
      makeOpportunity({ id: "bay-area", interests: ["cs"], location: "Bay Area" }),
    ];

    const result = matchOpportunities(opportunities, ["cs"], [], {
      grade: 10,
      location: "Bay Area",
      today: TODAY,
    });

    expect(result.matches[0]?.id).toBe("bay-area");
    expect(result.total).toBe(2);
  });

  /* ----------------------------------------------- 10-13: fallback and staleness behaviour */

  test("10. no exact interest overlap falls back with an honest explanation", () => {
    const opportunities = [
      makeOpportunity({ id: "general", interests: ["service"] }),
      makeOpportunity({ id: "general-2", interests: ["writing"] }),
    ];

    const result = matchOpportunities(opportunities, ["underwater basket weaving"], [], {
      grade: 10,
      today: TODAY,
    });

    expect(result.total).toBeGreaterThan(0);
    expect(result.tier).toBeGreaterThan(1);
    expect(result.note).not.toBeNull();
  });

  test("11. expired opportunities are still labelled as closed, never presented as open", () => {
    const opportunities = [
      makeOpportunity({ id: "closed", interests: ["cs"], deadline: "2026-08-01" }),
      makeOpportunity({ id: "open", interests: ["cs"], deadline: "2026-10-01" }),
    ];

    const result = matchOpportunities(opportunities, ["cs"], [], { grade: 10, today: TODAY });

    expect(result.total).toBe(2);
    expect(result.openCount).toBe(1);
    expect(result.closedCycleCount).toBe(1);
    // The still-open program is ranked ahead of the closed cycle.
    expect(result.matches[0]?.id).toBe("open");
  });

  test("12. a program its source marked as ended is never recommended", () => {
    const opportunities = [
      makeOpportunity({ id: "ended", interests: ["cs"], inactive: true }),
      makeOpportunity({ id: "live", interests: ["cs"] }),
    ];

    const result = matchOpportunities(opportunities, ["cs"], [], { grade: 10, today: TODAY });

    expect(ids(result.matches)).toEqual(["live"]);
    expect(result.total).toBe(1);
  });

  test("13. a thin but non-empty match set is padded from wider tiers, not left as a dead end", () => {
    const opportunities = [
      makeOpportunity({ id: "exact", interests: ["law"] }),
      makeOpportunity({ id: "wider-1", interests: ["biology"] }),
      makeOpportunity({ id: "wider-2", interests: ["arts"] }),
    ];

    const result = matchOpportunities(opportunities, ["law"], [], { grade: 10, today: TODAY });

    expect(result.total).toBeGreaterThanOrEqual(3);
    expect(result.matches[0]?.id).toBe("exact");
  });

  /* ------------------------------------------------------------- a real catalog smoke test */

  test("returns a useful, eligible result set for every grade and a custom interest", () => {
    for (const grade of [9, 10, 11, 12]) {
      const result = matchOpportunities(OPPORTUNITIES, ["Others", "environmental engineering"], [], {
        grade,
        today: TODAY,
      });

      expect(result.noEligiblePrograms, `grade ${grade}`).toBe(false);
      expect(result.total, `grade ${grade}`).toBeGreaterThanOrEqual(3);
      for (const opportunity of result.matches) {
        expect(grade, `${opportunity.id} is not open to grade ${grade}`).toBeGreaterThanOrEqual(
          opportunity.minGrade,
        );
        expect(grade, `${opportunity.id} is not open to grade ${grade}`).toBeLessThanOrEqual(
          opportunity.maxGrade,
        );
      }
    }
  });

  test("a per-type breakdown always sums to the reported total", () => {
    const types: OpportunityType[] = ["Program", "Internship", "Research", "Competition"];

    const result = matchOpportunities(OPPORTUNITIES, ["cs"], types, { grade: 11, today: TODAY });

    expect(result.byType.reduce((sum, entry) => sum + entry.count, 0)).toBe(result.total);
  });
});
