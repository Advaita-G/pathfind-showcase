import { describe, expect, it } from "vitest";
import { buildFitSentence, costLabel, formatGradeRange } from "./opportunityCopy";
import type { Opportunity } from "../data/types";

function make(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: "test",
    title: "Test",
    org: "Test Org",
    type: "Competition",
    interests: ["math"],
    minGrade: 9,
    maxGrade: 12,
    description: "A test opportunity.",
    link: "https://example.com",
    free: true,
    location: "Remote",
    ...overrides,
  };
}

describe("formatGradeRange", () => {
  it("collapses a single grade", () => {
    expect(formatGradeRange(make({ minGrade: 11, maxGrade: 11 }))).toBe("Grade 11");
  });

  it("shows a range otherwise", () => {
    expect(formatGradeRange(make({ minGrade: 10, maxGrade: 12 }))).toBe("Grades 10–12");
  });
});

describe("costLabel", () => {
  it("uses entry-fee wording for competitions", () => {
    expect(costLabel(make({ type: "Competition", free: true }))).toBe("No entry fee");
    expect(costLabel(make({ type: "Competition", free: false }))).toBe("Entry fee");
  });

  it("uses tuition wording for everything else", () => {
    expect(costLabel(make({ type: "Program", free: true }))).toBe("Tuition-free");
    expect(costLabel(make({ type: "Research", free: false }))).toBe("Tuition-based");
    expect(costLabel(make({ type: "Internship", free: true }))).toBe("Tuition-free");
  });
});

describe("buildFitSentence", () => {
  it("builds the sentence from verified fields only", () => {
    expect(buildFitSentence(make())).toBe(
      "A free-to-enter, online competition in Math run by Test Org. Pathfind lists it for grades 9–12.",
    );
  });

  it("uses tuition-based wording and the Bay Area phrase", () => {
    expect(
      buildFitSentence(
        make({ type: "Program", free: false, location: "Bay Area", interests: ["writing", "arts"] }),
      ),
    ).toBe(
      "A tuition-based, Bay Area program in Writing & Journalism and Visual & Performing Arts run by Test Org. Pathfind lists it for grades 9–12.",
    );
  });

  it("describes in-person programs and a single grade", () => {
    expect(buildFitSentence(make({ minGrade: 11, maxGrade: 11, location: "In-Person" }))).toBe(
      "A free-to-enter, in-person competition in Math run by Test Org. Pathfind lists it for grade 11.",
    );
  });

  it("keeps long subject lists readable", () => {
    const sentence = buildFitSentence(
      make({ interests: ["cs", "math", "biology", "chemistry", "physics"] }),
    );
    expect(sentence).toContain("in Computer Science, Math, Biology & Medicine, and related fields");
    expect(sentence).not.toContain("Chemistry");
  });

  it("handles records with no categories", () => {
    expect(buildFitSentence(make({ interests: [] }))).toBe(
      "A free-to-enter, online competition run by Test Org. Pathfind lists it for grades 9–12.",
    );
  });

  it("never makes claims the dataset does not verify", () => {
    const banned = [
      "perfect for you",
      "worth a look",
      "prestigious",
      "elite",
      "impressive",
      "guaranteed",
      "easy",
      "hard to get",
      "best",
      "top school",
      "you'll love",
    ];
    const sentences = [
      buildFitSentence(make()),
      buildFitSentence(make({ type: "Research", free: false, interests: ["biology"] })),
      buildFitSentence(make({ location: "Bay Area", interests: [] })),
    ];
    for (const sentence of sentences) {
      for (const phrase of banned) {
        expect(sentence.toLowerCase()).not.toContain(phrase);
      }
    }
  });
});
