import { SKILLS, type Opportunity } from "../../data/types";
import { daysUntil, formatDeadline } from "../formatDeadline";
import { getOpportunityStatus } from "../opportunityStatus";
import { preferenceTags, sharedTags } from "../opportunityTags";
import type { PathProfile } from "../usePathProfile";

export type FitTone = "match" | "mismatch" | "unknown";
export interface FitPoint { tone: FitTone; text: string }

export interface FitContext {
  grade?: number | null;
  /** Two-letter state of the student, when known. */
  state?: string | null;
  today?: Date;
}

const SKILL_LABELS = new Map<string, string>(SKILLS.map((s) => [s.id, s.label]));

/**
 * Plain-language fit check built only from the record's verified fields and what the student has
 * told Pathfind. Anything the data does not say is reported as unknown, never guessed.
 */
export function explainFit(opportunity: Opportunity, profile: PathProfile | null, ctx: FitContext = {}): FitPoint[] {
  const today = ctx.today ?? new Date();
  const out: FitPoint[] = [];
  const grade = ctx.grade ?? null;

  if (grade === null) {
    out.push({ tone: "unknown", text: `Open to grades ${opportunity.minGrade}–${opportunity.maxGrade}. Add your grade to check.` });
  } else if (grade >= opportunity.minGrade && grade <= opportunity.maxGrade) {
    out.push({ tone: "match", text: `Grade ${grade} is within the listed range (${opportunity.minGrade}–${opportunity.maxGrade}).` });
  } else {
    out.push({ tone: "mismatch", text: `Listed for grades ${opportunity.minGrade}–${opportunity.maxGrade}; you are in grade ${grade}.` });
  }

  if (opportunity.minAge || opportunity.maxAge) {
    const range = opportunity.minAge && opportunity.maxAge ? `${opportunity.minAge}–${opportunity.maxAge}` : opportunity.minAge ? `${opportunity.minAge}+` : `up to ${opportunity.maxAge}`;
    out.push({ tone: "unknown", text: `The program states an age requirement (${range}). Pathfind does not know your age — check it.` });
  }

  const wanted = preferenceTags(profile?.interests ?? []);
  const shared = sharedTags(opportunity, wanted).slice(0, 3);
  if (wanted.length === 0) {
    out.push({ tone: "unknown", text: "Add interests in Build My Path to check topic fit." });
  } else if (shared.length > 0) {
    out.push({ tone: "match", text: `Covers ${shared.join(", ")}, which you picked.` });
  } else {
    out.push({ tone: "mismatch", text: "Does not clearly cover the interests you picked." });
  }

  const haveSkills = (profile?.skills ?? []).filter((s) => s !== "beginner");
  if (haveSkills.length > 0 && opportunity.type !== "Program") {
    const names = haveSkills.map((s) => SKILL_LABELS.get(s) ?? s);
    out.push({ tone: "unknown", text: `You listed ${names.slice(0, 3).join(", ")}. The program does not publish required skills, so check the official page.` });
  }

  if (opportunity.location === "Remote") {
    out.push({ tone: "match", text: "Fully remote, so no travel needed." });
  } else {
    const where = [opportunity.city, opportunity.state].filter(Boolean).join(", ") || opportunity.location;
    if (opportunity.state && ctx.state) {
      out.push(opportunity.state.toUpperCase() === ctx.state.toUpperCase()
        ? { tone: "match", text: `In person in ${where}, in your state.` }
        : { tone: "mismatch", text: `In person in ${where}, outside your state. Travel may be needed.` });
    } else {
      out.push({ tone: "unknown", text: `In person (${where}). Check that you can get there.` });
    }
  }

  const status = getOpportunityStatus(opportunity, today);
  if (status === "DEADLINE_PASSED") {
    out.push({ tone: "mismatch", text: "This cycle's deadline has passed. Check the official site for the next one." });
  } else if (opportunity.deadline && status !== "INACTIVE") {
    const days = daysUntil(opportunity.deadline, today);
    out.push(opportunity.deadlineConfirmed === false
      ? { tone: "unknown", text: `Estimated deadline ${formatDeadline(opportunity.deadline)} (not confirmed yet).` }
      : { tone: days < 14 ? "mismatch" : "match", text: `Deadline ${formatDeadline(opportunity.deadline)} — ${days} day${days === 1 ? "" : "s"} left.` });
  } else if (status === "INACTIVE") {
    out.push({ tone: "mismatch", text: "This program is no longer running." });
  } else {
    out.push({ tone: "unknown", text: "No deadline is published." });
  }

  if (opportunity.participation?.canJoinIndividually === false) {
    out.push({ tone: "mismatch", text: opportunity.participation.howToJoin ?? "You cannot join on your own — it runs through a team, club, or school." });
  }

  out.push({ tone: "unknown", text: profile?.timeCommitment
    ? `You have ${profile.timeCommitment}. The weekly time this needs is not published.`
    : "The weekly time this needs is not published." });

  out.push({ tone: opportunity.free ? "match" : "unknown", text: opportunity.free ? "No cost to take part (travel or housing may still apply)." : "This program has a cost. Check aid options on the official site." });

  const rank = { mismatch: 0, unknown: 1, match: 2 } as const;
  return out.sort((a, b) => rank[a.tone] - rank[b.tone]);
}
