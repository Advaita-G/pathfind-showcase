import { describe, expect, test } from "vitest";
import { sortOpportunities } from "./sortOpportunities";
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

describe("sortOpportunities", () => {
  test("by deadline: sorts dated opportunities soonest first", () => {
    const later = makeOpportunity({ id: "later", deadline: "2027-03-01" });
    const sooner = makeOpportunity({ id: "sooner", deadline: "2027-01-15" });

    const result = sortOpportunities([later, sooner], "deadline");

    expect(result.map((o) => o.id)).toEqual(["sooner", "later"]);
  });

  test("by deadline: places rolling opportunities after dated ones, sorted alphabetically", () => {
    const rollingB = makeOpportunity({ id: "rolling-b", title: "B Rolling" });
    const dated = makeOpportunity({ id: "dated", title: "Z Dated", deadline: "2027-01-15" });
    const rollingA = makeOpportunity({ id: "rolling-a", title: "A Rolling" });

    const result = sortOpportunities([rollingB, dated, rollingA], "deadline");

    expect(result.map((o) => o.id)).toEqual(["dated", "rolling-a", "rolling-b"]);
  });

  test("by deadline: pushes already-passed deadlines below upcoming ones", () => {
    const today = new Date("2026-09-05T00:00:00");
    const passed = makeOpportunity({ id: "passed", deadline: "2026-08-01" });
    const upcoming = makeOpportunity({ id: "upcoming", deadline: "2027-05-01" });

    const result = sortOpportunities([passed, upcoming], "deadline", today);

    expect(result.map((o) => o.id)).toEqual(["upcoming", "passed"]);
  });

  test("by deadline: keeps passed deadlines ahead of rolling entries", () => {
    const today = new Date("2026-09-05T00:00:00");
    const passed = makeOpportunity({ id: "passed", deadline: "2026-08-01" });
    const rolling = makeOpportunity({ id: "rolling", title: "A Rolling" });

    const result = sortOpportunities([rolling, passed], "deadline", today);

    expect(result.map((o) => o.id)).toEqual(["passed", "rolling"]);
  });

  test("by type: groups opportunities alphabetically by type", () => {
    const research = makeOpportunity({ id: "research", type: "Research", title: "A" });
    const competition = makeOpportunity({ id: "competition", type: "Competition", title: "B" });

    const result = sortOpportunities([research, competition], "type");

    expect(result.map((o) => o.id)).toEqual(["competition", "research"]);
  });

  test("by grade: orders by minimum eligible grade ascending", () => {
    const juniorPlus = makeOpportunity({ id: "junior-plus", minGrade: 11, title: "A" });
    const anyGrade = makeOpportunity({ id: "any-grade", minGrade: 9, title: "B" });

    const result = sortOpportunities([juniorPlus, anyGrade], "grade");

    expect(result.map((o) => o.id)).toEqual(["any-grade", "junior-plus"]);
  });
});
