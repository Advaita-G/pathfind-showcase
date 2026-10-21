import { describe, expect, test } from "vitest";
import { mergeBookmarks } from "./useBookmarks";

describe("mergeBookmarks", () => {
  test("keeps local bookmarks that don't exist on the server yet", () => {
    const { merged, missingLocalIds } = mergeBookmarks(["cosmos"], ["simr"]);
    expect(merged).toEqual(["cosmos", "simr"]);
    expect(missingLocalIds).toEqual(["simr"]);
  });

  test("does not duplicate ids present in both sources", () => {
    const { merged, missingLocalIds } = mergeBookmarks(["cosmos"], ["cosmos"]);
    expect(merged).toEqual(["cosmos"]);
    expect(missingLocalIds).toEqual([]);
  });

  test("handles an empty local list", () => {
    const { merged, missingLocalIds } = mergeBookmarks(["cosmos"], []);
    expect(merged).toEqual(["cosmos"]);
    expect(missingLocalIds).toEqual([]);
  });

  test("handles an empty server list", () => {
    const { merged, missingLocalIds } = mergeBookmarks([], ["cosmos", "simr"]);
    expect(merged).toEqual(["cosmos", "simr"]);
    expect(missingLocalIds).toEqual(["cosmos", "simr"]);
  });

  test("drops malformed or unknown opportunity ids from both sources", () => {
    const { merged, missingLocalIds } = mergeBookmarks(
      ["cosmos", "not-a-real-opportunity"],
      ["simr", "not-a-real-opportunity", 12 as unknown as string],
    );
    expect(merged).toEqual(["cosmos", "simr"]);
    expect(missingLocalIds).toEqual(["simr"]);
  });
});
