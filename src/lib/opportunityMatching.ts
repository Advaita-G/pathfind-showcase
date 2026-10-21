import { normalizeTerm, sortTags, type CanonicalTag } from "../data/tags";
import {
  INTERESTS,
  type Cause,
  type Location,
  type Opportunity,
  type OpportunityType,
  type Skill,
  type TimeCommitment,
} from "../data/types";
import { isCurrentlyOpen } from "./opportunityStatus";
import { opportunityTags, preferenceTags } from "./opportunityTags";

const KNOWN_INTERESTS = new Set<string>(INTERESTS.map((interest) => interest.id));

/** Skills and causes are stored as ids; each maps to the canonical tags it implies. */
const SKILL_TAGS: Record<Skill, CanonicalTag[]> = {
  python: ["Programming"],
  java: ["Programming"],
  javascript: ["Programming"],
  cpp: ["Programming"],
  sql: ["Data Science"],
  "web-dev": ["Programming", "Design"],
  data: ["Data Science"],
  "machine-learning": ["Machine Learning", "AI"],
  research: ["Research"],
  writing: ["Writing"],
  speaking: ["Public Speaking", "Debate"],
  design: ["Design"],
  video: ["Film"],
  marketing: ["Marketing"],
  leadership: ["Leadership"],
  beginner: [],
};

const CAUSE_TAGS: Record<Cause, CanonicalTag[]> = {
  education: ["Education"],
  climate: ["Climate", "Sustainability"],
  health: ["Health", "Medicine"],
  accessibility: ["Community Service"],
  community: ["Community Service", "Volunteer"],
  technology: ["STEM", "Computer Science"],
  sports: ["Sports"],
  arts: ["Arts"],
  "social-impact": ["Community Service", "Volunteer", "Leadership"],
};

/**
 * Tags that make an opportunity reasonable for almost any student. Only used to build the
 * broad fallback tier — never to replace a real match.
 */
const BROAD_FALLBACK_TAGS: CanonicalTag[] = [
  "Research",
  "Volunteer",
  "Community Service",
  "Leadership",
  "Scholarship",
  "Mentorship",
  "Summer Program",
  "Online Course",
  "STEM",
  "Fellowship",
];

/**
 * Second-degree tag relationships. These power "partial match" results so a student who picked
 * Law still sees Debate and Government opportunities when nothing is tagged Law directly.
 */
const RELATED_TAGS: Partial<Record<CanonicalTag, CanonicalTag[]>> = {
  AI: ["Computer Science", "Machine Learning", "Data Science", "Math"],
  "Machine Learning": ["AI", "Data Science", "Computer Science", "Math"],
  "Computer Science": ["Programming", "AI", "Data Science", "Math", "Engineering"],
  Programming: ["Computer Science", "Engineering", "Data Science"],
  "Data Science": ["Computer Science", "Math", "AI", "Finance", "Statistics"],
  Statistics: ["Data Science", "Math"],
  Sports: ["Health", "Statistics", "Data Science"],
  Cybersecurity: ["Computer Science", "Programming"],
  Robotics: ["Engineering", "Computer Science", "Physics"],
  Engineering: ["Robotics", "Physics", "Math", "Computer Science"],
  Math: ["Physics", "Data Science", "Computer Science", "Finance", "Engineering"],
  Physics: ["Astronomy", "Math", "Engineering"],
  Astronomy: ["Physics", "Math"],
  Chemistry: ["Biology", "Environmental Science", "Medicine"],
  Biology: ["Medicine", "Health", "Chemistry", "Neuroscience", "Environmental Science"],
  Medicine: ["Health", "Biology", "Chemistry", "Neuroscience", "Psychology"],
  Health: ["Medicine", "Biology", "Psychology"],
  Neuroscience: ["Biology", "Psychology", "Medicine"],
  Psychology: ["Neuroscience", "Health", "Education"],
  "Environmental Science": ["Climate", "Sustainability", "Biology", "Chemistry"],
  Climate: ["Environmental Science", "Sustainability", "Engineering"],
  Sustainability: ["Environmental Science", "Climate", "Community Service"],
  Research: ["STEM", "Biology", "Chemistry", "Physics", "Data Science"],
  Business: ["Entrepreneurship", "Finance", "Economics", "Marketing"],
  Entrepreneurship: ["Business", "Marketing", "Design", "Engineering"],
  Finance: ["Economics", "Business", "Math", "Data Science"],
  Economics: ["Finance", "Business", "Government", "Public Policy"],
  Law: ["Government", "Public Policy", "Debate", "Writing", "History"],
  Government: ["Public Policy", "Law", "History", "Leadership"],
  "Public Policy": ["Government", "Law", "Economics", "History", "Writing"],
  "International Relations": ["Government", "Public Policy", "History"],
  Writing: ["Journalism", "History", "Arts", "Law"],
  Journalism: ["Writing", "Film", "Public Speaking"],
  Design: ["Arts", "Engineering", "Film"],
  Arts: ["Music", "Film", "Theater", "Design", "Writing"],
  Film: ["Arts", "Theater", "Journalism"],
  History: ["Writing", "Government", "Law"],
  Education: ["Community Service", "Volunteer", "Psychology"],
  Volunteer: ["Community Service", "Leadership", "Education"],
  "Community Service": ["Volunteer", "Leadership", "Sustainability"],
  Leadership: ["Debate", "Public Speaking", "Government", "Community Service"],
  Debate: ["Public Speaking", "Law", "Government", "Leadership"],
  "Public Speaking": ["Debate", "Leadership", "Theater"],
  Scholarship: ["Education", "STEM"],
  Internship: ["Research", "STEM"],
  Competition: ["STEM", "Research"],
  "Summer Program": ["STEM", "Research"],
};

const EXPANDED_RELATED = new Map<CanonicalTag, CanonicalTag[]>(
  (() => {
    const map = new Map<CanonicalTag, Set<CanonicalTag>>();
    const add = (from: CanonicalTag, to: CanonicalTag) => {
      if (!map.has(from)) map.set(from, new Set());
      map.get(from)!.add(to);
    };
    for (const [from, targets] of Object.entries(RELATED_TAGS) as [CanonicalTag, CanonicalTag[]][]) {
      for (const to of targets) {
        add(from, to);
        // Relationships read both ways, so a Debate pick surfaces Law opportunities too.
        add(to, from);
      }
    }
    return Array.from(map.entries()).map(([tag, set]) => [tag, Array.from(set)]);
  })(),
);

/** The student's tags plus every tag one step away from them. */
export function relatedTags(tags: CanonicalTag[]): CanonicalTag[] {
  const expanded = new Set<CanonicalTag>(tags);
  for (const tag of tags) {
    for (const related of EXPANDED_RELATED.get(tag) ?? []) expanded.add(related);
  }
  return sortTags(expanded);
}

/** Tags strictly adjacent to the student's picks, excluding the picks themselves. */
export function adjacentTags(tags: CanonicalTag[]): CanonicalTag[] {
  const adjacent = new Set<CanonicalTag>(relatedTags(tags));
  for (const tag of tags) adjacent.delete(tag);
  return sortTags(adjacent);
}

export function isBroadInterest(value: string): boolean {
  return !KNOWN_INTERESTS.has(value);
}

export function hasBroadInterest(interests: string[]): boolean {
  return interests.some(isBroadInterest);
}

export interface OpportunityMatchContext {
  interests: string[];
  types?: OpportunityType[];
  grade?: number | null;
  skills?: string[];
  causes?: string[];
  location?: Location | null;
  timeCommitment?: TimeCommitment | null;
  today?: Date;
}

/**
 * Generic words students only ever reach by picking an "Other" row, so they must not be treated as
 * a typed preference. "others" in particular appears in ordinary program descriptions.
 */
const SENTINEL_TERMS = new Set(["other", "others", "none", "n a", "unknown", "anything", "any"]);

function freeTextPhrases(interests: string[]): string[] {
  return interests
    .map((value) => value.toLowerCase().replace(/([a-z0-9])\.(?=[a-z0-9])/g, "$1").replace(/[^a-z0-9+#]+/g, " ").trim())
    .filter((phrase) => phrase.length >= 4 && !SENTINEL_TERMS.has(phrase));
}

function gradeDistance(opportunity: Opportunity, grade: number | null | undefined): number {
  if (grade === null || grade === undefined) return 0;
  if (grade < opportunity.minGrade) return opportunity.minGrade - grade;
  if (grade > opportunity.maxGrade) return grade - opportunity.maxGrade;
  return 0;
}

function tagHitCount(opportunity: Opportunity, tags: CanonicalTag[]): number {
  if (tags.length === 0) return 0;
  const own = new Set<string>(opportunityTags(opportunity));
  return tags.filter((tag) => own.has(tag)).length;
}

/** Normalized text of a record, cached, for literal phrase lookups. */
const TEXT_CACHE = new WeakMap<Opportunity, string>();

function opportunityText(opportunity: Opportunity): string {
  const cached = TEXT_CACHE.get(opportunity);
  if (cached) return cached;

  const text = normalizeTerm(
    [opportunity.title, opportunity.org, opportunity.description].join(" \n "),
  );
  TEXT_CACHE.set(opportunity, text);
  return text;
}

/**
 * Ranks opportunities by how well they fit a student's profile.
 *
 * Ranking is never a gate: a weak fit still scores above zero, so the caller can always show
 * something useful. Hard eligibility lives in `filterOpportunities` and `matchOpportunities`.
 */
export function rankOpportunities(
  opportunities: Opportunity[],
  context: OpportunityMatchContext,
): Opportunity[] {
  const wanted = preferenceTags(context.interests);
  const adjacent = adjacentTags(wanted);
  const skillTags = sortTags((context.skills ?? []).flatMap((skill) => SKILL_TAGS[skill as Skill] ?? []));
  const causeTags = sortTags((context.causes ?? []).flatMap((cause) => CAUSE_TAGS[cause as Cause] ?? []));
  const phrases = freeTextPhrases(context.interests);
  const today = context.today ?? new Date();

  return opportunities
    .map((opportunity, index) => {
      const direct = tagHitCount(opportunity, wanted);
      const partial = tagHitCount(opportunity, adjacent);
      const skillHits = tagHitCount(opportunity, skillTags);
      const causeHits = tagHitCount(opportunity, causeTags);
      // A typed phrase that literally appears in the record is the strongest signal there is, and
      // it is grounded in the record's own wording rather than an inference about the program.
      const phraseHits = phrases.filter((phrase) => opportunityText(opportunity).includes(phrase)).length;
      const typeHit = context.types?.includes(opportunity.type) ? 1 : 0;
      const locationHit = context.location && opportunity.location === context.location ? 1 : 0;
      const distance = gradeDistance(opportunity, context.grade);
      const open = isCurrentlyOpen(opportunity, today) ? 1 : 0;

      const score =
        direct * 100 +
        phraseHits * 60 +
        partial * 30 +
        skillHits * 12 +
        causeHits * 10 +
        typeHit * 14 +
        locationHit * 8 +
        open * 6 +
        (distance === 0 ? 16 : Math.max(0, 8 - distance * 3));

      return { opportunity, score, direct, partial, index };
    })
    .sort((a, b) =>
      b.score - a.score ||
      b.direct - a.direct ||
      b.partial - a.partial ||
      a.index - b.index,
    )
    .map(({ opportunity }) => opportunity);
}

/** Eligibility-neutral check used by the broad fallback tier. */
export function isBroadFallbackCandidate(opportunity: Opportunity): boolean {
  // Wide grade range (open to most of high school) OR tagged with a broad-audience theme.
  const wideGrades = opportunity.maxGrade - opportunity.minGrade >= 3;
  const broadTag = tagHitCount(opportunity, BROAD_FALLBACK_TAGS) > 0;
  return wideGrades || broadTag;
}
