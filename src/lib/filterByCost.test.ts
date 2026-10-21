import { describe, expect, test } from "vitest";
import { filterByCost } from "./filterByCost";
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

describe("filterByCost", () => {
  test("returns everything when the free-only filter is off", () => {
    const opportunities = [
      makeOpportunity({ id: "free", free: true }),
      makeOpportunity({ id: "paid", free: false }),
    ];

    expect(filterByCost(opportunities, false)).toEqual(opportunities);
  });

  test("keeps only free opportunities when the filter is on", () => {
    const free = makeOpportunity({ id: "free", free: true });
    const paid = makeOpportunity({ id: "paid", free: false });

    expect(filterByCost([free, paid], true).map((o) => o.id)).toEqual(["free"]);
  });
});
