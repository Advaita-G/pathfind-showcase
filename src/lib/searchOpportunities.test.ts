import { describe, expect, test } from "vitest";
import { searchOpportunities } from "./searchOpportunities";
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

describe("searchOpportunities", () => {
  test("returns everything when the query is empty", () => {
    const opportunities = [makeOpportunity({ id: "a" }), makeOpportunity({ id: "b" })];

    expect(searchOpportunities(opportunities, "")).toEqual(opportunities);
  });

  test("returns everything when the query is only whitespace", () => {
    const opportunities = [makeOpportunity({ id: "a" })];

    expect(searchOpportunities(opportunities, "   ")).toEqual(opportunities);
  });

  test("matches a case-insensitive substring of the title", () => {
    const match = makeOpportunity({ id: "match", title: "Robotics Academy" });
    const nonMatch = makeOpportunity({ id: "non-match", title: "Finance Institute" });

    const result = searchOpportunities([match, nonMatch], "robotics");

    expect(result.map((o) => o.id)).toEqual(["match"]);
  });

  test("matches a substring of the org", () => {
    const match = makeOpportunity({ id: "match", org: "Stanford Medicine" });
    const nonMatch = makeOpportunity({ id: "non-match", org: "MIT" });

    const result = searchOpportunities([match, nonMatch], "stanford");

    expect(result.map((o) => o.id)).toEqual(["match"]);
  });

  test("matches a substring of the description", () => {
    const match = makeOpportunity({ id: "match", description: "A paid internship in a wet lab." });
    const nonMatch = makeOpportunity({ id: "non-match", description: "An online course." });

    const result = searchOpportunities([match, nonMatch], "wet lab");

    expect(result.map((o) => o.id)).toEqual(["match"]);
  });

  test("matches words in any order across fields", () => {
    const match = makeOpportunity({ id: "match", title: "Math Camp", org: "State University" });
    const nonMatch = makeOpportunity({ id: "non-match", title: "Math Camp", org: "MIT" });

    const result = searchOpportunities([match, nonMatch], "university math");

    expect(result.map((o) => o.id)).toEqual(["match"]);
  });

  test("ignores accents", () => {
    const match = makeOpportunity({ id: "match", org: "École Polytechnique" });

    expect(searchOpportunities([match], "ecole").map((o) => o.id)).toEqual(["match"]);
  });
});
