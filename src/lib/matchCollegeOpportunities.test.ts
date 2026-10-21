import { describe, expect, test } from "vitest";
import { opportunitiesForCollege } from "./matchCollegeOpportunities";
import { COLLEGE_OPPORTUNITY_IDS, LEGACY_COLLEGE_NAMES } from "../data/collegeOpportunityLinks";
import { OPPORTUNITIES } from "../data/opportunities";
import { decodeColleges } from "../data/colleges";
import directory from "../data/colleges.generated.json";

const COLLEGE_NAMES = new Set(decodeColleges(directory as never).map((college) => college.name));

describe("opportunitiesForCollege", () => {
  test("returns nothing for an unrecognized string", () => {
    expect(opportunitiesForCollege(OPPORTUNITIES, "Not A Real College")).toEqual([]);
  });

  test("returns nothing for a college with no verified links", () => {
    expect(opportunitiesForCollege(OPPORTUNITIES, "Harvard University")).toEqual([]);
  });

  test("returns nothing for a college whose name coincidentally collides with an unrelated org", () => {
    // Davidson College has no real link — "Davidson Fellows" is run by the unrelated
    // Davidson Institute for Talent Development, and must never appear here.
    expect(opportunitiesForCollege(OPPORTUNITIES, "Davidson College")).toEqual([]);
    expect(opportunitiesForCollege(OPPORTUNITIES, "American University")).toEqual([]);
    expect(opportunitiesForCollege(OPPORTUNITIES, "University of San Francisco")).toEqual([]);
  });

  test("resolves real ids to real opportunities for a verified college", () => {
    const matches = opportunitiesForCollege(OPPORTUNITIES, "Stanford University");
    expect(matches.length).toBe(COLLEGE_OPPORTUNITY_IDS["Stanford University"].length);
    for (const match of matches) {
      expect(match.org).toMatch(/stanford/i);
    }
  });

  test("legacy saved names (pre-directory abbreviations) still resolve", () => {
    expect(opportunitiesForCollege(OPPORTUNITIES, "UC Berkeley").map((o) => o.id)).toEqual(
      COLLEGE_OPPORTUNITY_IDS["University of California, Berkeley"],
    );
    expect(opportunitiesForCollege(OPPORTUNITIES, "MIT").length).toBeGreaterThan(0);
    // Case and punctuation differences don't matter.
    expect(opportunitiesForCollege(OPPORTUNITIES, "university of california berkeley").length).toBeGreaterThan(0);
  });
});

describe("COLLEGE_OPPORTUNITY_IDS data integrity", () => {
  const opportunityIds = new Set(OPPORTUNITIES.map((o) => o.id));

  test("every college key is a canonical name in the generated directory", () => {
    for (const college of Object.keys(COLLEGE_OPPORTUNITY_IDS)) {
      expect(COLLEGE_NAMES.has(college), `${college} is not a directory display name`).toBe(true);
    }
    for (const canonical of Object.values(LEGACY_COLLEGE_NAMES)) {
      expect(COLLEGE_OPPORTUNITY_IDS[canonical], `${canonical} has no link entry`).toBeDefined();
    }
  });

  test("every referenced opportunity id actually exists", () => {
    for (const [college, ids] of Object.entries(COLLEGE_OPPORTUNITY_IDS)) {
      for (const id of ids) {
        expect(opportunityIds.has(id), `${college} references missing opportunity "${id}"`).toBe(true);
      }
    }
  });

  test("every referenced opportunity's org field plausibly names the college", () => {
    const byId = new Map(OPPORTUNITIES.map((o) => [o.id, o]));
    // Canonical names are long-form ("University of California, Berkeley"); the org fields use
    // the everyday form, so check for the campus word or the well-known abbreviation.
    const ORG_PATTERNS: Record<string, RegExp> = {
      "University of California, Berkeley": /berkeley/i,
      "University of California, Davis": /davis/i,
      "University of Southern California": /\busc\b|southern california/i,
      "Massachusetts Institute of Technology": /\bmit\b|massachusetts institute/i,
      "Georgia Institute of Technology": /georgia tech|georgia institute|\bgtri\b/i,
    };
    for (const [college, ids] of Object.entries(COLLEGE_OPPORTUNITY_IDS)) {
      const keyword = college.replace(/\b(University|College|of)\b/gi, "").trim().split(/\s+/)[0];
      const pattern = ORG_PATTERNS[college] ?? new RegExp(keyword, "i");
      for (const id of ids) {
        const org = byId.get(id)?.org ?? "";
        expect(
          pattern.test(org),
          `${college} -> ${id} has org "${org}", which doesn't obviously reference ${pattern}`,
        ).toBe(true);
      }
    }
  });
});
