import { INTERESTS, type Opportunity } from "../data/types";
import { hasBroadInterest } from "./opportunityMatching";
import { isRecommendable } from "./opportunityStatus";

const KNOWN_INTERESTS = new Set(INTERESTS.map((interest) => interest.id));

/**
 * Applies hard eligibility filtering.
 *
 * Only two things are hard here: the student's grade must be inside the program's own stated
 * range, and the program must not have been marked as ended by its source. Everything else —
 * interests, type, cost, location — is a preference that ranking handles.
 *
 * A free-text "Other" interest is intentionally not a hard category filter: it is a broad
 * preference, so it never removes records.
 */
export function filterOpportunities(
  opportunities: Opportunity[],
  grade: number | null,
  interests: string[],
): Opportunity[] {
  const eligible = opportunities.filter(
    (opportunity) =>
      isRecommendable(opportunity) &&
      (grade === null || (grade >= opportunity.minGrade && grade <= opportunity.maxGrade)),
  );

  if (interests.length === 0 || hasBroadInterest(interests)) {
    // If the selected grade has no catalog entries, keep the catalog available for the
    // ranking layer to surface the closest options rather than rendering a dead end.
    return eligible.length > 0 || grade === null ? eligible : opportunities.filter(isRecommendable);
  }

  return eligible.filter((opportunity) =>
    opportunity.interests.some((interest) => KNOWN_INTERESTS.has(interest) && interests.includes(interest)),
  );
}
