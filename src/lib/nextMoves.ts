import type { Opportunity } from "../data/types";
import type { PathfindIdea } from "../data/pathfindIdeas";
import { daysUntil, formatDeadline } from "./formatDeadline";
import type { IdeaProgressState } from "./ideaProgress";
import { getOpportunityStatus, isRecommendable } from "./opportunityStatus";
import { assessTiming, canBackPlan, nextStep } from "./planner/buildPlan";
import type { OpportunityPlan } from "./planner/types";
import type { PathProfile } from "./usePathProfile";

export type MoveKind = "plan-step" | "start-plan" | "idea-step" | "build-path" | "discover";

export type MoveComplete =
  | { type: "plan-step"; opportunityId: string; stepId: string }
  | { type: "idea-step"; ideaId: string; stepIndex: number };

export interface NextMove {
  id: string;
  kind: MoveKind;
  title: string;
  /** Why it matters now. Built only from stored facts; never invents urgency. */
  why: string;
  /** Short label such as "Closes in 5 days"; absent when nothing is known. */
  badge?: string;
  /** Lower comes first. */
  score: number;
  cta: string;
  href?: string;
  /** Marks the move done in place. Absent for moves that only lead somewhere. */
  complete?: MoveComplete;
}

export interface NextMoveInput {
  today: Date;
  profile: PathProfile;
  grade: number | null;
  opportunities: Opportunity[];
  bookmarks: string[];
  plans: Record<string, OpportunityPlan>;
  ideas: PathfindIdea[];
  ideaProgress: IdeaProgressState;
}

const MAX_MOVES = 3;
/** Within this many days a confirmed deadline outranks everything that has no date. */
const SOON = 21;

function deadlineFacts(o: Opportunity, today: Date) {
  const status = getOpportunityStatus(o, today);
  const confirmedDays = canBackPlan(o, today) ? daysUntil(o.deadline as string, today) : null;
  const estimated = Boolean(o.deadline) && o.deadlineConfirmed === false && daysUntil(o.deadline as string, today) >= 0;
  return { status, confirmedDays, estimated };
}

function badgeFor(days: number | null): string | undefined {
  if (days === null) return undefined;
  return days <= 1 ? (days === 0 ? "Closes today" : "Closes tomorrow") : `Closes in ${days} days`;
}

export function computeNextMoves(input: NextMoveInput): NextMove[] {
  const { today, profile, grade, opportunities, bookmarks, plans, ideas, ideaProgress } = input;
  const byId = new Map(opportunities.map((o) => [o.id, o]));
  const moves: NextMove[] = [];

  // 1. Continue plans already started.
  for (const plan of Object.values(plans)) {
    const o = byId.get(plan.opportunityId);
    if (!o || plan.status === "done" || plan.status === "dropped" || !isRecommendable(o)) continue;
    const { status, confirmedDays, estimated } = deadlineFacts(o, today);
    if (status === "DEADLINE_PASSED") continue;
    const step = nextStep(plan, assessTiming(plan, o, profile, today).infeasible);
    if (!step) continue;
    const stepDays = step.due ? daysUntil(step.due, today) : null;
    const urgent = [confirmedDays, stepDays].filter((n): n is number => n !== null);
    const soonest = urgent.length ? Math.min(...urgent) : null;
    const why = [
      confirmedDays !== null
        ? `${o.title} closes ${formatDeadline(o.deadline as string)}.`
        : estimated
          ? `${o.title} has an estimated deadline of ${formatDeadline(o.deadline as string)}. Confirm it on the official page.`
          : `Next step in your ${o.title} plan.`,
      stepDays !== null && stepDays < 0 ? `This step was due ${formatDeadline(step.due as string)}.` : "",
    ].filter(Boolean).join(" ");
    moves.push({
      id: `plan:${o.id}:${step.id}`,
      kind: "plan-step",
      title: step.title,
      why,
      badge: badgeFor(confirmedDays),
      score: (soonest !== null ? soonest : 120) - 0.5,
      cta: "Mark done",
      href: `/plans?o=${encodeURIComponent(o.id)}`,
      complete: { type: "plan-step", opportunityId: o.id, stepId: step.id },
    });
  }

  // 2. Saved project ideas with an unfinished roadmap.
  for (const idea of ideas) {
    const record = ideaProgress.ideas[idea.id];
    if (!record?.saved) continue;
    const stepIndex = idea.roadmap.findIndex((_, i) => !record.completedSteps.includes(i));
    if (stepIndex === -1) continue;
    const inProgress = record.completedSteps.length > 0;
    moves.push({
      id: `idea:${idea.id}:${stepIndex}`,
      kind: "idea-step",
      title: idea.roadmap[stepIndex],
      why: `Step ${stepIndex + 1} of ${idea.roadmap.length} in your saved idea "${idea.title}". ${record.completedSteps.length} done so far.`,
      badge: inProgress ? `${record.completedSteps.length}/${idea.roadmap.length} done` : undefined,
      score: (inProgress ? 130 : 150) + stepIndex,
      cta: "Mark done",
      href: `/ideas/${idea.id}`,
      complete: { type: "idea-step", ideaId: idea.id, stepIndex },
    });
  }

  // 3. Saved opportunities with no plan yet.
  for (const id of bookmarks) {
    const o = byId.get(id);
    if (!o || plans[id] || !isRecommendable(o)) continue;
    const { status, confirmedDays, estimated } = deadlineFacts(o, today);
    if (status === "DEADLINE_PASSED") continue;
    let score = 180;
    let why = `You saved ${o.title}. A plan turns it into steps you can finish.`;
    if (confirmedDays !== null) {
      score = confirmedDays + 1;
      why = `You saved ${o.title}. It closes ${formatDeadline(o.deadline as string)}. Make a plan before then.`;
    } else if (estimated) {
      score = 60 + daysUntil(o.deadline as string, today);
      why = `You saved ${o.title}. Its deadline is only an estimate (${formatDeadline(o.deadline as string)}). Check the official page, then plan.`;
    } else if (status === "UPCOMING" && o.applicationOpenDate) {
      score = 90;
      why = `You saved ${o.title}. Applications open ${formatDeadline(o.applicationOpenDate)}. Get ready now.`;
    }
    moves.push({
      id: `start:${o.id}`,
      kind: "start-plan",
      title: `Plan ${o.title}`,
      why,
      badge: badgeFor(confirmedDays),
      score,
      cta: "Start plan",
      href: `/plans?o=${encodeURIComponent(o.id)}`,
    });
  }

  moves.sort((a, b) => a.score - b.score);
  const picked = moves.slice(0, MAX_MOVES);

  // 4. Discovery fills any empty slots, so a new student still has somewhere to start.
  if (picked.length < MAX_MOVES) {
    if (profile.interests.length === 0 || profile.goals.length === 0) {
      picked.push({
        id: "build-path",
        kind: "build-path",
        title: "Build your path",
        why: "Tell Pathfind your interests and goals. It matches verified opportunities to you.",
        score: 1000,
        cta: "Build My Path",
      });
    }
    const known = new Set([...bookmarks, ...Object.keys(plans)]);
    const fresh = opportunities
      .filter((o) => !known.has(o.id) && isRecommendable(o) && getOpportunityStatus(o, today) === "OPEN")
      .filter((o) => grade === null || (o.minGrade <= grade && grade <= o.maxGrade))
      .filter((o) => profile.interests.length === 0 || o.interests.some((i) => profile.interests.includes(i)))
      .filter((o) => canBackPlan(o, today))
      .sort((a, b) => daysUntil(a.deadline as string, today) - daysUntil(b.deadline as string, today));
    for (const o of fresh) {
      if (picked.length >= MAX_MOVES) break;
      const days = daysUntil(o.deadline as string, today);
      picked.push({
        id: `discover:${o.id}`,
        kind: "discover",
        title: o.title,
        why: days <= SOON
          ? `Open now and closes ${formatDeadline(o.deadline as string)}. Check if it fits you.`
          : `Open now. Deadline ${formatDeadline(o.deadline as string)}. Check if it fits you.`,
        badge: badgeFor(days),
        score: 500 + days,
        cta: "View details",
        href: `/opportunities/${o.id}`,
      });
    }
  }

  return picked.sort((a, b) => a.score - b.score).slice(0, MAX_MOVES);
}
