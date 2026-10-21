import { describe, expect, it } from "vitest";
import { emptyStateHint, type EmptyStateFilters } from "./emptyStateHint";

const none: EmptyStateFilters = {
  grade: null,
  interests: [],
  types: [],
  locations: [],
  freeOnly: false,
  query: "",
};

describe("emptyStateHint", () => {
  it("falls back when nothing is filtered", () => {
    expect(emptyStateHint(none)).toMatch(/different keyword/i);
  });

  it("names the single active filter", () => {
    const hint = emptyStateHint({ ...none, grade: 9 });
    expect(hint).toContain("Nothing matches that filter.");
    expect(hint).toContain("removing the grade filter");
  });

  it("counts multiple active filters and suggests the two narrowest", () => {
    const hint = emptyStateHint({
      ...none,
      grade: 12,
      freeOnly: true,
      locations: ["Remote"],
    });
    expect(hint).toContain("all 3 filters");
    // Cost is narrower than location, which is narrower than grade.
    expect(hint).toContain("removing the cost filter or the location one");
  });

  it("quotes the query and suggests dropping it first", () => {
    const hint = emptyStateHint({ ...none, query: "  quantum biology  ", grade: 9 });
    expect(hint).toContain("“quantum biology”");
    expect(hint).toContain("drop the grade filter");
  });

  it("treats a whitespace-only query as inactive", () => {
    expect(emptyStateHint({ ...none, query: "   " })).toMatch(/different keyword/i);
  });
});
