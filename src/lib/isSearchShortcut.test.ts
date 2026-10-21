import { describe, expect, it } from "vitest";
import { isSearchShortcut } from "./isSearchShortcut";

const base = { key: "/", ctrlKey: false, metaKey: false, altKey: false, target: { tagName: "BODY" } };

describe("isSearchShortcut", () => {
  it("accepts a bare slash on the page", () => {
    expect(isSearchShortcut(base)).toBe(true);
  });

  it("ignores other keys", () => {
    expect(isSearchShortcut({ ...base, key: "a" })).toBe(false);
  });

  it("ignores slash with a modifier key", () => {
    expect(isSearchShortcut({ ...base, metaKey: true })).toBe(false);
    expect(isSearchShortcut({ ...base, ctrlKey: true })).toBe(false);
    expect(isSearchShortcut({ ...base, altKey: true })).toBe(false);
  });

  it("ignores slash typed in input, textarea, select, or editable text", () => {
    for (const tagName of ["INPUT", "TEXTAREA", "SELECT"]) {
      expect(isSearchShortcut({ ...base, target: { tagName } })).toBe(false);
    }
    expect(isSearchShortcut({ ...base, target: { tagName: "DIV", isContentEditable: true } })).toBe(false);
  });
});
