import { describe, expect, test } from "vitest";
import { decodeColleges, describeCollege } from "./colleges";
import directory from "./colleges.generated.json";

const payload = directory as unknown as { source: string; sourceUrl: string; retrievedAt: string; count: number; records: unknown[] };
const colleges = decodeColleges(payload as never);
const byName = new Map(colleges.map((c) => [c.name, c]));

const STATES = ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY",
  "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR",
  "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"];

const UC = ["Berkeley", "Davis", "Irvine", "Los Angeles", "Merced", "Riverside", "San Diego", "Santa Barbara", "Santa Cruz"]
  .map((campus) => `University of California, ${campus}`);
const CSU = [
  "California Polytechnic State University, San Luis Obispo", "California State Polytechnic University, Pomona",
  "California State Polytechnic University, Humboldt", "California State University, Bakersfield",
  "California State University, Channel Islands", "California State University, Chico",
  "California State University, Dominguez Hills", "California State University, East Bay",
  "California State University, Fresno", "California State University, Fullerton", "California State University, Long Beach",
  "California State University, Los Angeles", "California State University Maritime Academy",
  "California State University, Monterey Bay", "California State University, Northridge",
  "California State University, Sacramento", "California State University, San Bernardino",
  "California State University, San Marcos", "California State University, Stanislaus", "San Diego State University",
  "San Francisco State University", "San Jose State University", "Sonoma State University",
];

describe("college directory (IPEDS)", () => {
  test("records its federal source and retrieval date", () => {
    expect(payload.source).toMatch(/IPEDS/);
    expect(payload.sourceUrl).toMatch(/^https:\/\/nces\.ed\.gov\//);
    expect(Number.isNaN(Date.parse(payload.retrievedAt))).toBe(false);
    expect(payload.count).toBe(colleges.length);
  });

  test("is a real national directory, not a curated shortlist", () => {
    // The hand-written list this replaced had 134 names; IPEDS has ~3,900 degree-granting institutions.
    expect(colleges.length).toBeGreaterThan(3500);
    expect(colleges.filter((c) => c.level === "2-year").length).toBeGreaterThan(800);
    expect(colleges.filter((c) => c.hbcu).length).toBeGreaterThan(90);
    expect(colleges.filter((c) => c.tribal).length).toBeGreaterThan(25);
  });

  test("covers all 50 states + DC", () => {
    const states = new Set(colleges.map((c) => c.state));
    for (const state of STATES) expect(states.has(state), `no colleges in ${state}`).toBe(true);
    expect(states.size).toBe(51);
  });

  test("includes every UC and CSU campus exactly once, plus El Camino College", () => {
    for (const name of [...UC, ...CSU, "El Camino College"]) expect(byName.has(name), `missing ${name}`).toBe(true);
    const ucRecords = colleges.filter((c) => c.name.startsWith("University of California, "));
    // 9 undergraduate campuses + UCSF (UC Law SF is "University of California College of the Law, …");
    // no duplicates and no system office.
    expect(ucRecords.map((c) => c.name).sort()).toEqual([...new Set(ucRecords.map((c) => c.name))].sort());
    expect(ucRecords.length).toBe(UC.length + 1);
    // Administrative units (UC Office of the President, CSU Chancellor's Office) are excluded.
    expect(colleges.some((c) => /system administration|chancellors? office|system office/i.test(c.name))).toBe(false);
  });

  test("has unique federal ids and well-formed records", () => {
    const ids = new Set(colleges.map((c) => c.id));
    expect(ids.size).toBe(colleges.length);
    for (const c of colleges) {
      expect(c.id).toBeGreaterThan(0);
      expect(c.name.trim().length).toBeGreaterThan(1);
      expect(c.city.trim().length).toBeGreaterThan(0);
      expect(c.state).toMatch(/^[A-Z]{2}$/);
      expect(["4-year", "2-year"]).toContain(c.level);
    }
    // IPEDS campus hyphens ("University of California-Berkeley") were converted to commas.
    expect(colleges.some((c) => /^(University of California|California State University)-/.test(c.name))).toBe(false);
  });

  test("keeps same-named institutions distinct and describable", () => {
    const bethel = colleges.filter((c) => c.name === "Bethel University");
    expect(bethel.length).toBeGreaterThanOrEqual(3);
    const descriptions = new Set(bethel.map(describeCollege));
    expect(descriptions.size).toBe(bethel.length);
    expect(describeCollege(byName.get("University of California, Berkeley")!)).toBe("Berkeley, CA · Public · 4-year");
  });

  test("carries curated abbreviations as aliases instead of duplicate records", () => {
    expect(byName.get("University of California, Los Angeles")?.aliases).toContain("UCLA");
    expect(byName.get("San Jose State University")?.aliases).toContain("SJSU");
    expect(byName.get("El Camino College")?.aliases).toContain("El Camino Community College District");
    expect(colleges.filter((c) => c.name === "UCLA").length).toBe(0);
  });
});
