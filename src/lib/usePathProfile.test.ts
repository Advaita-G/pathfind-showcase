import { describe, expect, test } from "vitest";
import {
  getFirstIncompletePathStep,
  hasSavedPath,
  mergePathProfiles,
  parseStoredPathProfile,
  type PathProfile,
} from "./usePathProfile";

const completeProfile: PathProfile = {
  colleges: [],
  interests: ["cs"],
  goals: ["research", "build"],
  skills: [],
  causes: [],
  timeCommitment: "2-5 hrs/week",
};

describe("stored path profile", () => {
  test("returns an empty profile for missing or invalid JSON", () => {
    expect(parseStoredPathProfile(null).goals).toEqual([]);
    expect(parseStoredPathProfile("not-json").interests).toEqual([]);
  });

  test("preserves multiple valid goals and removes duplicates", () => {
    const profile = parseStoredPathProfile(JSON.stringify({
      ...completeProfile,
      goals: ["research", "build", "research"],
    }));

    expect(profile.goals).toEqual(["research", "build"]);
  });

  test("migrates the legacy singular goal", () => {
    const profile = parseStoredPathProfile(JSON.stringify({
      interests: ["cs"],
      goal: "research",
    }));

    expect(profile.goals).toEqual(["research"]);
  });

  test("drops non-string stored goals but keeps unknown strings as custom goals", () => {
    const profile = parseStoredPathProfile(JSON.stringify({
      goals: ["research", "invented", 12, null],
    }));

    expect(profile.goals).toEqual(["research", "invented"]);
  });

  test("sanitizes malformed stored arrays and rejects invalid time values", () => {
    const profile = parseStoredPathProfile(JSON.stringify({
      interests: [" cs ", 12, null, ""],
      skills: "python",
      causes: ["health", { value: "climate" }],
      timeCommitment: "unlimited",
    }));

    expect(profile.interests).toEqual(["cs"]);
    expect(profile.skills).toEqual([]);
    expect(profile.causes).toEqual(["health"]);
    expect(profile.timeCommitment).toBeNull();
  });

  test("keeps custom (non-catalog) goals entered via Other…", () => {
    const profile = parseStoredPathProfile(JSON.stringify({
      goals: ["research", "Ship a community app"],
    }));

    expect(profile.goals).toEqual(["research", "Ship a community app"]);
  });
});

describe("path completeness", () => {
  test("routes incomplete profiles to the first required step", () => {
    expect(getFirstIncompletePathStep({ ...completeProfile, interests: [] })).toBe(0);
    expect(getFirstIncompletePathStep({ ...completeProfile, goals: [] })).toBe(1);
    expect(getFirstIncompletePathStep({ ...completeProfile, timeCommitment: null })).toBe(4);
  });

  test("recognizes complete and saved profiles", () => {
    expect(getFirstIncompletePathStep(completeProfile)).toBeNull();
    expect(hasSavedPath(completeProfile)).toBe(true);
    expect(hasSavedPath(parseStoredPathProfile(null))).toBe(false);
  });
});

describe("mergePathProfiles", () => {
  const empty = parseStoredPathProfile(null);

  test("preserves local selections the server doesn't have yet", () => {
    const local: PathProfile = { ...empty, interests: ["cs"], goals: ["research"] };
    const merged = mergePathProfiles(empty, local);
    expect(merged.interests).toEqual(["cs"]);
    expect(merged.goals).toEqual(["research"]);
  });

  test("unions array fields without duplicates", () => {
    const server: PathProfile = { ...empty, interests: ["cs"], skills: ["python"] };
    const local: PathProfile = { ...empty, interests: ["cs", "biology"], causes: ["climate"] };
    const merged = mergePathProfiles(server, local);
    expect(merged.interests).toEqual(["cs", "biology"]);
    expect(merged.skills).toEqual(["python"]);
    expect(merged.causes).toEqual(["climate"]);
  });

  test("prefers the server's time commitment when both are set", () => {
    const server: PathProfile = { ...empty, timeCommitment: "5-10 hrs/week" };
    const local: PathProfile = { ...empty, timeCommitment: "2-5 hrs/week" };
    expect(mergePathProfiles(server, local).timeCommitment).toBe("5-10 hrs/week");
  });

  test("falls back to the local time commitment when the server has none", () => {
    const local: PathProfile = { ...empty, timeCommitment: "2-5 hrs/week" };
    expect(mergePathProfiles(empty, local).timeCommitment).toBe("2-5 hrs/week");
  });
});
