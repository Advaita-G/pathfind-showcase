import { describe, expect, it } from "vitest";
import { DEMO_PATHFIND_IDEAS } from "./pathfindIdeas";
import { LIBRARY_IDEAS } from "./pathfindIdeasLibrary";
import { OPPORTUNITIES } from "./opportunities";

describe("Pathfind idea library", () => {
  it("has unique ids across all ideas", () => {
    const ids = DEMO_PATHFIND_IDEAS.map((idea) => idea.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("links only to opportunities that exist in the verified catalog", () => {
    const known = new Set(OPPORTUNITIES.map((o) => o.id));
    const missing = DEMO_PATHFIND_IDEAS.flatMap((idea) =>
      idea.relatedOpportunityIds.filter((id) => !known.has(id)).map((id) => `${idea.id} -> ${id}`),
    );
    expect(missing).toEqual([]);
  });

  it("fills every structured field for library ideas", () => {
    for (const idea of LIBRARY_IDEAS) {
      expect(idea.problem, idea.id).toBeTruthy();
      expect(idea.whoItHelps, idea.id).toBeTruthy();
      expect(idea.stretchGoal, idea.id).toBeTruthy();
      expect(idea.portfolioValue, idea.id).toBeTruthy();
      expect(idea.tools?.length, idea.id).toBeGreaterThan(0);
      expect(idea.roadmap.length, idea.id).toBeGreaterThanOrEqual(3);
      expect(idea.minWeeklyHours, idea.id).toBeGreaterThan(0);
    }
  });

  it("covers every interest with at least three ideas", () => {
    const counts = new Map<string, number>();
    for (const idea of DEMO_PATHFIND_IDEAS)
      for (const interest of idea.matchesInterests) counts.set(interest, (counts.get(interest) ?? 0) + 1);
    const thin = [...counts].filter(([, n]) => n < 3);
    expect(thin).toEqual([]);
    expect(counts.size).toBe(16);
  });
});
