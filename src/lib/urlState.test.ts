import { describe, expect, test } from "vitest";
import { decodeFilters, encodeFilters, type FilterState } from "./urlState";

const empty: FilterState = {
  grade: null,
  interests: [],
  types: [],
  locations: [],
  freeOnly: false,
  query: "",
  sortBy: "deadline",
};

describe("encodeFilters", () => {
  test("produces an empty string when nothing is filtered", () => {
    expect(encodeFilters(empty)).toBe("");
  });

  test("encodes grade, interests, types, query, and a non-default sort", () => {
    const encoded = encodeFilters({
      grade: 11,
      interests: ["cs", "ai"],
      types: ["Internship"],
      locations: ["Remote"],
      freeOnly: true,
      query: "stanford",
      sortBy: "grade",
    });

    expect(encoded).toBe(
      "grade=11&interests=cs%2Cai&types=Internship&locations=Remote&free=1&q=stanford&sort=grade",
    );
  });

  test("omits the sort parameter when it is the default", () => {
    expect(encodeFilters({ ...empty, grade: 9 })).toBe("grade=9");
  });
});

describe("decodeFilters", () => {
  test("returns defaults for an empty query string", () => {
    expect(decodeFilters("")).toEqual(empty);
  });

  test("round-trips an encoded state", () => {
    const state: FilterState = {
      grade: 12,
      interests: ["biology", "writing"],
      types: ["Research", "Program"],
      locations: ["Bay Area", "Remote"],
      freeOnly: true,
      query: "lab",
      sortBy: "type",
    };

    expect(decodeFilters(encodeFilters(state))).toEqual(state);
  });

  test("ignores unknown interests, types, grades, and sorts", () => {
    const decoded = decodeFilters(
      "grade=42&interests=cs,notreal&types=Program,Bogus&locations=Remote,Moon&free=yes&sort=nope",
    );

    expect(decoded).toEqual({
      grade: null,
      interests: ["cs"],
      types: ["Program"],
      locations: ["Remote"],
      freeOnly: false,
      query: "",
      sortBy: "deadline",
    });
  });
});
