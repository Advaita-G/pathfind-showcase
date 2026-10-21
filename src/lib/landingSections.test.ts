import { describe, expect, it } from "vitest";
import type { Opportunity } from "../data/types";
import { closingSoon } from "./landingSections";

const base: Omit<Opportunity, "id" | "deadline"> = {
  title: "Test Program",
  org: "Test Org",
  type: "Program",
  interests: ["cs"],
  minGrade: 9,
  maxGrade: 12,
  description: "A test opportunity.",
  link: "https://example.com",
  free: true,
  location: "Remote",
};

function make(id: string, deadline?: string): Opportunity {
  return { ...base, id, deadline };
}

const today = new Date(2026, 0, 1);

describe("closingSoon", () => {
  it("sorts by nearest upcoming deadline", () => {
    const opportunities = [
      make("far", "2026-06-01"),
      make("near", "2026-01-10"),
      make("mid", "2026-02-01"),
    ];
    expect(closingSoon(opportunities, 3, today).map((o) => o.id)).toEqual([
      "near",
      "mid",
      "far",
    ]);
  });

  it("excludes opportunities with no deadline", () => {
    const opportunities = [make("has-deadline", "2026-01-10"), make("rolling")];
    expect(closingSoon(opportunities, 5, today).map((o) => o.id)).toEqual(["has-deadline"]);
  });

  it("excludes deadlines that have already passed", () => {
    const opportunities = [make("past", "2025-12-01"), make("future", "2026-01-15")];
    expect(closingSoon(opportunities, 5, today).map((o) => o.id)).toEqual(["future"]);
  });

  it("respects the limit", () => {
    const opportunities = [
      make("a", "2026-01-05"),
      make("b", "2026-01-06"),
      make("c", "2026-01-07"),
    ];
    expect(closingSoon(opportunities, 2, today)).toHaveLength(2);
  });
});
