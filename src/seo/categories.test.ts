import { describe, expect, it } from "vitest";
import { ALL_CATEGORIES, findCategoryByPath } from "./categories";
import { OPPORTUNITIES } from "../data/opportunities";

describe("categories", () => {
  it("has exactly 4 type + 1 free + 4 group + 4 grade + 16 interest + 3 location categories", () => {
    expect(ALL_CATEGORIES.length).toBe(4 + 1 + 4 + 4 + 16 + 3);
  });

  it("every grade category carries distinct, student-context intro copy", () => {
    const gradeIntros = ALL_CATEGORIES.filter((c) => c.kind === "grade").map((c) => c.intro?.join(" ") ?? "");
    expect(gradeIntros.length).toBe(4);
    for (const intro of gradeIntros) {
      expect(intro.length).toBeGreaterThan(80);
    }
    expect(new Set(gradeIntros).size).toBe(4);
  });

  it("every relatedPaths entry points at a category that exists", () => {
    for (const category of ALL_CATEGORIES) {
      for (const path of category.relatedPaths ?? []) {
        expect(findCategoryByPath(path), `${category.path} links to missing ${path}`).toBeDefined();
      }
    }
  });

  it("a topic hub strictly contains every subject page it links to", () => {
    const groups = ALL_CATEGORIES.filter((c) => c.kind === "group");
    expect(groups.length).toBeGreaterThan(0);

    for (const group of groups) {
      // A synonym hub (e.g. /volunteering) deliberately mirrors its taxonomy page instead
      // of being a superset — that's its declared purpose, so skip the strictness rule.
      if (group.synonymOf) continue;
      const groupIds = new Set(OPPORTUNITIES.filter(group.predicate).map((o) => o.id));
      expect(group.relatedPaths?.length, `group ${group.path} links nowhere`).toBeGreaterThan(0);

      for (const path of group.relatedPaths ?? []) {
        const child = findCategoryByPath(path)!;
        const childIds = OPPORTUNITIES.filter(child.predicate).map((o) => o.id);
        expect(
          childIds.every((id) => groupIds.has(id)),
          `${path} lists an opportunity that ${group.path} excludes`,
        ).toBe(true);
        expect(groupIds.size, `${group.path} adds nothing beyond ${path}`).toBeGreaterThan(childIds.length);
      }
    }
  });

  it("has unique paths, all starting with /", () => {
    const paths = ALL_CATEGORIES.map((c) => c.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const path of paths) expect(path.startsWith("/")).toBe(true);
  });

  it("every category matches at least one real opportunity", () => {
    for (const category of ALL_CATEGORIES) {
      const count = OPPORTUNITIES.filter(category.predicate).length;
      expect(count, `category ${category.path} matched 0 opportunities`).toBeGreaterThan(0);
    }
  });

  it("derives interest slugs from the interest label", () => {
    const dataScience = findCategoryByPath("/interests/data-science-ai");
    expect(dataScience?.title).toContain("Data Science & AI");
  });

  it("derives location slugs correctly, including the hyphenated one", () => {
    expect(findCategoryByPath("/locations/bay-area")).toBeDefined();
    expect(findCategoryByPath("/locations/remote")).toBeDefined();
    expect(findCategoryByPath("/locations/in-person")).toBeDefined();
  });

  it("buildDescription embeds the given count", () => {
    const research = findCategoryByPath("/research-programs")!;
    expect(research.buildDescription(7)).toContain("7");
  });

  it("returns undefined for an unknown path", () => {
    expect(findCategoryByPath("/not-a-real-category")).toBeUndefined();
  });
});
