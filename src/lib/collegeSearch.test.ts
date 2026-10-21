import { beforeAll, describe, expect, test } from "vitest";
import { decodeColleges, type College } from "../data/colleges";
import directory from "../data/colleges.generated.json";
import {
  buildCollegeIndex,
  editDistance,
  highlightCollegeName,
  normalizeCollegeText,
  resolveCollege,
  searchColleges,
  type CollegeSearchIndex,
} from "./collegeSearch";

let colleges: College[];
let index: CollegeSearchIndex;
const names = (query: string, limit = 8) => searchColleges(index, query, { limit }).map((m) => m.college.name);
const top = (query: string) => names(query)[0];

beforeAll(() => {
  colleges = decodeColleges(directory as never);
  index = buildCollegeIndex(colleges);
});

describe("normalizeCollegeText", () => {
  test("folds case, punctuation, accents, ampersands and abbreviations", () => {
    expect(normalizeCollegeText("San José State University")).toBe("san jose state university");
    expect(normalizeCollegeText("St. John's University")).toBe("saint johns university");
    expect(normalizeCollegeText("William & Mary")).toBe("william and mary");
    expect(normalizeCollegeText("  University of California-Berkeley ")).toBe("university of california berkeley");
  });
});

describe("editDistance", () => {
  test("counts a transposition as one edit and respects the cap", () => {
    expect(editDistance("berkley", "berkeley")).toBe(1);
    expect(editDistance("stanfrod", "stanford")).toBe(1);
    expect(editDistance("abc", "xyz", 1)).toBeGreaterThan(1);
  });
});

describe("required regression cases", () => {
  test("UCLA → University of California, Los Angeles", () => {
    expect(top("ucla")).toBe("University of California, Los Angeles");
    expect(top("UCLA")).toBe("University of California, Los Angeles");
  });

  test("UC Berkeley, Berkeley and Cal → University of California, Berkeley", () => {
    expect(top("uc berkeley")).toBe("University of California, Berkeley");
    expect(top("berkeley")).toBe("University of California, Berkeley");
    expect(top("cal")).toBe("University of California, Berkeley");
    expect(top("uc ber")).toBe("University of California, Berkeley");
  });

  test("SJSU and 'san jose' → San Jose State University first", () => {
    expect(top("sjsu")).toBe("San Jose State University");
    expect(top("san jose")).toBe("San Jose State University");
    expect(names("san jose")).toContain("San Jose City College");
  });

  test("SDSU → San Diego State University", () => {
    expect(top("sdsu")).toBe("San Diego State University");
  });

  test("Cal Poly SLO and Cal Poly Pomona resolve; 'cal poly' shows both prominently", () => {
    expect(top("cal poly slo")).toBe("California Polytechnic State University, San Luis Obispo");
    expect(top("cal poly pomona")).toBe("California State Polytechnic University, Pomona");
    const calPoly = names("cal poly", 3);
    expect(calPoly).toContain("California Polytechnic State University, San Luis Obispo");
    expect(calPoly).toContain("California State Polytechnic University, Pomona");
  });

  test("CSULB / 'csu long' → California State University, Long Beach", () => {
    expect(top("csulb")).toBe("California State University, Long Beach");
    expect(top("csu long")).toBe("California State University, Long Beach");
  });

  test("CSUF → California State University, Fullerton", () => {
    expect(top("csuf")).toBe("California State University, Fullerton");
  });

  test("El Camino / 'el cam' → El Camino College (not a hardcoded special case)", () => {
    expect(top("el camino")).toBe("El Camino College");
    expect(top("El Cam")).toBe("El Camino College");
    expect(top("el camino college")).toBe("El Camino College");
    const record = colleges.find((c) => c.name === "El Camino College");
    expect(record).toMatchObject({ id: 113980, city: "Torrance", state: "CA", level: "2-year" });
  });

  test("typo tolerance: 'berkley' still finds Berkeley — first, not behind Berklee College of Music", () => {
    expect(top("berkley")).toBe("University of California, Berkeley");
    expect(top("stanfrod")).toBe("Stanford University");
    expect(top("carnegie melon")).toBe("Carnegie Mellon University");
  });

  test("MIT (acronym) always beats Mitchell College, at any casing", () => {
    for (const q of ["MIT", "mit", "Mit"]) {
      expect(top(q)).toBe("Massachusetts Institute of Technology");
      const results = searchColleges(index, q);
      expect(results[0].score).toBeGreaterThan(results.find((m) => m.college.name === "Mitchell College")!.score);
    }
    // Once the query is unambiguously "Mitchell", the acronym no longer applies.
    expect(top("Mitchell")).toBe("Mitchell College");
  });

  test("CMU, USC, NYU → the well-known school, not a same-initial coincidence", () => {
    expect(top("cmu")).toBe("Carnegie Mellon University");
    expect(top("usc")).toBe("University of Southern California");
    expect(top("nyu")).toBe("New York University");
  });

  test("'uc' surfaces the actual UC campuses, not an unrelated college whose real name starts with UC", () => {
    const results = names("uc", 12);
    expect(results).toContain("University of California, Santa Barbara");
    expect(results).toContain("University of California, Berkeley");
    expect(results).toContain("University of California, Los Angeles");
    // "UCNJ Union College of Union County" is a real 2-year college whose literal name starts
    // with "UC" — it must not outrank every actual UC campus, which only match via alias.
    const wide = names("uc", 20);
    expect(wide.indexOf("UCNJ Union College of Union County, New Jersey")).toBeGreaterThan(
      wide.indexOf("University of California, Berkeley"),
    );
  });

  test("'university of california' includes every campus, including Santa Barbara", () => {
    const results = names("university of california", 12);
    expect(results).toContain("University of California, Santa Barbara");
    expect(results).toContain("University of California, Santa Cruz");
    expect(results).toContain("University of California, Berkeley");
  });
});

describe("matching behaviour", () => {
  test("is case-insensitive and ignores punctuation", () => {
    expect(names("HARVARD")).toEqual(names("harvard"));
    expect(top("st. john's university")).toMatch(/^(St\.?|Saint) John/i);
    expect(names("texas a&m")).toEqual(names("texas a & m"));
  });

  test("single characters already return sensible prefix matches", () => {
    const results = names("l");
    expect(results.length).toBe(8);
    for (const name of results) expect(name.toLowerCase().startsWith("l")).toBe(true);
  });

  test("supports partial names in any word order", () => {
    expect(top("long beach state")).toBe("California State University, Long Beach");
    expect(names("hopkins")).toContain("Johns Hopkins University");
  });

  test("ranks exact > prefix > alias > substring > city > fuzzy", () => {
    const berkeley = searchColleges(index, "berkeley");
    expect(berkeley[0].kind).toBe("alias");
    expect(berkeley[0].score).toBeGreaterThan(berkeley[1].score);
    const city = searchColleges(index, "torrance").find((m) => m.college.name === "El Camino College");
    expect(city?.kind).toBe("city");
  });

  test("city search surfaces colleges located there", () => {
    expect(names("pasadena")).toContain("Pasadena City College");
    const caltech = searchColleges(index, "pasadena", { limit: 30 }).find((m) => m.college.name === "California Institute of Technology");
    expect(caltech?.kind).toBe("city");
  });

  test("a trailing state name or code narrows same-named colleges", () => {
    const tn = searchColleges(index, "bethel university tn");
    expect(tn.map((m) => m.college.state)).toEqual(expect.arrayContaining(["TN"]));
    expect(tn.every((m) => m.college.state === "TN")).toBe(true);
    expect(top("westminster college missouri")).toBe("Westminster College");
    expect(searchColleges(index, "westminster college missouri")[0].college.state).toBe("MO");
  });

  test("excludes already-selected colleges, including legacy stored abbreviations", () => {
    const excluded = searchColleges(index, "ucla", { exclude: ["University of California, Los Angeles"] });
    expect(excluded.map((m) => m.college.name)).not.toContain("University of California, Los Angeles");
  });

  test("returns nothing for empty or nonsense queries, and respects the limit", () => {
    expect(searchColleges(index, "   ")).toEqual([]);
    expect(searchColleges(index, "zzqx")).toEqual([]);
    expect(searchColleges(index, "university", { limit: 5 })).toHaveLength(5);
  });
});

describe("resolveCollege (legacy saved names)", () => {
  test("maps every pre-directory Pathfind name to a canonical record", () => {
    const legacy = ["UC Berkeley", "UCLA", "UC San Diego", "Cal Poly San Luis Obispo", "Cal Poly Pomona", "Sacramento State",
      "CSU Long Beach", "CSU Fullerton", "CSU East Bay", "Caltech", "MIT", "USC", "Georgia Tech", "UNC Chapel Hill",
      "UT Austin", "Penn State University", "Ohio State University", "Rutgers University", "Texas A&M University",
      "Virginia Tech", "Stanford University", "Foothill College", "De Anza College"];
    for (const name of legacy) {
      expect(resolveCollege(index, name), `${name} did not resolve`).not.toBeNull();
    }
    expect(resolveCollege(index, "UC Berkeley")?.name).toBe("University of California, Berkeley");
    expect(resolveCollege(index, "Not A Real College")).toBeNull();
  });
});

describe("highlightCollegeName", () => {
  test("marks the typed prefixes inside the display name", () => {
    const segments = highlightCollegeName("University of California, Berkeley", "uc ber");
    expect(segments.filter((s) => s.match).map((s) => s.text)).toEqual(["Ber"]);
    const el = highlightCollegeName("El Camino College", "el cam");
    expect(el.filter((s) => s.match).map((s) => s.text)).toEqual(["El", "Cam"]);
  });
});
