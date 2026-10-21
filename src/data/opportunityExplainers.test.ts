import { describe, expect, it } from "vitest";
import { OPPORTUNITIES } from "./opportunities";
import { OPPORTUNITY_EXPLAINERS, getOpportunityExplainer } from "./opportunityExplainers";

/**
 * These tests are the guardrail on the drawer's explainer copy: it may restate verified
 * record fields freely, but any fact beyond the record has to be backed by a source the
 * copy was checked against. Filler and unverifiable claims fail the build.
 */

const byId = new Map(OPPORTUNITIES.map((o) => [o.id, o]));

/** Everything the record itself verifies, as one searchable blob. */
function recordText(id: string): string {
  const o = byId.get(id)!;
  return [
    o.title,
    o.org,
    o.type,
    o.description,
    o.link,
    o.location,
    String(o.minGrade),
    String(o.maxGrade),
    o.deadline ?? "",
    o.interests.join(" "),
  ].join(" ");
}

const BANNED_PHRASES = [
  "worth a look if you're into",
  "perfect for you",
  "perfect fit",
  "prestigious",
  "elite",
  "impressive",
  "guaranteed",
  "looks great on",
  "will impress",
  "stands out to colleges",
  "boost your college",
  "highly competitive",
  "top school",
  "best in the country",
  "you'll love",
  "amazing opportunity",
];

describe("OPPORTUNITY_EXPLAINERS", () => {
  const entries = Object.entries(OPPORTUNITY_EXPLAINERS);

  it("only covers opportunities that exist", () => {
    const unknown = entries.map(([id]) => id).filter((id) => !byId.has(id));
    expect(unknown).toEqual([]);
  });

  it("gives every entry something to say", () => {
    for (const [id, explainer] of entries) {
      const text = [explainer.whatYouDo, explainer.whyWorthIt, explainer.fit]
        .filter(Boolean)
        .join(" ");
      expect(text.length, `${id} has no copy`).toBeGreaterThan(40);
    }
  });

  it("keeps entries short enough to read in a drawer", () => {
    for (const [id, explainer] of entries) {
      for (const [field, value] of Object.entries(explainer)) {
        if (field === "source" || !value) continue;
        expect((value as string).length, `${id}.${field} is too long`).toBeLessThanOrEqual(900);
      }
    }
  });

  it("backs any fact beyond the record with a source", () => {
    const unsourced: string[] = [];
    for (const [id, explainer] of entries) {
      const copy = [explainer.whatYouDo, explainer.whyWorthIt, explainer.fit]
        .filter(Boolean)
        .join(" ");
      const record = recordText(id);
      const introduced = (copy.match(/\d+(?:\.\d+)?/g) ?? []).filter((n) => !record.includes(n));
      if (introduced.length > 0 && !explainer.source) {
        unsourced.push(`${id}: ${[...new Set(introduced)].join(", ")}`);
      }
    }
    expect(unsourced).toEqual([]);
  });

  it("points sources at real https pages", () => {
    for (const [id, explainer] of entries) {
      if (!explainer.source) continue;
      const urls = explainer.source.split(";").map((u) => u.trim());
      expect(urls.length, `${id} source is empty`).toBeGreaterThan(0);
      for (const url of urls) {
        expect(url, `${id} source is not https`).toMatch(/^https:\/\/\S+$/);
      }
    }
  });

  it("avoids unsupported or filler phrasing", () => {
    for (const [id, explainer] of entries) {
      const copy = [explainer.whatYouDo, explainer.whyWorthIt, explainer.fit]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      for (const phrase of BANNED_PHRASES) {
        expect(copy, `${id} contains "${phrase}"`).not.toContain(phrase);
      }
    }
  });

  it("does not reuse the same sentence across opportunities", () => {
    const seen = new Map<string, string>();
    const duplicates: string[] = [];
    for (const [id, explainer] of entries) {
      const copy = [explainer.whatYouDo, explainer.whyWorthIt, explainer.fit]
        .filter(Boolean)
        .join(" ");
      for (const sentence of copy.split(/(?<=\.)\s+/)) {
        const key = sentence.trim();
        if (key.length < 30) continue;
        const previous = seen.get(key);
        if (previous) duplicates.push(`${id} repeats ${previous}: ${key.slice(0, 60)}…`);
        else seen.set(key, id);
      }
    }
    expect(duplicates).toEqual([]);
  });
});

describe("getOpportunityExplainer", () => {
  it("returns the entry for a known id", () => {
    expect(getOpportunityExplainer("amc")?.whatYouDo).toContain("25 multiple-choice questions");
  });

  it("returns null for unknown or missing ids", () => {
    expect(getOpportunityExplainer("not-a-real-id")).toBeNull();
    expect(getOpportunityExplainer(undefined)).toBeNull();
    expect(getOpportunityExplainer(null)).toBeNull();
    expect(getOpportunityExplainer("")).toBeNull();
  });
});

describe("AMC 10/12 reference entry", () => {
  const amc = OPPORTUNITY_EXPLAINERS.amc;

  it("distinguishes AMC 10 from AMC 12 eligibility", () => {
    expect(amc.fit).toContain("grade 10 and below");
    expect(amc.fit).toContain("17.5");
    expect(amc.fit).toContain("grade 12 and below");
    expect(amc.fit).toContain("19.5");
  });

  it("explains the competition experience for a beginner", () => {
    expect(amc.whatYouDo).toContain("75 minutes");
    expect(amc.whatYouDo).toContain("November 5, 2026");
    expect(amc.whatYouDo).toContain("competition manager");
  });

  it("cites the MAA pages the extra facts came from", () => {
    expect(amc.source).toContain("maa.org");
  });
});
