import {
  OPPORTUNITY_TYPES,
  type Location,
  type Opportunity,
  type OpportunityType,
  type TimeCommitment,
} from "../data/types";
import { filterByType } from "./filterByType";
import { adjacentTags, isBroadFallbackCandidate, rankOpportunities } from "./opportunityMatching";
import { getOpportunityStatus, isRecommendable } from "./opportunityStatus";
import { preferenceTags, tagOverlap } from "./opportunityTags";

/**
 * How far the matcher had to relax to find anything:
 * 1. direct interest match (+ the selected opportunity types)
 * 2. related-interest match
 * 3. broad-eligibility opportunities
 * 4. selected opportunity types had to be dropped
 */
export type MatchTier = 1 | 2 | 3 | 4;

/** Below this, a result list reads as a dead end even though it isn't empty. */
const MIN_RESULTS = 3;

/**
 * How many results the relaxed tiers may report. Once interests have been dropped, the pool is the
 * whole eligible catalog — reporting "185 matches" for a niche interest would overstate how relevant
 * they are, so the fallback tiers return only the strongest few and say plainly that they are broader.
 */
const BROAD_TIER_LIMIT = 12;

export interface MatchBreakdown {
  total: number;
  byType: { type: OpportunityType; count: number }[];
  matches: Opportunity[];
  tier: MatchTier;
  /** Honest explanation to show above the list. Null when the match was exact. */
  note: string | null;
  /** Soft preferences that could not be honored. */
  relaxed: string[];
  /** Of the matched programs, how many accept applications right now. */
  openCount: number;
  /** Of the matched programs, how many have closed for this cycle but run again. */
  closedCycleCount: number;
  /** True only when nothing in the catalog is open to the student's grade at all. */
  noEligiblePrograms: boolean;
}

export interface MatchOptions {
  grade?: number | null;
  skills?: string[];
  causes?: string[];
  location?: Location | null;
  /**
   * Accepted so callers can pass the whole profile, but deliberately unused for now: no record
   * carries a verified hours-per-week figure, and inferring one from a program's name would be a
   * guess. Ranking on it needs a real per-program field gathered from each source first.
   */
  timeCommitment?: TimeCommitment | null;
  today?: Date;
}

/**
 * Hard eligibility: grade range only. Never relaxed, at any tier.
 * A program its own source marked as ended is excluded for good.
 */
function eligibleFor(opportunities: Opportunity[], grade: number | null): Opportunity[] {
  return opportunities.filter(
    (opportunity) =>
      isRecommendable(opportunity) &&
      (grade === null || (grade >= opportunity.minGrade && grade <= opportunity.maxGrade)),
  );
}

/**
 * Real match counts for a Build My Path selection, computed from the live opportunity dataset.
 *
 * Interests are soft preferences and are relaxed in order until something is found; the selected
 * opportunity types are preferred but dropped only if keeping them would leave nothing at all.
 * Eligibility is never relaxed, so a result is never something the student cannot join.
 */
export function matchOpportunities(
  opportunities: Opportunity[],
  interests: string[],
  types: OpportunityType[],
  options: MatchOptions = {},
): MatchBreakdown {
  const grade = options.grade ?? null;
  const today = options.today ?? new Date();
  const eligible = eligibleFor(opportunities, grade);

  if (eligible.length === 0) {
    return {
      total: 0,
      byType: [],
      matches: [],
      tier: 4,
      note:
        grade === null
          ? "Nothing in Pathfind's catalog is accepting students right now."
          : `No programs in Pathfind's current catalog accept grade ${grade} students yet.`,
      relaxed: [],
      openCount: 0,
      closedCycleCount: 0,
      noEligiblePrograms: true,
    };
  }

  const wanted = preferenceTags(interests);
  const adjacent = adjacentTags(wanted);
  const hasInterestFilter = interests.length > 0;
  const hasTypeFilter = types.length > 0;

  // Ladder with the student's chosen types intact, from most to least specific.
  const interestLadder = [
    hasInterestFilter ? eligible.filter((o) => tagOverlap(o, wanted) > 0) : eligible,
    hasInterestFilter ? eligible.filter((o) => tagOverlap(o, adjacent) > 0) : [],
    eligible.filter(isBroadFallbackCandidate),
    eligible,
  ].map((list) => filterByType(list, types));

  let tier: MatchTier = 4;
  let chosen: Opportunity[] = [];
  let relaxed: string[] = [];

  const firstNonEmpty = interestLadder.findIndex((list) => list.length > 0);
  if (firstNonEmpty !== -1) {
    tier = (firstNonEmpty + 1) as MatchTier;
    chosen = interestLadder[firstNonEmpty];
  } else if (hasTypeFilter) {
    // Nothing at any interest level accepts the requested type, so drop it rather than
    // showing an empty page. Recorded as `relaxed` so the UI can say so.
    const typeFree = [eligible.filter((o) => tagOverlap(o, wanted) > 0), eligible];
    tier = 4;
    relaxed = ["opportunity type"];
    chosen = typeFree.find((list) => list.length > 0) ?? eligible;
  }

  if (tier >= 2 && hasInterestFilter) relaxed.unshift("interest match");

  // Pad a thin list so a 9th grader with a specific interest never lands on one result.
  // Padding only ever pulls from later rungs of the same ladder, so it cannot contradict
  // a type the student explicitly asked for.
  if (chosen.length < MIN_RESULTS) {
    const seen = new Set(chosen.map((opportunity) => opportunity.id));
    for (let index = tier; index < interestLadder.length && chosen.length < MIN_RESULTS; index += 1) {
      for (const opportunity of interestLadder[index]) {
        if (chosen.length >= MIN_RESULTS) break;
        if (seen.has(opportunity.id)) continue;
        seen.add(opportunity.id);
        chosen.push(opportunity);
      }
    }
  }

  const ranked = rankOpportunities(chosen, {
    interests,
    types,
    grade: options.grade,
    skills: options.skills,
    causes: options.causes,
    location: options.location,
    timeCommitment: options.timeCommitment,
    today,
  });
  const matches = tier >= 3 ? ranked.slice(0, BROAD_TIER_LIMIT) : ranked;

  const byType = OPPORTUNITY_TYPES.map((type) => ({
    type,
    count: matches.filter((opportunity) => opportunity.type === type).length,
  })).filter((entry) => entry.count > 0);

  const openCount = matches.filter((opportunity) => {
    const status = getOpportunityStatus(opportunity, today);
    return status === "OPEN" || status === "RECURRING";
  }).length;

  const closedCycleCount = matches.filter(
    (opportunity) => getOpportunityStatus(opportunity, today) === "DEADLINE_PASSED",
  ).length;

  return {
    total: matches.length,
    byType,
    matches,
    tier,
    note: matchNote(tier, hasInterestFilter, relaxed),
    relaxed,
    openCount,
    closedCycleCount,
    noEligiblePrograms: false,
  };
}

function matchNote(tier: MatchTier, hasInterestFilter: boolean, relaxed: string[]): string | null {
  if (tier === 1) return null;

  if (relaxed.includes("opportunity type")) {
    return "Nothing in the catalog currently accepts that combination, so your results include every opportunity type that fits you.";
  }
  if (tier === 2) {
    return "Nothing matched every interest exactly, so these are the closest related programs in Pathfind's verified catalog.";
  }
  if (tier === 3) {
    return "We couldn't find an exact match yet, so here are opportunities that match your other preferences.";
  }
  return hasInterestFilter
    ? "No current program matches those preferences, so here is everything in the catalog that is open to your grade."
    : null;
}
