import { describe, expect, test } from "vitest";
import { toggleBookmark } from "./bookmarks";

describe("toggleBookmark", () => {
  test("adds an id that isn't already bookmarked", () => {
    expect(toggleBookmark([], "cosmos")).toEqual(["cosmos"]);
  });

  test("removes an id that's already bookmarked", () => {
    expect(toggleBookmark(["cosmos", "simr"], "cosmos")).toEqual(["simr"]);
  });

  test("leaves other ids untouched when adding", () => {
    expect(toggleBookmark(["simr"], "cosmos")).toEqual(["simr", "cosmos"]);
  });
});
