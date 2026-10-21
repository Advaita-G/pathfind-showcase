import type { PathfindIdea } from "../data/pathfindIdeas";
import { preferenceTags } from "./opportunityTags";
import {
  CAUSES,
  GOALS,
  INTERESTS,
  SKILLS,
  type Cause,
  type Interest,
  type PathGoal,
  type Skill,
  type TimeCommitment,
} from "../data/types";

/** Where a goal id appears in stored/matched profiles; mirrors `PathGoal`. */
export type GoalId = `${PathGoal}`;

/** Each goal's category signal for Pathfind Idea matching (shared with the drawer). */
export const GOAL_CATEGORIES: Record<GoalId, PathfindIdea["category"][]> = {
  research: ["research"],
  internship: ["research", "build", "contribute"],
  competition: ["build", "create"],
  build: ["build", "create"],
  teach: ["teach"],
  volunteer: ["contribute", "teach"],
  academics: ["research", "build"],
  explore: ["research", "build", "create", "teach", "contribute"],
  decide: ["research", "build", "create", "teach", "contribute"],
};

const GOAL_ID_SET: ReadonlySet<string> = new Set(GOALS.map((goal) => goal.id));

/** Display label for any stored goal id; unknown ids fall back to the raw value. */
export function goalLabel(id: string): string {
  return GOALS.find((goal) => goal.id === id)?.label ?? id;
}

export function isKnownGoalId(id: string): boolean {
  return GOAL_ID_SET.has(id);
}

/** Below this many in-budget ideas, over-budget ideas are appended (flagged) rather than hidden. */
const MIN_IDEAS = 3;

const MAX_WEEKLY_HOURS: Record<TimeCommitment, number> = {
  "< 2 hrs/week": 2,
  "2-5 hrs/week": 5,
  "5-10 hrs/week": 10,
  "10+ hrs/week": Infinity,
};

const RELATED_INTERESTS: Partial<Record<Interest, Interest[]>> = {
  cs: ["ai", "engineering", "math"],
  ai: ["cs", "math", "engineering"],
  math: ["physics", "finance", "cs", "engineering"],
  physics: ["math", "engineering", "chemistry"],
  chemistry: ["biology", "environmental", "physics"],
  biology: ["chemistry", "psychology", "environmental"],
  environmental: ["biology", "chemistry", "engineering"],
  engineering: ["physics", "cs", "math", "ai"],
  finance: ["entrepreneurship", "math"],
  entrepreneurship: ["finance", "cs", "arts"],
  writing: ["debate", "law", "arts"],
  arts: ["writing", "entrepreneurship"],
  law: ["debate", "writing", "service"],
  psychology: ["biology", "writing", "service"],
  debate: ["law", "writing", "service"],
  service: ["law", "psychology", "writing"],
};

const SKILL_INTERESTS: Record<Skill, Interest[]> = {
  python: ["cs", "ai", "math", "engineering"],
  java: ["cs", "engineering"],
  javascript: ["cs", "arts", "entrepreneurship"],
  cpp: ["cs", "engineering", "physics"],
  sql: ["ai", "math", "finance"],
  "web-dev": ["cs", "arts", "entrepreneurship"],
  data: ["ai", "math", "finance", "environmental", "psychology"],
  "machine-learning": ["ai", "cs", "math"],
  research: ["biology", "chemistry", "physics", "psychology", "environmental"],
  writing: ["writing", "law", "debate", "arts"],
  speaking: ["debate", "law", "service", "entrepreneurship"],
  design: ["arts", "engineering", "cs", "entrepreneurship"],
  video: ["arts", "writing", "entrepreneurship"],
  marketing: ["entrepreneurship", "finance", "arts"],
  leadership: ["service", "entrepreneurship", "debate"],
  beginner: [],
};

const INTEREST_ID_SET: ReadonlySet<string> = new Set(INTERESTS.map((i) => i.id));
const CAUSE_ID_SET: ReadonlySet<string> = new Set(CAUSES.map((c) => c.id));
const SKILL_ID_SET: ReadonlySet<string> = new Set(SKILLS.map((s) => s.id));
const INTEREST_LABELS = new Map(INTERESTS.map((i) => [i.id, i.label]));
const CAUSE_LABELS = new Map(CAUSES.map((c) => [c.id, c.label]));
const SKILL_LABELS = new Map(SKILLS.map((s) => [s.id, s.label]));

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Accept older/custom profile values while keeping the student's wording in the UI. */
function canonicalInterestId(value: string): string {
  const normalized = normalize(value);
  if (normalized === "machine learning" || normalized === "ml") return "ai";
  return value;
}

/**
 * A student's free-text "Other…" entry isn't a known interest/cause/skill id, so it can't
 * be looked up — but it's still a real, explicit signal the student typed. We treat it as
 * a keyword and check it against the idea's own text (title, summary, description, cause
 * labels, skills) rather than silently dropping it.
 */
function customTermHits(term: string, ideaSearchText: string): boolean {
  const normalized = normalize(term);
  if (normalized.length < 3 || FILLER_TERMS.has(normalized)) return false;
  // Match at a word start so "art" hits "artwork" but not "start".
  return ` ${ideaSearchText}`.includes(` ${normalized}`);
}

/** Typed answers that say nothing about the student ("Other", "idk") and must not match. */
const FILLER_TERMS: ReadonlySet<string> = new Set(["other", "others", "idk", "none", "not sure", "anything"]);

/**
 * Second route for a typed interest: the same tag vocabulary the opportunity matcher uses.
 * "political science" resolves to Law/Government tags, so an idea tagged `law` counts as a hit
 * on the student's own words even though the phrase never appears in the idea text.
 */
function customTermMatchesIdeaTags(term: string, idea: PathfindIdea): boolean {
  const termTags = preferenceTags([term]);
  if (termTags.length === 0) return false;
  const ideaTags = new Set(preferenceTags(idea.matchesInterests));
  return termTags.some((tag) => ideaTags.has(tag));
}

function ideaSearchText(idea: PathfindIdea): string {
  return normalize(
    [
      idea.title,
      idea.summary,
      idea.description,
      idea.potentialImpact,
      idea.problem ?? "",
      idea.whoItHelps ?? "",
      idea.dataSource ?? "",
      ...(idea.topics ?? []),
      ...(idea.tools ?? []),
      ...idea.matchesCauses.map((cause) => CAUSE_LABELS.get(cause) ?? cause),
      ...idea.skillsRequired,
      ...idea.skillsYouWillLearn,
    ].join(" "),
  );
}

/** Everything matched between one idea and one student profile, in plain labels. */
export interface IdeaMatchSignals {
  directInterests: string[];
  customInterests: string[];
  relatedInterestCount: number;
  causes: string[];
  customCauses: string[];
  skills: string[];
  customSkills: string[];
  categoryMatch: boolean;
  matchedGoalLabels: string[];
  /** Count of distinct signal *kinds* that hit (interest/cause/skill/goal) — drives both
   *  the multi-signal score bonus and whether an idea reads as "generic" vs. tailored. */
  signalKindCount: number;
}

function computeSignals(
  idea: PathfindIdea,
  interests: string[],
  causes: string[],
  goalIds: string[],
  skills: string[],
): IdeaMatchSignals {
  const canonicalInterests = interests
    .map(canonicalInterestId)
    .filter((id) => INTEREST_ID_SET.has(id));
  const customInterestValues = interests.filter(
    (id) => !INTEREST_ID_SET.has(id) && canonicalInterestId(id) === id,
  );
  const canonicalCauses = causes.filter((id) => CAUSE_ID_SET.has(id));
  const customCauseValues = causes.filter((id) => !CAUSE_ID_SET.has(id));
  const canonicalSkills = skills.filter((id) => SKILL_ID_SET.has(id));
  const customSkillValues = skills.filter((id) => !SKILL_ID_SET.has(id));

  const directInterests = idea.matchesInterests.filter((interest) =>
    canonicalInterests.includes(interest),
  );
  const relatedInterestCount = idea.matchesInterests.filter((ideaInterest) =>
    canonicalInterests.some((interest) => RELATED_INTERESTS[interest as Interest]?.includes(ideaInterest)),
  ).length;

  const searchText = ideaSearchText(idea);
  const customInterests = customInterestValues.filter(
    (term) => customTermHits(term, searchText) || customTermMatchesIdeaTags(term, idea),
  );
  const customCauses = customCauseValues.filter((term) => customTermHits(term, searchText));
  const customSkills = customSkillValues.filter((term) => customTermHits(term, searchText));

  const causeMatches = idea.matchesCauses.filter((cause) => canonicalCauses.includes(cause));

  const explicitSkillMatches = (idea.matchesSkills ?? []).filter((skill) =>
    canonicalSkills.includes(skill),
  );
  const ideaSkillText = idea.skillsRequired.concat(idea.skillsYouWillLearn).map(normalize);
  const textSkillMatches = canonicalSkills.filter((skill) => {
    const terms = [normalize(skill), normalize(SKILL_LABELS.get(skill as Skill) ?? skill)];
    return terms.some((term) => ideaSkillText.some((s) => s.includes(term) || term.includes(s)));
  });
  const skillInterestMatch = canonicalSkills.some((skill) =>
    SKILL_INTERESTS[skill as Skill]?.some((interest) => idea.matchesInterests.includes(interest)),
  );
  const matchedSkillIds = Array.from(new Set([...explicitSkillMatches, ...textSkillMatches]));

  const matchedGoalIds = goalIds.filter((goalId) =>
    GOAL_CATEGORIES[goalId as GoalId]?.includes(idea.category),
  );
  const categoryMatch = matchedGoalIds.length > 0;

  const signalKindCount = [
    directInterests.length > 0 || customInterests.length > 0,
    causeMatches.length > 0 || customCauses.length > 0,
    matchedSkillIds.length > 0 || customSkills.length > 0 || skillInterestMatch,
    categoryMatch,
  ].filter(Boolean).length;

  return {
    directInterests: directInterests.map((id) => {
      const selectedValue = interests.find((interest) => canonicalInterestId(interest) === id);
      return selectedValue && !INTEREST_ID_SET.has(selectedValue)
        ? selectedValue
        : INTEREST_LABELS.get(id) ?? id;
    }),
    customInterests,
    relatedInterestCount,
    causes: causeMatches.map((id) => CAUSE_LABELS.get(id) ?? id.replace(/-/g, " ")),
    customCauses,
    skills: matchedSkillIds.map((id) => SKILL_LABELS.get(id as Skill) ?? id),
    customSkills,
    categoryMatch,
    matchedGoalLabels: matchedGoalIds.map(goalLabel),
    signalKindCount,
  };
}

interface ScoredIdea {
  idea: PathfindIdea;
  score: number;
  signals: IdeaMatchSignals;
  originalIndex: number;
}

function scoreIdea(
  idea: PathfindIdea,
  originalIndex: number,
  interests: string[],
  causes: string[],
  goalIds: string[],
  skills: string[],
): ScoredIdea {
  const signals = computeSignals(idea, interests, causes, goalIds, skills);

  let score = signals.directInterests.length * 24;
  // Related-interest credit is a bridge for ideas with NO direct interest match (so a
  // thin profile still surfaces something adjacent) — once an idea already has a direct
  // match, broad extra tagging shouldn't let it out-rank a narrower, more tailored idea
  // that combines the direct interest with an actual cause/skill/goal signal.
  if (signals.directInterests.length === 0) {
    score += signals.relatedInterestCount * 5;
  }
  score += signals.categoryMatch ? 14 : 0;
  score += signals.causes.length * 6;
  score += signals.skills.length > 0 ? 5 : 0;
  score += signals.customInterests.length * 10;
  score += signals.customCauses.length * 8;
  score += signals.customSkills.length * 6;
  score += idea.difficulty === "beginner" && skills.includes("beginner") ? 4 : 0;

  // Specificity: an idea tagged with five interests that happens to include the student's one
  // is a weaker answer than an idea built around that interest. Without this, a broadly tagged
  // project ties a tailored one on direct-interest credit and wins on file order.
  if (signals.directInterests.length > 0) {
    score += Math.max(0, 8 - 2 * (idea.matchesInterests.length - 1));
  }

  // Multi-signal bonus: an idea that genuinely combines a direct interest with a cause,
  // skill, or goal is a much better answer than one that only happens to share a subject —
  // this is what makes two profiles with different skills/causes (but the same interest)
  // land on different top picks instead of the same generic one.
  const hasDirectInterest = signals.directInterests.length > 0 || signals.customInterests.length > 0;
  if (hasDirectInterest && signals.signalKindCount >= 2) {
    score += (signals.signalKindCount - 1) * 9;
  }

  return { idea, score, signals, originalIndex };
}

function compareIdeas(a: ScoredIdea, b: ScoredIdea) {
  return (
    b.score - a.score ||
    b.signals.directInterests.length - a.signals.directInterests.length ||
    Number(b.signals.categoryMatch) - Number(a.signals.categoryMatch) ||
    b.signals.causes.length - a.signals.causes.length ||
    a.originalIndex - b.originalIndex ||
    a.idea.id.localeCompare(b.idea.id)
  );
}

/**
 * Ranks Pathfind's hand-authored ideas against a student's selected route.
 *
 * Time is a preference, not a gate: ideas within the weekly budget come first, and
 * over-budget ideas are only appended when fewer than three fit (the match reason then
 * says so instead of claiming a fit). Direct interest matches come first; when a
 * profile has fewer than three direct matches, adjacent fields can fill the
 * route so the student still leaves with useful directions. Those broader
 * ideas must still share an explicit subject, goal, cause, or skill signal.
 *
 * Ideas that combine a direct interest with a cause, skill, or goal (not just the
 * interest alone) score a deliberate bonus — see the multi-signal bonus in
 * `scoreIdea` — so two students who share one interest but differ on skills/causes
 * land on different top picks instead of converging on the same generic idea.
 */
export function matchPathfindIdeas(
  ideas: PathfindIdea[],
  interests: Interest[],
  causes: Cause[],
  timeCommitment: TimeCommitment | null,
  goalIds: string[] = [],
  skills: Skill[] = [],
  grade: number | null = null,
  savedOpportunityIds: string[] = [],
): PathfindIdea[] {
  if (interests.length === 0) return [];

  const saved = new Set(savedOpportunityIds);

  const maxHours = timeCommitment ? MAX_WEEKLY_HOURS[timeCommitment] : Infinity;
  const ranked = ideas
    .map((idea, index) => {
      const scored = scoreIdea(idea, index, interests, causes, goalIds, skills);
      if (grade !== null) {
        if (grade <= 10 && idea.difficulty === "beginner") scored.score += 4;
        if (grade >= 11 && idea.difficulty === "advanced") scored.score += 4;
        // Feasibility: an advanced project with no matching skill is a likely stall for a
        // 9th grader — keep it available, just below the ideas they can finish.
        if (grade <= 9 && idea.difficulty === "advanced" && scored.signals.skills.length === 0) {
          scored.score -= 10;
        }
      }
      // A project that builds toward an opportunity the student already saved is a stronger
      // next step. Only a score nudge — saving alone never makes an unrelated idea eligible.
      if (idea.relatedOpportunityIds.some((id) => saved.has(id))) scored.score += 6;
      return scored;
    })
    .filter(
      (item) =>
        item.signals.directInterests.length > 0 ||
        item.signals.customInterests.length > 0 ||
        item.signals.relatedInterestCount > 0 ||
        item.signals.categoryMatch ||
        item.signals.causes.length > 0 ||
        item.signals.customCauses.length > 0 ||
        item.signals.skills.length > 0 ||
        item.signals.customSkills.length > 0,
    )
    .sort(compareIdeas);

  const direct = ranked.filter((item) => item.signals.directInterests.length > 0 || item.signals.customInterests.length > 0);
  const broader = ranked.filter((item) => item.signals.directInterests.length === 0 && item.signals.customInterests.length === 0);
  const ordered = direct.concat(broader).map((item) => item.idea);

  const withinBudget = ordered.filter((idea) => idea.minWeeklyHours <= maxHours);
  if (withinBudget.length >= MIN_IDEAS) return withinBudget;
  // Too few ideas fit the weekly budget: keep them first, then the best over-budget ones,
  // rather than telling a student with real interests that there is nothing to start.
  return withinBudget.concat(ordered.filter((idea) => idea.minWeeklyHours > maxHours));
}

/** Whether an idea's minimum weekly hours fit the student's stated budget (true when unknown). */
export function ideaFitsTime(idea: PathfindIdea, timeCommitment: TimeCommitment | null): boolean {
  return !timeCommitment || idea.minWeeklyHours <= MAX_WEEKLY_HOURS[timeCommitment];
}

/** The three "shapes" of project the diversity pass tries to spread a shortlist across —
 * a coarser grouping than `PathfindIdea["category"]` that matches how the user thinks
 * about variety: something you build, something you investigate, something you run with
 * other people.
 */
const DIVERSITY_BUCKET: Record<PathfindIdea["category"], "build" | "research" | "community"> = {
  build: "build",
  create: "build",
  research: "research",
  teach: "community",
  contribute: "community",
};

/** Takes an already-ranked idea list (best match first, as returned by
 * `matchPathfindIdeas`) and picks `limit` of them so the result isn't three
 * near-duplicates of the same project shape. It never reaches deep into the list for
 * variety's sake — it only prefers the *best-ranked* idea from each still-missing bucket
 * before falling back to strict rank order, so relevance always wins when the top matches
 * already happen to be diverse (or when there simply isn't a strong option in a bucket).
 */
export function diversifyIdeas(rankedIdeas: PathfindIdea[], limit: number): PathfindIdea[] {
  if (rankedIdeas.length <= limit) return rankedIdeas.slice(0, limit);

  const chosen: PathfindIdea[] = [];
  const chosenIds = new Set<string>();
  const bucketsCovered = new Set<string>();
  const remaining = [...rankedIdeas];

  const take = (idea: PathfindIdea) => {
    chosen.push(idea);
    chosenIds.add(idea.id);
    bucketsCovered.add(DIVERSITY_BUCKET[idea.category]);
    const at = remaining.indexOf(idea);
    if (at >= 0) remaining.splice(at, 1);
  };

  // Always take the single best match first — diversity should shape the rest of the
  // shortlist, not override the strongest recommendation.
  take(rankedIdeas[0]!);

  while (chosen.length < limit && remaining.length > 0) {
    const missingBucketIdea = remaining.find(
      (idea) => !bucketsCovered.has(DIVERSITY_BUCKET[idea.category]),
    );
    // Once every bucket is covered, look only a few places ahead for a different difficulty
    // or setting (solo/team, local/remote) so relevance still dominates.
    const varied = remaining
      .slice(0, 3)
      .find((idea) => !chosen.some((c) => c.difficulty === idea.difficulty && c.teamSize === idea.teamSize && c.setting === idea.setting));
    take(missingBucketIdea ?? varied ?? remaining[0]!);
  }

  // Preserve original rank order in the final list rather than the bucket-filling order.
  return rankedIdeas.filter((idea) => chosenIds.has(idea.id));
}

/**
 * Reframes a hand-authored idea for the current student without inventing a new opportunity.
 * The catalog project remains the source of truth; the profile signals only change the
 * student-facing framing and first step so different profiles do not see identical generic
 * briefs. Custom "Other" values are retained as explicit inputs.
 */
export function personalizeIdea(
  idea: PathfindIdea,
  interests: string[],
  causes: string[],
  goalIds: string[],
  skills: string[],
  grade: number | null = null,
  timeCommitment: TimeCommitment | null = null,
): PathfindIdea {
  const goalText = goalIds.map(goalLabel).filter(Boolean).join(" + ");
  const matchSignals = computeSignals(idea, interests, causes, goalIds, skills);
  // A custom value is shown in the brief only when it actually matched the idea text.
  // This prevents an unrelated “Other” answer from being presented as a fake connection.
  const matchedCustomLabels = [
    ...matchSignals.customInterests,
    ...matchSignals.customCauses,
    ...matchSignals.customSkills,
  ];
  // Never claim a time fit for an idea that only reached the list through the over-budget
  // fallback — describeIdeaMatch tells the student it needs more time instead.
  const constraintText = [
    grade ? `you are in grade ${grade}` : "",
    timeCommitment && ideaFitsTime(idea, timeCommitment) ? `you have ${timeCommitment}` : "",
    goalText ? `you want to ${goalText.toLowerCase()}` : "",
  ].filter(Boolean).join(", ");
  const firstStep = idea.firstStep;
  const baseSummary = constraintText
    ? `${idea.summary} This fits your path because ${constraintText}.`
    : idea.summary;
  const customSummary = matchedCustomLabels.length > 0
    ? `This project connects with what you entered: ${matchedCustomLabels.slice(0, 3).join(", ")}. ${baseSummary}`
    : baseSummary;
  const personalizedIdea = {
    ...idea,
    title: idea.title,
    summary: customSummary,
    description: idea.description,
    firstStep: firstStep,
  };
  return personalizedIdea;
}

export {};


export function describeIdeaMatch(
  idea: PathfindIdea,
  interests: Interest[],
  causes: Cause[],
  goalIds: string[],
  skills: Skill[] = [],
  grade: number | null = null,
  timeCommitment: TimeCommitment | null = null,
): string {
  const signals = computeSignals(idea, interests, causes, goalIds, skills);

  const specific = [
    ...signals.directInterests,
    ...signals.customInterests,
    ...signals.causes,
    ...signals.customCauses,
    ...signals.skills,
    ...signals.customSkills,
  ];
  // "Explore a field" / "Help me decide" match every project shape, so on their own they are
  // not evidence of a match — only mention goals alongside a real interest/cause/skill signal.
  const selected = specific.length > 0 ? [...specific, ...signals.matchedGoalLabels] : [];

  let base: string;
  if (selected.length >= 2) {
    base = `You selected ${joinList(selected)}. This project brings those choices together.`;
  } else if (selected.length === 1) {
    base = `You selected ${selected[0]}. This is a direct match.`;
  } else if (signals.relatedInterestCount > 0) {
    base = "This is a nearby direction based on your interests.";
  } else {
    base = "This is a possible starting point while you explore.";
  }

  const fitParts: string[] = [];
  if (grade !== null) fitParts.push(`grade ${grade}`);
  const fitsTime = ideaFitsTime(idea, timeCommitment);
  if (timeCommitment && fitsTime) fitParts.push(timeCommitment);
  const fit = fitParts.length > 0 ? ` Fits ${joinList(fitParts)}.` : "";
  const timeNote = timeCommitment && !fitsTime
    ? ` Needs more than ${timeCommitment} as written — trim the scope or spread it over a longer stretch.`
    : "";
  return `${base}${fit}${timeNote}`;
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
