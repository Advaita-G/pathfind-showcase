import { describe, expect, test } from "vitest";
import type { PathfindIdea } from "../data/pathfindIdeas";
import { parseIdeaProgress, toggleIdeaSaved, toggleIdeaStep } from "./ideaProgress";

const idea = {
  id: "idea-a",
  roadmap: ["One", "Two", "Three"],
} as PathfindIdea;

describe("idea progress persistence", () => {
  test("returns empty state for missing or malformed data", () => {
    expect(parseIdeaProgress(null, [idea]).ideas).toEqual({});
    expect(parseIdeaProgress("bad-json", [idea]).ideas).toEqual({});
  });

  test("drops unknown ideas and invalid roadmap indexes", () => {
    const state = parseIdeaProgress(JSON.stringify({
      version: 1,
      ideas: {
        "idea-a": { saved: true, savedAt: 12, completedSteps: [2, 2, -1, 6, "1"] },
        missing: { saved: true, savedAt: 10, completedSteps: [0] },
      },
    }), [idea]);

    expect(state.ideas).toEqual({
      "idea-a": { saved: true, savedAt: 12, completedSteps: [2] },
    });
  });

  test("saving and unsaving preserves existing progress", () => {
    let state = toggleIdeaStep(parseIdeaProgress(null, [idea]), idea.id, 1, 100);
    state = toggleIdeaSaved(state, idea.id, 200);

    expect(state.ideas[idea.id]).toEqual({
      saved: false,
      savedAt: 100,
      completedSteps: [1],
    });

    state = toggleIdeaSaved(state, idea.id, 300);
    expect(state.ideas[idea.id]?.completedSteps).toEqual([1]);
    expect(state.ideas[idea.id]?.savedAt).toBe(100);
  });

  test("checking progress automatically saves an idea", () => {
    const state = toggleIdeaStep(parseIdeaProgress(null, [idea]), idea.id, 0, 100);
    expect(state.ideas[idea.id]).toEqual({ saved: true, savedAt: 100, completedSteps: [0] });
  });

  test("steps toggle independently and remain sorted", () => {
    let state = parseIdeaProgress(null, [idea]);
    state = toggleIdeaStep(state, idea.id, 2, 100);
    state = toggleIdeaStep(state, idea.id, 0, 100);
    expect(state.ideas[idea.id]?.completedSteps).toEqual([0, 2]);

    state = toggleIdeaStep(state, idea.id, 2, 100);
    expect(state.ideas[idea.id]?.completedSteps).toEqual([0]);
  });
});
