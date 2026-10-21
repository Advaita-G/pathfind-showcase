import { describe, expect, test } from "vitest";
import { CANONICAL_TAGS, canonicalTagsForInputs, isCanonicalTag, sortTags, tagsForText } from "./tags";

describe("canonical tags", () => {
  test("maps abbreviations onto their canonical tag", () => {
    expect(canonicalTagsForInputs(["ML"])).toEqual(["Machine Learning"]);
    expect(canonicalTagsForInputs(["sjsu"])).toEqual([]);
    expect(canonicalTagsForInputs(["cs"])).toEqual(["Computer Science"]);
  });

  test("maps multi-word synonyms", () => {
    expect(canonicalTagsForInputs(["artificial intelligence"])).toEqual(["AI"]);
    expect(canonicalTagsForInputs(["machine learning"])).toEqual(["Machine Learning"]);
    expect(canonicalTagsForInputs(["coding"])).toEqual(["Computer Science", "Programming"]);
  });

  test("maps a compound phrase onto every tag it names", () => {
    expect(canonicalTagsForInputs(["environmental engineering"])).toEqual([
      "Engineering",
      "Environmental Science",
    ]);
    expect(canonicalTagsForInputs(["sports analytics"])).toEqual(["Data Science", "Statistics", "Sports"]);
    expect(canonicalTagsForInputs(["quant"])).toEqual(["Data Science", "Math", "Finance"]);
  });

  test("keeps AI ethics on the AI tag without inventing an ethics tag", () => {
    expect(canonicalTagsForInputs(["AI ethics"])).toEqual(["AI"]);
  });

  test("matches whole words only", () => {
    expect(tagsForText("The chair sat on the earth")).toEqual([]);
    expect(tagsForText("An AI research lab")).toEqual(["AI", "Research"]);
  });

  test("ignores punctuation and casing differences", () => {
    expect(tagsForText("A.I./M.L. research")).toEqual(["AI", "Machine Learning", "Research"]);
  });

  test("returns nothing for phrases with no canonical wording", () => {
    expect(tagsForText("competitive knitting")).toEqual([]);
    expect(canonicalTagsForInputs(["underwater basket weaving"])).toEqual([]);
  });

  test("sortTags drops unknown values and de-duplicates", () => {
    expect(sortTags(["Research", "Research", "Not A Tag" as never])).toEqual(["Research"]);
    expect(sortTags(["Writing", "AI"])).toEqual(["AI", "Writing"]);
  });

  test("every alias resolves to a tag in the published vocabulary", () => {
    for (const tag of sortTags(CANONICAL_TAGS)) {
      expect(isCanonicalTag(tag)).toBe(true);
      expect(canonicalTagsForInputs([tag])).toContain(tag);
    }
  });
});
