import { describe, expect, test } from "vitest";
import { filterByType } from "./filterByType";
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

describe("filterByType", () => {
  test("returns everything when no types are selected", () => {
    const opportunities = [makeOpportunity({ id: "a" }), makeOpportunity({ id: "b" })];

    expect(filterByType(opportunities, [])).toEqual(opportunities);
  });

  test("keeps only opportunities of a selected type", () => {
    const internship = makeOpportunity({ id: "internship", type: "Internship" });
    const program = makeOpportunity({ id: "program", type: "Program" });

    const result = filterByType([internship, program], ["Internship"]);

    expect(result.map((o) => o.id)).toEqual(["internship"]);
  });

  test("keeps opportunities matching any of several selected types", () => {
    const internship = makeOpportunity({ id: "internship", type: "Internship" });
    const program = makeOpportunity({ id: "program", type: "Program" });
    const competition = makeOpportunity({ id: "competition", type: "Competition" });

    const result = filterByType([internship, program, competition], ["Internship", "Competition"]);

    expect(result.map((o) => o.id)).toEqual(["internship", "competition"]);
  });
});
