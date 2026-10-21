import { describe, expect, it } from "vitest";
import type { Opportunity } from "../../data/types";
import { assessTiming, buildPlan, canBackPlan, infeasibleSteps, nextStep, refreshPlanDates } from "./buildPlan";
import { getTrust } from "./trust";
import { explainFit } from "./whyItFits";
import { mergePlans, parsePlans } from "./plansStore";

const today = new Date(2026, 9, 14);
const base: Opportunity = {
  id: "x", title: "X Program", org: "Org", type: "Program", interests: ["cs"], minGrade: 10, maxGrade: 12,
  description: "d", link: "https://example.org", free: true, location: "Remote",
  deadline: "2026-12-15", deadlineConfirmed: true, lastChecked: "2026-10-10", verified: true,
};
const profile = { colleges: [], interests: ["cs"], goals: [], skills: [], causes: [], timeCommitment: null };

describe("back-planning", () => {
  it("dates steps in order, never in the past, never after the deadline", () => {
    const plan = buildPlan(base, profile, today);
    const dues = plan.steps.map((s) => s.due as string);
    expect(dues.every(Boolean)).toBe(true);
    expect([...dues].sort()).toEqual(dues);
    expect(dues[0] >= "2026-10-14").toBe(true);
    expect(dues[dues.length - 1]).toBe("2026-12-14");
  });
  it("compresses when the deadline is close", () => {
    const plan = buildPlan({ ...base, deadline: "2026-10-20" }, profile, today);
    expect(plan.steps.filter((s) => s.due).every((s) => (s.due as string) >= "2026-10-14" && (s.due as string) < "2026-10-20")).toBe(true);
  });
  it.each([
    ["estimated", { deadlineConfirmed: false }],
    ["passed", { deadline: "2026-09-01" }],
    ["none", { deadline: undefined }],
  ])("invents no dates for %s deadlines", (_n, patch) => {
    const o = { ...base, ...patch } as Opportunity;
    expect(canBackPlan(o, today)).toBe(false);
    expect(buildPlan(o, profile, today).steps.some((s) => s.due)).toBe(false);
  });
  it("follows a moved deadline but keeps student-edited dates", () => {
    const plan = buildPlan(base, profile, today);
    plan.steps[1] = { ...plan.steps[1], due: "2026-11-01", dueEdited: true };
    const moved = refreshPlanDates(plan, { ...base, deadline: "2026-12-30" }, today);
    expect(moved.steps[1].due).toBe("2026-11-01");
    expect(moved.steps[moved.steps.length - 1].due).toBe("2026-12-29");
    expect(refreshPlanDates(plan, base, today)).toBe(plan);
  });
  it("marks only record facts as official", () => {
    const ids = buildPlan(base, profile, today).steps.filter((s) => s.kind === "official").map((s) => s.id);
    expect(ids).toEqual(["official-eligibility", "submit"]);
  });
});

describe("trust", () => {
  it("verified / outdated / unknown from real metadata", () => {
    expect(getTrust(base, today).level).toBe("verified");
    expect(getTrust({ ...base, lastChecked: "2026-06-01" }, today).level).toBe("outdated");
    expect(getTrust({ ...base, lastChecked: undefined }, today).level).toBe("unknown");
    expect(getTrust({ ...base, verified: false }, today).level).toBe("unknown");
  });
});

describe("why it fits", () => {
  it("flags mismatches and unknowns instead of guessing", () => {
    const pts = explainFit({ ...base, location: "In-Person", state: "CA", minAge: 16 }, profile, { grade: 9, state: "NY", today });
    const text = (t: string) => pts.filter((p) => p.tone === t).map((p) => p.text).join("|");
    expect(text("mismatch")).toMatch(/grade 9/);
    expect(text("mismatch")).toMatch(/outside your state/);
    expect(text("unknown")).toMatch(/age requirement/);
    expect(text("unknown")).toMatch(/time this needs is not published/);
    expect(pts[0].tone).toBe("mismatch");
  });
  it("reports unknown grade", () => {
    const pts = explainFit(base, null, { today });
    expect(pts.some((p) => p.tone === "unknown" && /Add your grade/.test(p.text))).toBe(true);
  });
});

describe("plans store", () => {
  it("drops junk and unknown opportunities", () => {
    const raw = JSON.stringify({ a: { opportunityId: "x", status: "bogus", steps: [{ id: "1", title: "t", done: true }, { nope: 1 }], notes: 5 }, b: { opportunityId: "zzz", steps: [] } });
    const out = parsePlans(raw, new Set(["x"]));
    expect(Object.keys(out)).toEqual(["x"]);
    expect(out.x.status).toBe("planning");
    expect(out.x.steps).toHaveLength(1);
  });
  it("newer side wins", () => {
    const p = (u: string) => ({ opportunityId: "x", status: "planning" as const, steps: [], notes: "", updatedAt: u });
    expect(mergePlans({ x: p("2026-01-02") }, { x: p("2026-01-01") }).upload).toHaveLength(0);
    expect(mergePlans({ x: p("2026-01-01") }, { x: p("2026-01-02") }).upload).toHaveLength(1);
  });
});

describe("runway and next action", () => {
  it("spreads steps over distinct days on a short runway", () => {
    const plan = buildPlan({ ...base, deadline: "2026-10-27" }, profile, today);
    expect(new Set(plan.steps.map((s) => s.due)).size).toBeGreaterThanOrEqual(6);
  });
  it("warns when the deadline is close and stays quiet when there is room", () => {
    const close = { ...base, deadline: "2026-10-18" };
    expect(assessTiming(buildPlan(close, profile, today), close, profile, today).level).toBe("critical");
    const mid = { ...base, deadline: "2026-10-27" };
    expect(assessTiming(buildPlan(mid, profile, today), mid, profile, today).message).toMatch(/no longer fit/);
    expect(assessTiming(buildPlan(base, profile, today), base, profile, today).level).toBe("ok");
  });
  it("warns when open hours exceed the student's weekly time, and invents nothing without a confirmed deadline", () => {
    const light = { ...profile, timeCommitment: "< 2 hrs/week" as const };
    const o = { ...base, deadline: "2026-11-20" };
    const t = assessTiming(buildPlan(o, light, today), o, light, today);
    expect(t.level).toBe("tight");
    expect(t.message).toMatch(/no longer fits/);
    const est = { ...base, deadlineConfirmed: false };
    expect(assessTiming(buildPlan(est, profile, today), est, profile, today).level).toBe("none");
  });
  it("picks the earliest open dated step", () => {
    const plan = buildPlan(base, profile, today);
    plan.steps[0] = { ...plan.steps[0], done: true };
    expect(nextStep(plan)?.id).toBe(plan.steps[1].id);
  });
});

describe("feasibility", () => {
  const ids = (o: Opportunity, p = profile) => [...infeasibleSteps(buildPlan(o, p, today), o, p, today).keys()];
  it("never schedules a recommendation request when the deadline is tomorrow", () => {
    const o = { ...base, deadline: "2026-10-15" };
    const plan = buildPlan(o, profile, today);
    expect(ids(o)).toEqual(expect.arrayContaining(["ask-recs", "draft-essay", "ask-feedback"]));
    expect(plan.steps.find((s) => s.id === "ask-recs")?.due).toBeUndefined();
    expect(plan.steps.find((s) => s.id === "submit")?.due).toBe("2026-10-14");
    expect(nextStep(plan, infeasibleSteps(plan, o, profile, today))?.id).toBe("official-eligibility");
  });
  it("keeps everything feasible with a normal runway and drops nothing", () => {
    expect(ids(base)).toEqual([]);
    expect(ids({ ...base, deadline: "2026-11-05" })).toEqual([]);
  });
  it("invents nothing and flags nothing without a confirmed deadline", () => {
    expect(ids({ ...base, deadlineConfirmed: false })).toEqual([]);
    expect(ids({ ...base, deadline: undefined } as Opportunity)).toEqual([]);
  });
  it("drops optional steps when weekly time is short, and honors a student-picked date", () => {
    const light = { ...profile, timeCommitment: "< 2 hrs/week" as const };
    const o = { ...base, deadline: "2026-11-05" };
    const plan = buildPlan(o, light, today);
    expect(infeasibleSteps(plan, o, light, today).has("prep-program")).toBe(true);
    plan.steps = plan.steps.map((s) => (s.id === "prep-program" ? { ...s, due: "2026-10-20", dueEdited: true } : s));
    expect(infeasibleSteps(plan, o, light, today).has("prep-program")).toBe(false);
  });
  it("keeps dates stable and progress intact when steps are completed", () => {
    const o = { ...base, deadline: "2026-10-27" };
    const plan = buildPlan(o, profile, today);
    const before = plan.steps.filter((s) => s.id !== "read-official").map((s) => s.due);
    plan.steps = plan.steps.map((s) => (s.id === "read-official" ? { ...s, done: true } : s));
    const after = refreshPlanDates(plan, o, today, profile);
    expect(after.steps.filter((s) => s.id !== "read-official").map((s) => s.due)).toEqual(before);
    expect(after.steps.find((s) => s.id === "read-official")?.done).toBe(true);
  });
  it("personalizes from the profile and only marks record facts as official", () => {
    const p = { ...profile, goals: ["cs-career"], colleges: ["MIT"], interests: ["cs"] };
    const o = { ...base, free: false, participation: { participationType: "team", canJoinIndividually: false, requiresTeam: true, requiresClubOrSchool: "unknown", } } as unknown as Opportunity;
    const plan = buildPlan(o, p, today);
    const byId = Object.fromEntries(plan.steps.map((s) => [s.id, s]));
    expect(byId["fit-colleges"].title).toMatch(/MIT/);
    expect(byId["fit-colleges"].kind).toBe("suggested");
    expect(byId["official-team"].kind).toBe("official");
    expect(byId["official-cost"].kind).toBe("official");
    expect(byId["official-school"]).toBeUndefined();
  });
});
