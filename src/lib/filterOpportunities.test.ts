import { describe, expect, test } from "vitest";
import { filterOpportunities } from "./filterOpportunities";
import type { Opportunity } from "../data/types";

function makeOpportunity(overrides: Partial<Opportunity>): Opportunity {
  return {
    id: "test",
    title: "Test Opportunity",
    org: "Test Org",
    type: "Program",
    interests: ["cs"],
    minGrade: 9,
    maxGrade: 12,
    description: "A test opportunity.",
    link: "https://example.com",
    free: true,
    location: "Remote",
    ...overrides,
  };
}

describe("filterOpportunities", () => {
  test("returns everything when neither grade nor interests are set", () => {
    const opportunities = [makeOpportunity({ id: "a" }), makeOpportunity({ id: "b" })];

    const result = filterOpportunities(opportunities, null, []);

    expect(result).toEqual(opportunities);
  });

  test("filters by grade alone when no interests are selected", () => {
    const tooAdvanced = makeOpportunity({ id: "too-advanced", minGrade: 11, maxGrade: 12 });
    const inRange = makeOpportunity({ id: "in-range", minGrade: 9, maxGrade: 12 });

    const result = filterOpportunities([tooAdvanced, inRange], 10, []);

    expect(result.map((o) => o.id)).toEqual(["in-range"]);
  });

  test("filters by interests alone when no grade is selected", () => {
    const matching = makeOpportunity({ id: "matching", interests: ["biology"] });
    const nonMatching = makeOpportunity({ id: "non-matching", interests: ["finance"] });

    const result = filterOpportunities([matching, nonMatching], null, ["biology"]);

    expect(result.map((o) => o.id)).toEqual(["matching"]);
  });

  test("excludes opportunities outside the selected grade's range", () => {
    const tooAdvanced = makeOpportunity({ id: "too-advanced", minGrade: 11, maxGrade: 12 });
    const inRange = makeOpportunity({ id: "in-range", minGrade: 9, maxGrade: 12 });

    const result = filterOpportunities([tooAdvanced, inRange], 10, ["cs"]);

    expect(result.map((o) => o.id)).toEqual(["in-range"]);
  });

  test("excludes opportunities that don't overlap the selected interests", () => {
    const matching = makeOpportunity({ id: "matching", interests: ["biology"] });
    const nonMatching = makeOpportunity({ id: "non-matching", interests: ["finance"] });

    const result = filterOpportunities([matching, nonMatching], 10, ["biology"]);

    expect(result.map((o) => o.id)).toEqual(["matching"]);
  });
});
