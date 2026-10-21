import { describe, expect, it } from "vitest";
import { resolveOpportunityIds, resolveCollegeIds } from "./assistantCatalog";
import type { College } from "../data/colleges";

describe("resolveOpportunityIds", () => {
  it("resolves a known id to the real canonical record", () => {
    const [resolved] = resolveOpportunityIds(["cosmos"]);
    expect(resolved).toBeDefined();
    expect(resolved.id).toBe("cosmos");
  });

  it("silently drops ids that don't exist in the local catalog", () => {
    expect(resolveOpportunityIds(["cosmos", "not-a-real-id"])).toHaveLength(1);
    expect(resolveOpportunityIds(["totally-made-up"])).toHaveLength(0);
  });
});

describe("resolveCollegeIds", () => {
  const colleges: College[] = [
    {
      id: 1,
      name: "Test University",
      city: "Testville",
      state: "CA",
      control: "public",
      level: "4-year",
      hbcu: false,
      tribal: false,
      website: null,
      aliases: [],
    },
  ];

  it("resolves known ids and drops unknown ones", () => {
    expect(resolveCollegeIds([1, 999], colleges).map((c) => c.id)).toEqual([1]);
  });
});
