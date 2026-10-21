import { describe, expect, it } from "vitest";
import { GUIDES, findGuideByPath } from "./guides";
import { findCategoryByPath } from "./categories";
import { OPPORTUNITIES } from "../data/opportunities";

describe("guides", () => {
  it("has a fixed, deliberate set of guides", () => {
    expect(GUIDES.length).toBe(11);
  });

  it("the summer medical research guide curates real lab placements, not lecture courses", () => {
    const guide = GUIDES.find((g) => g.path === "/guides/summer-medical-research-programs-for-high-school-students");
    expect(guide).toBeDefined();
    const matches = OPPORTUNITIES.filter(guide!.predicate);
    const ids = matches.map((o) => o.id);
    // Reference placements the intro names, all verified research/internship records.
    expect(ids).toContain("simr");
    expect(ids).toContain("stanford-grips");
    expect(ids).toContain("ucsf-ssrp");
    expect(ids).toContain("simons-srp");
    // Not tuition lecture courses, competitions, or volunteer roles.
    for (const o of matches) {
      expect(["Research", "Internship", "Program"]).toContain(o.type);
      expect(o.interests).toContain("biology");
    }
    expect(ids).not.toContain("hosa");
    expect(ids).not.toContain("nylf-medicine");
    expect(ids).not.toContain("regeneron-sts");
  });

  it("has unique titles, so two guides can't compete for the same search", () => {
    const titles = GUIDES.map((g) => g.title);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it("links every guide to a category that exists", () => {
    for (const guide of GUIDES) {
      expect(
        findCategoryByPath(guide.relatedCategoryPath),
        `guide ${guide.path} links to missing category ${guide.relatedCategoryPath}`,
      ).toBeDefined();
    }
  });

  it("has unique paths, all under /guides/", () => {
    const paths = GUIDES.map((g) => g.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const path of paths) expect(path.startsWith("/guides/")).toBe(true);
  });

  it("every guide matches at least one real opportunity", () => {
    for (const guide of GUIDES) {
      const count = OPPORTUNITIES.filter(guide.predicate).length;
      expect(count, `guide ${guide.path} matched 0 opportunities`).toBeGreaterThan(0);
    }
  });

  it("every guide has at least 2 non-empty intro paragraphs", () => {
    for (const guide of GUIDES) {
      expect(guide.intro.length).toBeGreaterThanOrEqual(2);
      for (const paragraph of guide.intro) expect(paragraph.length).toBeGreaterThan(40);
    }
  });

  it("finds a guide by exact path and returns undefined otherwise", () => {
    expect(findGuideByPath("/guides/competitions-for-high-school-students")?.title).toBe(
      "Choosing a Competition in High School",
    );
    expect(findGuideByPath("/guides/not-real")).toBeUndefined();
  });
});
