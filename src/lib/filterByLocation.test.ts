import { describe, expect, test } from "vitest";
import { filterByLocation } from "./filterByLocation";
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

describe("filterByLocation", () => {
  test("returns everything when no locations are selected", () => {
    const opportunities = [makeOpportunity({ id: "a" }), makeOpportunity({ id: "b" })];

    expect(filterByLocation(opportunities, [])).toEqual(opportunities);
  });

  test("keeps only opportunities in a selected location", () => {
    const local = makeOpportunity({ id: "local", location: "Bay Area" });
    const remote = makeOpportunity({ id: "remote", location: "Remote" });

    const result = filterByLocation([local, remote], ["Bay Area"]);

    expect(result.map((o) => o.id)).toEqual(["local"]);
  });

  test("keeps opportunities matching any selected location", () => {
    const local = makeOpportunity({ id: "local", location: "Bay Area" });
    const remote = makeOpportunity({ id: "remote", location: "Remote" });
    const travel = makeOpportunity({ id: "travel", location: "In-Person" });

    const result = filterByLocation([local, remote, travel], ["Bay Area", "Remote"]);

    expect(result.map((o) => o.id)).toEqual(["local", "remote"]);
  });
});
