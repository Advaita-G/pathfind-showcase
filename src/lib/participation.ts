import type { Opportunity, ParticipationInfo } from "../data/types";

/**
 * How Pathfind talks about "how you join" across the card badge, the detail page, and
 * Build My Path. Everything here reads directly off `opportunity.participation` — when
 * that's absent (not yet verified against the program's own official information), every
 * function here degrades to the honest "not yet verified" state rather than guessing from
 * the opportunity's name or type.
 */

export type ParticipationTone = "individual" | "mixed" | "team" | "club" | "unknown";

export interface ParticipationBadge {
  label: string;
  tone: ParticipationTone;
}

/** Small badge shown on opportunity cards and the detail page's quick facts. */
export function participationBadge(opportunity: Opportunity): ParticipationBadge {
  const p = opportunity.participation;
  if (!p) return { label: "PARTICIPATION REQUIREMENTS UNKNOWN", tone: "unknown" };

  switch (p.participationType) {
    case "individual":
      return { label: "INDIVIDUAL", tone: "individual" };
    case "mixed":
      return { label: "INDIVIDUAL OR TEAM", tone: "mixed" };
    case "team":
      return { label: "TEAM REQUIRED", tone: "team" };
    case "club":
    case "school":
      return { label: "SCHOOL/CLUB REQUIRED", tone: "club" };
    case "nomination":
      return { label: "NOMINATION REQUIRED", tone: "team" };
    case "organization":
      return { label: "ORGANIZATION REQUIRED", tone: "team" };
    case "unknown":
    default:
      break;
  }

  // participationType itself wasn't set, but individual boolean fields might still be verified.
  if (p.canJoinIndividually === true && p.requiresTeam !== true && p.requiresClubOrSchool !== true) {
    return { label: "INDIVIDUAL", tone: "individual" };
  }
  if (p.requiresTeam === true) return { label: "TEAM REQUIRED", tone: "team" };
  if (p.requiresClubOrSchool === true) return { label: "SCHOOL/CLUB REQUIRED", tone: "club" };
  return { label: "PARTICIPATION REQUIREMENTS UNKNOWN", tone: "unknown" };
}

/** True only once verified false — never true for "unknown", so it can't be over-filtered. */
export function requiresGroupToJoin(opportunity: Opportunity): boolean {
  return opportunity.participation?.canJoinIndividually === false;
}

/** True only once verified — used by the Build My Path "individually joinable only" filter. */
export function isConfirmedIndividuallyJoinable(opportunity: Opportunity): boolean {
  return opportunity.participation?.canJoinIndividually === true;
}

/** The sentence shown under "How you participate" on the detail page. */
export function howToJoinCopy(opportunity: Opportunity): string {
  return opportunity.participation?.howToJoin ?? "Participation requirements not yet verified.";
}

/**
 * A short, positive-framed line for Build My Path's verified-match list — never hides a
 * team/club requirement, but never phrases it as a rejection either.
 */
export function participationMatchNote(opportunity: Opportunity): string | null {
  const p = opportunity.participation;
  if (!p) return null;
  if (p.participationType === "individual") return null; // default expectation, no extra note needed
  if (p.canJoinIndividually === true) return "Good fit — you can join on your own or with a team";
  if (p.requiresClubOrSchool === true && p.requiresTeam !== true) {
    return "Strong match — join through a school or club";
  }
  if (p.requiresTeam === true || p.canJoinIndividually === false) {
    return "Strong match — requires joining a team";
  }
  return null;
}

export function hasVerifiedParticipation(opportunity: Opportunity): opportunity is Opportunity & {
  participation: ParticipationInfo;
} {
  return Boolean(opportunity.participation);
}
