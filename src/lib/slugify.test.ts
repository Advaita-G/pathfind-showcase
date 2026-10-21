import { describe, expect, it } from "vitest";
import { slugify } from "./slugify";

describe("slugify", () => {
  it("lowercases and hyphenates plain labels", () => {
    expect(slugify("Computer Science")).toBe("computer-science");
  });

  it("strips ampersands and collapses the resulting gap", () => {
    expect(slugify("Data Science & AI")).toBe("data-science-ai");
  });

  it("handles labels that already contain a hyphen", () => {
    expect(slugify("In-Person")).toBe("in-person");
  });

  it("handles multi-word labels with punctuation", () => {
    expect(slugify("Psychology & Neuroscience")).toBe("psychology-neuroscience");
  });

  it("never leaves a leading or trailing hyphen", () => {
    expect(slugify("  Bay Area  ")).toBe("bay-area");
  });
});
