import { describe, expect, it } from "vitest";
import type { Opportunity } from "../data/types";
import type { PathfindIdea } from "../data/pathfindIdeas";
import { computeNextMoves, type NextMoveInput } from "./nextMoves";
import { getOpportunityStatus } from "./opportunityStatus";
import type { OpportunityPlan } from "./planner/types";

const today = new Date(2026, 9, 14);
const base: Opportunity = {
  id: "x", title: "X Program", org: "Org", type: "Program", interests: ["cs"], minGrade: 10, maxGrade: 12,
  description: "d", link: "https://example.org", free: true, location: "Remote",
  deadline: "2026-12-15", deadlineConfirmed: true, lastChecked: "2026-10-10", verified: true,
};
const profile = { colleges: [], interests: ["cs"], goals: ["cs-career"], skills: [], causes: [], timeCommitment: null };
const idea = { id: "idea", title: "Small project", roadmap: ["Pick a problem", "Build a prototype", "Share it"] } as PathfindIdea;
const plan = (id: string): OpportunityPlan => ({
  opportunityId: id, status: "planning", notes: "", updatedAt: today.toISOString(),
  steps: [
    { id: "first", title: "Read the official page", kind: "suggested", done: false },
    { id: "second", title: "Check the requirements", kind: "suggested", done: false },
  ],
});
const input = (patch: Partial<NextMoveInput> = {}): NextMoveInput => ({
  today, profile, grade: 10, opportunities: [], bookmarks: [], plans: {}, ideas: [],
  ideaProgress: { version: 1, ideas: {} }, ...patch,
});

describe("next moves", () => {
  it("gives a new student build-path and only open, eligible discovery with confirmed future deadlines", () => {
    const opportunities: Opportunity[] = [
      { ...base, id: "later", deadline: "2026-11-01", minGrade: 10 },
      { ...base, id: "earlier", deadline: "2026-10-20", maxGrade: 10 },
      { ...base, id: "extra", deadline: "2026-12-01" },
      { ...base, id: "too-young", minGrade: 11, deadline: "2026-10-15" },
      { ...base, id: "too-old", maxGrade: 9, deadline: "2026-10-15" },
      { ...base, id: "upcoming", applicationOpenDate: "2026-10-16", deadline: "2026-10-17" },
      { ...base, id: "expired", deadline: "2026-10-13" },
      { ...base, id: "today", deadline: "2026-10-14" },
      { ...base, id: "estimated", deadlineConfirmed: false, deadline: "2026-10-15" },
      { ...base, id: "rolling", deadline: undefined },
      { ...base, id: "unknown", deadline: undefined, recurring: true },
      { ...base, id: "inactive", inactive: true, deadline: "2026-10-15" },
    ];
    const moves = computeNextMoves(input({ opportunities, profile: { ...profile, interests: [], goals: [] } }));
    expect(moves).toHaveLength(3);
    expect(moves.map((m) => m.id)).toEqual(["discover:earlier", "discover:later", "build-path"]);
    for (const move of moves.filter((m) => m.kind === "discover")) {
      const o = opportunities.find((o) => move.id === `discover:${o.id}`)!;
      expect(getOpportunityStatus(o, today)).toBe("OPEN");
      expect(o.minGrade <= 10 && o.maxGrade >= 10).toBe(true);
      expect(o.deadlineConfirmed).toBe(true);
      expect(o.deadline! > "2026-10-14").toBe(true);
    }
  });

  it("ranks an open plan step ahead of discovery for a returning student", () => {
    const moves = computeNextMoves(input({
      opportunities: [base, { ...base, id: "fresh", deadline: "2026-10-15" }], plans: { x: plan("x") },
    }));
    expect(moves.map((m) => m.kind)).toEqual(["plan-step", "discover"]);
    expect(moves[0].complete).toEqual({ type: "plan-step", opportunityId: "x", stepId: "first" });
  });

  it("ranks a plan closing in three days ahead of a saved idea step", () => {
    const moves = computeNextMoves(input({
      opportunities: [{ ...base, deadline: "2026-10-17" }], plans: { x: plan("x") }, ideas: [idea],
      ideaProgress: { version: 1, ideas: { idea: { saved: true, savedAt: 1, completedSteps: [] } } },
    }));
    expect(moves.map((m) => m.kind)).toEqual(["plan-step", "idea-step"]);
    expect(moves[0].badge).toBe("Closes in 3 days");
  });

  it("produces no move for expired saved opportunities or plans", () => {
    const expired = { ...base, deadline: "2026-10-13" };
    expect(getOpportunityStatus(expired, today)).toBe("DEADLINE_PASSED");
    expect(computeNextMoves(input({
      opportunities: [expired, { ...expired, id: "saved" }], bookmarks: ["x", "saved"], plans: { x: plan("x") },
    }))).toEqual([]);
  });

  it.each(["saved", "planned"])("labels an estimated %s deadline honestly without a closes badge", (mode) => {
    const moves = computeNextMoves(input({
      opportunities: [{ ...base, deadline: "2026-10-17", deadlineConfirmed: false }], bookmarks: ["x"],
      plans: mode === "planned" ? { x: plan("x") } : {},
    }));
    expect(moves).toHaveLength(1);
    expect(moves[0].kind).toBe(mode === "planned" ? "plan-step" : "start-plan");
    expect(moves[0].badge).toBeUndefined();
    expect(moves[0].why).toMatch(/estimat/i);
  });

  it.each([undefined, false, true])("keeps undated saves at low priority (recurring: %s)", (recurring) => {
    const moves = computeNextMoves(input({
      opportunities: [base, { ...base, id: "undated", deadline: undefined, recurring }], bookmarks: ["undated", "x"],
    }));
    expect(moves.map((m) => m.id)).toEqual(["start:x", "start:undated"]);
    expect(moves[1].kind).toBe("start-plan");
    expect(moves[1].score).toBeGreaterThan(moves[0].score);
    expect(moves[1].badge).toBeUndefined();
  });

  it("skips done and dropped plans and inactive opportunities in every source", () => {
    const opportunities = ["done", "dropped", "planned", "saved", "fresh"].map((id) => ({
      ...base, id, inactive: !["done", "dropped"].includes(id),
    }));
    expect(computeNextMoves(input({
      opportunities, bookmarks: ["done", "dropped", "planned", "saved"],
      plans: {
        done: { ...plan("done"), status: "done" },
        dropped: { ...plan("dropped"), status: "dropped" },
        planned: plan("planned"),
      },
    }))).toEqual([]);
  });

  it("selects the next unfinished roadmap index and skips complete or unsaved ideas", () => {
    const moves = computeNextMoves(input({
      ideas: [idea, { ...idea, id: "complete" }, { ...idea, id: "unsaved" }],
      ideaProgress: { version: 1, ideas: {
        idea: { saved: true, savedAt: 1, completedSteps: [0, 2] },
        complete: { saved: true, savedAt: 1, completedSteps: [0, 1, 2] },
        unsaved: { saved: false, savedAt: 1, completedSteps: [0] },
      } },
    }));
    expect(moves).toHaveLength(1);
    expect(moves[0].title).toBe(idea.roadmap[1]);
    expect(moves[0].complete).toEqual({ type: "idea-step", ideaId: "idea", stepIndex: 1 });
  });

  it("surfaces the next plan step after the current step is marked done in the input", () => {
    const current = plan("x");
    const before = computeNextMoves(input({ opportunities: [base], plans: { x: current } }));
    expect(before[0].complete).toEqual({ type: "plan-step", opportunityId: "x", stepId: "first" });
    const updated = { ...current, steps: current.steps.map((s) => s.id === "first" ? { ...s, done: true } : s) };
    const after = computeNextMoves(input({ opportunities: [base], plans: { x: updated } }));
    expect(after[0].title).toBe("Check the requirements");
    expect(after[0].complete).toEqual({ type: "plan-step", opportunityId: "x", stepId: "second" });
    expect(after.some((m) => m.id === before[0].id)).toBe(false);
  });

  it("surfaces the next idea step after completion and skips it once fully complete", () => {
    const withProgress = (completedSteps: number[]) => input({
      ideas: [idea], ideaProgress: { version: 1, ideas: { idea: { saved: true, savedAt: 1, completedSteps } } },
    });
    expect(computeNextMoves(withProgress([0]))[0].complete).toEqual({ type: "idea-step", ideaId: "idea", stepIndex: 1 });
    expect(computeNextMoves(withProgress([0]))[0].badge).toBe("1/3 done");
    expect(computeNextMoves(withProgress([0, 1]))[0].complete).toEqual({ type: "idea-step", ideaId: "idea", stepIndex: 2 });
    expect(computeNextMoves(withProgress([0, 1]))[0].badge).toBe("2/3 done");
    expect(computeNextMoves(withProgress([0, 1, 2]))).toEqual([]);
  });

  it("ranks an in-progress saved idea ahead of a brand-new saved idea", () => {
    const secondIdea = { id: "idea-2", title: "Started project", roadmap: ["Step A", "Step B", "Step C"] } as PathfindIdea;
    const moves = computeNextMoves(input({
      ideas: [idea, secondIdea],
      ideaProgress: {
        version: 1,
        ideas: {
          idea: { saved: true, savedAt: 1, completedSteps: [] },
          "idea-2": { saved: true, savedAt: 2, completedSteps: [0] },
        },
      },
    }));
    expect(moves.map((m) => m.id)).toEqual(["idea:idea-2:1", "idea:idea:0"]);
    expect(moves[0].badge).toBe("1/3 done");
  });

  it.each([0, 1, 2, 3, 4, 6])("caps moves at three with %s existing actions and discovery fillers", (count) => {
    const opportunities = Array.from({ length: count + 4 }, (_, i) => ({ ...base, id: `o${i}` }));
    const moves = computeNextMoves(input({
      profile: { ...profile, interests: [], goals: [] }, opportunities,
      bookmarks: opportunities.slice(0, count).map((o) => o.id),
      plans: count ? { o0: plan("o0") } : {},
      ideas: [idea], ideaProgress: { version: 1, ideas: { idea: { saved: true, savedAt: 1, completedSteps: [] } } },
    }));
    expect(moves).toHaveLength(3);
    expect(new Set(moves.map((m) => m.id)).size).toBe(3);
  });
});
