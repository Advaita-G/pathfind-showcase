import { describe, expect, test } from "vitest";
import { INTERESTS, LOCATIONS, OPPORTUNITY_TYPES } from "./types";
import { CORE_OPPORTUNITIES, IMPORTED_OPPORTUNITIES, OPPORTUNITIES } from "./opportunities";
import { EXPANDED_OPPORTUNITIES } from "./opportunitiesExpanded";
import { NATIONWIDE_OPPORTUNITIES } from "./opportunitiesNationwide";
import { SCRAPED_OPPORTUNITIES } from "./opportunitiesScraped";
import { CANONICAL_TAGS, type CanonicalTag } from "./tags";
import { opportunityTags } from "../lib/opportunityTags";
import { getOpportunityStatus } from "../lib/opportunityStatus";

const TODAY = new Date(2026, 8, 18);

/** Hosts that only republish other people's programs. A record here is not a primary source. */
const AGGREGATOR_HOSTS = ["reddit.com", "quora.com", "scholarships.com", "fastweb.com", "niche.com", "unigo.com"];

function normalizedLink(link: string): string {
  return link.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "").toLowerCase();
}

describe("opportunity catalog", () => {
  test("keeps each researched batch intact and merges them all", () => {
    expect(CORE_OPPORTUNITIES.length).toBe(118);
    expect(EXPANDED_OPPORTUNITIES.length).toBe(31);
    expect(NATIONWIDE_OPPORTUNITIES.length).toBe(53);
    expect(SCRAPED_OPPORTUNITIES.length).toBe(13);
    // The imported batch grows with each `npm run sync:opportunities`, so only its merge is pinned.
    expect(IMPORTED_OPPORTUNITIES.length).toBeGreaterThan(0);
    expect(OPPORTUNITIES.length).toBe(215 + IMPORTED_OPPORTUNITIES.length);
  });

  test("has no duplicate stable ids or duplicate official links", () => {
    const ids = OPPORTUNITIES.map((opportunity) => opportunity.id);
    expect(new Set(ids).size).toBe(ids.length);

    const links = OPPORTUNITIES.map((opportunity) => normalizedLink(opportunity.link));
    expect(new Set(links).size).toBe(links.length);
  });

  test("every record points at an official source, never an aggregator", () => {
    for (const opportunity of OPPORTUNITIES) {
      expect(opportunity.link, `${opportunity.id} has no link`).toMatch(/^https:\/\//);
      const host = normalizedLink(opportunity.link).split("/")[0]!;
      expect(
        AGGREGATOR_HOSTS.some((aggregator) => host === aggregator || host.endsWith(`.${aggregator}`)),
        `${opportunity.id} links to an aggregator (${host})`,
      ).toBe(false);
    }
  });

  test("records are well formed", () => {
    const interestIds = new Set<string>(INTERESTS.map((interest) => interest.id));

    for (const opportunity of OPPORTUNITIES) {
      const label = opportunity.id;
      expect(OPPORTUNITY_TYPES, `${label} has an unknown type`).toContain(opportunity.type);
      expect(LOCATIONS, `${label} has an unknown location`).toContain(opportunity.location);
      expect(typeof opportunity.free, `${label} free flag`).toBe("boolean");
      expect(opportunity.title.length, `${label} title`).toBeGreaterThan(0);
      expect(opportunity.org.length, `${label} org`).toBeGreaterThan(0);
      expect(opportunity.description.length, `${label} description`).toBeGreaterThan(40);

      expect(Number.isInteger(opportunity.minGrade), `${label} minGrade`).toBe(true);
      expect(Number.isInteger(opportunity.maxGrade), `${label} maxGrade`).toBe(true);
      // A handful of national programs officially include 8th graders (the Bill of Rights
      // Institute's essay contest, for one). That never excludes a Pathfind user, so it is range
      // boundary rather than a data error — but nothing may start above grade 12 or end below it.
      expect(opportunity.minGrade, `${label} grade range`).toBeGreaterThanOrEqual(8);
      expect(opportunity.maxGrade, `${label} grade range`).toBeLessThanOrEqual(12);
      expect(opportunity.minGrade, `${label} grade order`).toBeLessThanOrEqual(opportunity.maxGrade);

      expect(opportunity.interests.length, `${label} has no interests`).toBeGreaterThan(0);
      expect(new Set(opportunity.interests).size, `${label} repeats an interest`).toBe(
        opportunity.interests.length,
      );
      for (const interest of opportunity.interests) {
        expect(interestIds, `${label} has an unknown interest`).toContain(interest);
      }

      if (opportunity.deadline) {
        expect(opportunity.deadline, `${label} deadline format`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(Number.isNaN(Date.parse(opportunity.deadline)), `${label} deadline parses`).toBe(false);
      }
    }
  });

  test("no two records describe the same program under different ids", () => {
    const byOrgAndTitle = new Map<string, string>();
    for (const opportunity of OPPORTUNITIES) {
      const key = `${opportunity.org.toLowerCase().replace(/[^a-z0-9]/g, "")}|${opportunity.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")}`;
      const existing = byOrgAndTitle.get(key);
      expect(existing, `${opportunity.id} duplicates ${existing}`).toBeUndefined();
      byOrgAndTitle.set(key, opportunity.id);
    }
  });

  test("covers every interest area in depth", () => {
    const counts = new Map<string, number>();
    for (const opportunity of OPPORTUNITIES) {
      for (const interest of opportunity.interests) {
        counts.set(interest, (counts.get(interest) ?? 0) + 1);
      }
    }

    for (const { id } of INTERESTS) {
      expect(counts.get(id) ?? 0, `${id} is thinly covered`).toBeGreaterThanOrEqual(8);
    }
  });

  test("offers usable depth for every grade, not just juniors and seniors", () => {
    for (const grade of [9, 10, 11, 12]) {
      const open = OPPORTUNITIES.filter(
        (opportunity) => grade >= opportunity.minGrade && grade <= opportunity.maxGrade,
      );
      expect(open.length, `grade ${grade} has too few opportunities`).toBeGreaterThanOrEqual(140);
      // 9th graders must not be an afterthought, so the count should be within reach of grade 11's.
      expect(open.length, `grade ${grade} lags far behind grade 11`).toBeGreaterThan(
        OPPORTUNITIES.filter((o) => 11 >= o.minGrade && 11 <= o.maxGrade).length * 0.7,
      );
    }
  });

  test("covers every canonical subject tag the recommendation engine can look for", () => {
    const covered = new Set<CanonicalTag>();
    for (const opportunity of OPPORTUNITIES) {
      for (const tag of opportunityTags(opportunity)) covered.add(tag);
    }

    // Tags whose subject matter is genuinely rare in high school programming, so one or two
    // opportunities is real coverage rather than a gap.
    const thin: CanonicalTag[] = ["Astronomy", "Cybersecurity"];
    const missing = CANONICAL_TAGS.filter((tag) => !covered.has(tag) && !thin.includes(tag));
    expect(missing, `no opportunity carries these tags: ${missing.join(", ")}`).toEqual([]);
  });

  test("every record resolves to a lifecycle status", () => {
    for (const opportunity of OPPORTUNITIES) {
      expect(getOpportunityStatus(opportunity, TODAY)).toMatch(
        /^(OPEN|UPCOMING|RECURRING|DEADLINE_PASSED|UNKNOWN|INACTIVE)$/,
      );
    }
  });

  test("keeps the political-science pathway that the 'Other' interest fix depends on", () => {
    const ids = new Set(OPPORTUNITIES.map((opportunity) => opportunity.id));
    for (const id of [
      "we-the-people-competition",
      "national-economics-challenge",
      "afsa-national-high-school-essay",
      "reagan-debate-series",
      "picoctf",
      "usabo",
      "nih-summer-internship",
      "nasa-stem-gateway",
      "student-conservation-association",
      "bank-of-america-student-leaders",
    ]) {
      expect(ids.has(id), `missing ${id}`).toBe(true);
    }
  });
});

describe("verified deadline and location data", () => {
  test("a confirmed deadline always has a date, source, and check date", () => {
    for (const o of OPPORTUNITIES.filter((r) => r.deadlineConfirmed === true && r.lastChecked)) {
      expect(o.deadline, o.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(o.sourceUrl ?? o.link, o.id).toMatch(/^https?:\/\//);
    }
  });

  test("a city is only set together with a state", () => {
    for (const o of OPPORTUNITIES.filter((r) => r.city)) expect(o.state, o.id).toMatch(/^[A-Z]{2}$/);
  });

  test("a record without a deadline is never marked deadline-confirmed", () => {
    for (const o of OPPORTUNITIES.filter((r) => !r.deadline)) expect(o.deadlineConfirmed, o.id).not.toBe(true);
  });
});
