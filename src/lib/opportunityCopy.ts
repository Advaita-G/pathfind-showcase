import { INTERESTS, type Opportunity } from "../data/types";

/**
 * Fallback copy for the opportunity drawer when no hand-written explainer exists yet.
 *
 * Everything here is assembled from the record's own verified fields — type, organizer,
 * grade range, cost flag, format/location and subject categories. It deliberately makes
 * no claim about personality, difficulty, prestige or outcomes, because the dataset does
 * not verify any of those.
 */

const INTEREST_LABELS = Object.fromEntries(INTERESTS.map((i) => [i.id, i.label])) as Record<
  Opportunity["interests"][number],
  string
>;

const TYPE_NOUN: Record<Opportunity["type"], string> = {
  Program: "program",
  Internship: "internship",
  Research: "research opportunity",
  Competition: "competition",
};

const LOCATION_PHRASE: Record<Opportunity["location"], string> = {
  Remote: "online",
  "Bay Area": "Bay Area",
  "In-Person": "in-person",
};

/** "Math", "Math and Computer Science", "Math, Computer Science and Physics". */
function joinLabels(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

/** Grade range as it appears in the drawer: "Grade 11" or "Grades 10–12". */
export function formatGradeRange(opportunity: Opportunity): string {
  return opportunity.minGrade === opportunity.maxGrade
    ? `Grade ${opportunity.minGrade}`
    : `Grades ${opportunity.minGrade}–${opportunity.maxGrade}`;
}

/**
 * Cost wording for the facts list. `free` means "no cost to participate" (optional
 * housing/travel can still apply), so competitions get entry-fee wording instead of
 * tuition wording.
 */
export function costLabel(opportunity: Opportunity): string {
  if (opportunity.type === "Competition") return opportunity.free ? "No entry fee" : "Entry fee";
  return opportunity.free ? "Tuition-free" : "Tuition-based";
}

/**
 * One sentence on who the opportunity is listed for, built only from verified fields.
 * Used until a hand-written explainer covers the opportunity.
 */
export function buildFitSentence(opportunity: Opportunity): string {
  const labels = opportunity.interests.map((interest) => INTEREST_LABELS[interest] ?? interest);
  // Keep the line short: three subjects is plenty before it stops reading naturally.
  const subjects = labels.length > 3 ? [...labels.slice(0, 3), "related fields"] : labels;

  const cost = opportunity.free
    ? opportunity.type === "Competition"
      ? "free-to-enter"
      : "free"
    : opportunity.type === "Competition"
      ? "fee-based"
      : "tuition-based";

  const subject =
    subjects.length === 0
      ? ""
      : labels.length > 3 && subjects[subjects.length - 1] === "related fields"
        ? ` in ${subjects.slice(0, -1).join(", ")}, and related fields`
        : ` in ${joinLabels(subjects)}`;

  return `A ${cost}, ${LOCATION_PHRASE[opportunity.location]} ${
    TYPE_NOUN[opportunity.type]
  }${subject} run by ${opportunity.org}. Pathfind lists it for ${formatGradeRange(
    opportunity,
  ).toLowerCase()}.`;
}
