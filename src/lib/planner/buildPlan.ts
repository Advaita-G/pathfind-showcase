import type { Opportunity } from "../../data/types";
import { daysUntil, formatDeadline } from "../formatDeadline";
import type { PathProfile } from "../usePathProfile";
import { costLabel, formatGradeRange } from "../opportunityCopy";
import type { OpportunityPlan, PlanStep } from "./types";

const DAY = 86_400_000;

function isoDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return isoDay(new Date(new Date(y, m - 1, d).getTime() + days * DAY));
}

/** Dates are only ever back-planned from a deadline that is confirmed and still ahead. */
export function canBackPlan(opportunity: Opportunity, today: Date = new Date()): boolean {
  return Boolean(opportunity.deadline) && opportunity.deadlineConfirmed !== false && daysUntil(opportunity.deadline as string, today) >= 1;
}

export type Tier = "must" | "recommended" | "optional";
interface Template { id: string; title: string; kind: PlanStep["kind"]; lead: number }

/** Pathfind's own priority per template step. Student-added steps count as recommended. */
const TIER: Record<string, Tier> = {
  "official-eligibility": "must", "official-team": "must", "official-school": "must", "official-cost": "must",
  "official-join": "must", "official-open": "must", "read-official": "must", submit: "must",
  "gather-docs": "recommended", "draft-essay": "recommended", "ask-recs": "recommended", "fit-colleges": "recommended", "fit-goal": "recommended",
  "prep-research": "optional", "prep-competition": "optional", "prep-internship": "optional", "prep-program": "optional", "ask-feedback": "optional",
};
export function tierOf(step: Pick<PlanStep, "id">): Tier {
  return TIER[step.id] ?? "recommended";
}

/** Least days a step realistically needs before the deadline. Fewer days and the step cannot be done properly. */
const MIN_DAYS: Record<string, number> = {
  "ask-recs": 14, "draft-essay": 3, "ask-feedback": 4, "gather-docs": 2,
  "prep-research": 5, "prep-competition": 5, "prep-internship": 3, "prep-program": 3,
};

const ALTERNATIVE: Record<string, string> = {
  "ask-recs": "Too late for the usual 2 weeks. If a recommendation is required, ask today and say the deadline plainly, or check the official page for the next cycle.",
  "draft-essay": "Write a short first draft in one sitting and keep it focused. Skip extra revisions.",
  "ask-feedback": "Skip outside review. Read your own draft aloud once instead.",
  "gather-docs": "Request transcripts or forms today. Many offices need a few days.",
};

function templates(opportunity: Opportunity, profile: PathProfile | null): Template[] {
  const out: Template[] = [];
  const beginner = profile?.skills.includes("beginner") ?? false;
  const light = profile?.timeCommitment === "< 2 hrs/week" || profile?.timeCommitment === "2-5 hrs/week";
  const p = opportunity.participation;

  out.push({ id: "official-eligibility", kind: "official", lead: 35, title: `Confirm you are eligible (${formatGradeRange(opportunity)}; ${costLabel(opportunity).toLowerCase()})` });
  if (opportunity.free === false) out.push({ id: "official-cost", kind: "official", lead: 35, title: "Check the cost and ask about financial aid" });
  if (p?.howToJoin) out.push({ id: "official-join", kind: "official", lead: 35, title: `How to join: ${p.howToJoin}` });
  if (p?.requiresTeam === true) out.push({ id: "official-team", kind: "official", lead: 30, title: "Find or form a team before you apply (the program requires one)" });
  if (p?.requiresClubOrSchool === true) out.push({ id: "official-school", kind: "official", lead: 30, title: "Ask your school or club about joining (the program requires it)" });
  if (opportunity.applicationOpenDate) out.push({ id: "official-open", kind: "official", lead: 30, title: `Applications open ${formatDeadline(opportunity.applicationOpenDate)}` });
  out.push({ id: "read-official", kind: "suggested", lead: 30, title: "Read the official page and list every required item" });

  const matched = profile ? opportunity.interests.find((i) => profile.interests.includes(i)) : undefined;
  const field = matched ? ` in ${matched}` : "";
  switch (opportunity.type) {
    case "Research":
      out.push({ id: "prep-research", kind: "suggested", lead: 24, title: beginner ? `Skim two beginner-level papers or overviews${field || " in this field"}` : `Write 3 sentences on the research question${field} that interests you` });
      break;
    case "Competition":
      out.push({ id: "prep-competition", kind: "suggested", lead: 24, title: beginner ? "Try one past problem or sample entry to learn the format" : "Look at past winners or problems and pick what to practice" });
      break;
    case "Internship":
      out.push({ id: "prep-internship", kind: "suggested", lead: 24, title: "Update your resume with your projects and activities" });
      break;
    default:
      out.push({ id: "prep-program", kind: "suggested", lead: 24, title: "Write down why this program fits your goals" });
  }
  if (profile?.goals.length) out.push({ id: "fit-goal", kind: "suggested", lead: 20, title: `Note how this supports your goal: ${profile.goals[0].replace(/[-_]/g, " ")}` });
  if (profile?.colleges.length) out.push({ id: "fit-colleges", kind: "suggested", lead: 20, title: `List what ${profile.colleges[0]} values that this program shows` });
  if (opportunity.type !== "Competition") out.push({ id: "draft-essay", kind: "suggested", lead: 14, title: "If the application asks for an essay or short answers, draft them" });
  if (!light) out.push({ id: "ask-feedback", kind: "suggested", lead: 8, title: "Ask a teacher, parent, or counselor to review your draft" });
  out.push({ id: "ask-recs", kind: "suggested", lead: 21, title: "If a recommendation is required, ask the person at least 2 to 3 weeks ahead" });
  out.push({ id: "gather-docs", kind: "suggested", lead: 7, title: "Gather transcripts, forms, or links the application requires" });
  out.push({ id: "submit", kind: "official", lead: 1, title: "Submit on the official site, then save the confirmation" });
  return out;
}

/**
 * Pathfind's rough effort guess per template step, in hours. These are estimates, never program facts.
 * Student-added steps are not counted.
 */
const STEP_HOURS: Record<string, number> = {
  "official-eligibility": 0.5, "official-join": 0.5, "official-cost": 0.5, "official-team": 2, "official-school": 0.5, "official-open": 0, "read-official": 1,
  "prep-research": 3, "prep-competition": 4, "prep-internship": 2, "prep-program": 1.5, "fit-goal": 0.5, "fit-colleges": 0.5,
  "draft-essay": 5, "ask-feedback": 1, "ask-recs": 0.5, "gather-docs": 1, submit: 1,
};

export function stepHours(step: Pick<PlanStep, "id">): number {
  return STEP_HOURS[step.id] ?? 0;
}

/** Steady weekly hours a student says they have; null when unknown. Uses the middle of each range. */
export function weeklyHours(profile: PathProfile | null): number | null {
  switch (profile?.timeCommitment) {
    case "< 2 hrs/week": return 1.5;
    case "2-5 hrs/week": return 3.5;
    case "5-10 hrs/week": return 7.5;
    case "10+ hrs/week": return 12;
    default: return null;
  }
}

export interface Infeasible { reason: string; alternative: string }

/**
 * Open template steps that cannot honestly fit before the confirmed deadline, or that the student's
 * weekly time cannot carry. A step the student dated themselves is never flagged: it is their call.
 */
export function infeasibleSteps(plan: Pick<OpportunityPlan, "steps">, opportunity: Opportunity, profile: PathProfile | null, today: Date = new Date()): Map<string, Infeasible> {
  const out = new Map<string, Infeasible>();
  if (!canBackPlan(opportunity, today)) return out;
  const room = daysUntil(opportunity.deadline as string, today);
  const open = plan.steps.filter((s) => !s.done && s.lead !== undefined && !s.dueEdited);
  for (const s of open) {
    const need = MIN_DAYS[s.id];
    if (need && room < need) {
      out.set(s.id, { reason: `Needs about ${need} days. Only ${room} left.`, alternative: ALTERNATIVE[s.id] ?? "Do a lighter version, or skip it." });
    }
  }
  const perWeek = weeklyHours(profile);
  if (perWeek !== null) {
    const available = (room / 7) * perWeek;
    const need = plan.steps.filter((s) => !s.done && !out.has(s.id)).reduce((n, s) => n + stepHours(s), 0);
    if (need > available) {
      for (const s of open) {
        if (tierOf(s) === "optional" && !out.has(s.id)) out.set(s.id, { reason: "Optional, and your weekly time is short for this deadline.", alternative: "Skip it, or set your own date if you have extra time." });
      }
    }
  }
  return out;
}

/** Distinct leads, earliest first. Used to space steps evenly when there is less time than the ideal lead. */
function leadSlots(leads: number[]): number[] {
  return [...new Set(leads)].sort((a, b) => b - a);
}

/**
 * Dates a step. With enough room the lead is used as is. With less room, steps are spread one slot
 * at a time from today to the day before the deadline, so a short runway never piles onto one day.
 */
function dateFor(deadline: string, lead: number, slots: number[], today: Date): string {
  const room = daysUntil(deadline, today);
  if (room >= slots[0]) return addDays(deadline, -lead);
  const k = Math.max(0, slots.indexOf(lead));
  const offset = slots.length <= 1 ? 0 : Math.round((k * (room - 1)) / (slots.length - 1));
  return addDays(deadline, -(room - offset));
}

function dueMap(steps: { id: string; lead?: number }[], skip: Map<string, Infeasible>, opportunity: Opportunity, today: Date): Map<string, string> {
  const out = new Map<string, string>();
  if (!canBackPlan(opportunity, today)) return out;
  const live = steps.filter((s) => s.lead !== undefined && !skip.has(s.id));
  const slots = leadSlots(live.map((s) => s.lead as number));
  if (slots.length === 0) slots.push(1);
  for (const s of live) out.set(s.id, dateFor(opportunity.deadline as string, s.lead as number, slots, today));
  return out;
}

export function buildPlan(opportunity: Opportunity, profile: PathProfile | null, today: Date = new Date()): OpportunityPlan {
  const list = templates(opportunity, profile).sort((a, b) => b.lead - a.lead);
  const base: PlanStep[] = list.map((t) => ({ id: t.id, title: t.title, kind: t.kind, done: false, ...(canBackPlan(opportunity, today) ? { lead: t.lead } : {}) }));
  const skip = infeasibleSteps({ steps: base }, opportunity, profile, today);
  const dues = dueMap(base, skip, opportunity, today);
  const steps = base.map((s) => (dues.has(s.id) ? { ...s, due: dues.get(s.id) } : s));
  return { opportunityId: opportunity.id, status: "planning", steps, notes: "", updatedAt: today.toISOString() };
}

/** Re-times template steps when the deadline moved, became estimated, or passed. Returns the same object when nothing changed. */
export function refreshPlanDates(plan: OpportunityPlan, opportunity: Opportunity, today: Date = new Date(), profile: PathProfile | null = null): OpportunityPlan {
  const skip = infeasibleSteps(plan, opportunity, profile, today);
  const dues = dueMap(plan.steps.filter((s) => !s.dueEdited), skip, opportunity, today);
  let changed = false;
  const steps = plan.steps.map((s) => {
    if (s.dueEdited || s.lead === undefined || s.done) return s;
    const due = dues.get(s.id);
    if (due === s.due) return s;
    changed = true;
    const { due: _old, ...rest } = s;
    return due ? { ...rest, due } : rest;
  });
  return changed ? { ...plan, steps } : plan;
}

export function planProgress(plan: Pick<OpportunityPlan, "steps">): { done: number; total: number; percent: number } {
  const total = plan.steps.length;
  const done = plan.steps.filter((s) => s.done).length;
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}

export type TimingLevel = "none" | "ok" | "tight" | "critical";
export interface Timing { level: TimingLevel; daysLeft: number | null; message: string; hoursLeft: number; hoursAvailable: number | null; infeasible: Map<string, Infeasible> }

/** Honest runway check from the confirmed deadline, the steps still open, and the student's weekly time. Never invents dates. */
export function assessTiming(plan: Pick<OpportunityPlan, "steps">, opportunity: Opportunity, profile: PathProfile | null, today: Date = new Date()): Timing {
  const infeasible = infeasibleSteps(plan, opportunity, profile, today);
  const hoursLeft = plan.steps.filter((s) => !s.done && !infeasible.has(s.id)).reduce((n, s) => n + stepHours(s), 0);
  if (!canBackPlan(opportunity, today)) return { level: "none", daysLeft: null, message: "", hoursLeft, hoursAvailable: null, infeasible };
  const daysLeft = daysUntil(opportunity.deadline as string, today);
  const perWeek = weeklyHours(profile);
  const hoursAvailable = perWeek === null ? null : Math.round(((daysLeft / 7) * perWeek) * 10) / 10;
  const shortOnTime = hoursAvailable !== null && hoursLeft > hoursAvailable;
  const need = `about ${Math.round(hoursLeft)} hours of work (rough Pathfind estimate)`;
  const cut = infeasible.size ? ` ${infeasible.size} step${infeasible.size === 1 ? "" : "s"} no longer fit${infeasible.size === 1 ? "s" : ""}. See "Won't fit" below for options.` : "";
  const base = { daysLeft, hoursLeft, hoursAvailable, infeasible };
  if (daysLeft <= 7) {
    return { ...base, level: "critical", message: `Only ${daysLeft} day${daysLeft === 1 ? "" : "s"} left. Focus on the must-do steps first. The rest is ${need}.${cut}` };
  }
  if (infeasible.size) {
    return { ...base, level: "tight", message: `${daysLeft} days left.${cut}` };
  }
  if (shortOnTime) {
    return { ...base, level: "tight", message: `${daysLeft} days left. This is ${need}, but at your pace you have about ${Math.round(hoursAvailable as number)} hours. Plan extra time or skip optional steps.` };
  }
  return { ...base, level: "ok", message: "" };
}

const TIER_RANK: Record<Tier, number> = { must: 0, recommended: 1, optional: 2 };

/** The one step to do next: earliest due date first, must-do before optional on the same day, then undated steps by priority. Steps that no longer fit are skipped. */
export function nextStep(plan: Pick<OpportunityPlan, "steps">, infeasible?: Map<string, Infeasible>): PlanStep | null {
  const open = plan.steps.filter((s) => !s.done && !infeasible?.has(s.id));
  const byTier = (a: PlanStep, b: PlanStep) => TIER_RANK[tierOf(a)] - TIER_RANK[tierOf(b)];
  const dated = open.filter((s) => s.due).sort((a, b) => (a.due as string).localeCompare(b.due as string) || byTier(a, b));
  return dated[0] ?? [...open].sort(byTier)[0] ?? null;
}

/** Things the program record does not state, so the student knows to check the official page. */
export function unknownFacts(opportunity: Opportunity): string[] {
  const out: string[] = [];
  if (!opportunity.participation) out.push("team or school requirements");
  if (!opportunity.applicationOpenDate) out.push("when applications open");
  out.push("whether essays or recommendations are required", "how many hours it takes");
  return out;
}
