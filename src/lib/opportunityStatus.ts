import type { Opportunity, OpportunityLifecycleStatus } from "../data/types";
import { daysUntil } from "./formatDeadline";

/**
 * Where a program sits in its cycle right now.
 *
 * Status is derived, never stored, so a record cannot silently rot into looking "open" a year
 * after its deadline. Records are only marked INACTIVE when the program's own source says it has
 * ended — a passed deadline never means inactive.
 */
export function getOpportunityStatus(
  opportunity: Opportunity,
  today: Date = new Date(),
): OpportunityLifecycleStatus {
  if (opportunity.inactive) return "INACTIVE";

  if (!opportunity.deadline) {
    // No published deadline. A record flagged as an annual cycle simply hasn't published its next
    // date yet; anything else is a genuinely rolling sign-up (school chapter, self-paced course).
    return opportunity.recurring === true ? "UNKNOWN" : "RECURRING";
  }

  if (daysUntil(opportunity.deadline, today) >= 0) {
    const opens = opportunity.applicationOpenDate;
    return opens && daysUntil(opens, today) > 0 ? "UPCOMING" : "OPEN";
  }

  return "DEADLINE_PASSED";
}

/**
 * Whether a closed program is known to run again.
 *
 * A record with a published deadline is on an annual cycle by definition (that is how the date
 * was obtained), so it reopens unless its source says otherwise.
 */
export function expectedToReopen(opportunity: Opportunity): boolean {
  return opportunity.recurring ?? Boolean(opportunity.deadline);
}

/** Whether a record's next cycle is simply not published yet (distinct from rolling admission). */
export function awaitsNextCycle(opportunity: Opportunity): boolean {
  return getOpportunityStatus(opportunity) === "UNKNOWN";
}

/**
 * Whether an opportunity may be recommended right now. Only a program its own source marks as
 * ended is withheld — everything else stays recommendable so a closed cycle still surfaces as
 * "expected to reopen" rather than disappearing without explanation.
 */
export function isRecommendable(opportunity: Opportunity): boolean {
  return !opportunity.inactive;
}

/** Student-facing phrasing for a status, used by cards and the detail drawer. */
export function statusLabel(opportunity: Opportunity, today: Date = new Date()): string | null {
  switch (getOpportunityStatus(opportunity, today)) {
    case "OPEN":
      return null;
    case "UPCOMING":
      return "Applications not open yet";
    case "DEADLINE_PASSED":
      return expectedToReopen(opportunity)
        ? "Deadline passed — expected to reopen next cycle"
        : "This cycle has closed";
    case "RECURRING":
      return "Accepts applications on a rolling basis";
    case "UNKNOWN":
      return "Next cycle not yet published";
    case "INACTIVE":
      return "No longer running";
  }
}

/**
 * The subset of `statusLabel` worth putting on a result card. "Open" and "rolling" need no
 * badge — those are the normal case — so only a student's attention items come through here.
 */
export function deadlineNotice(opportunity: Opportunity, today: Date = new Date()): string | null {
  switch (getOpportunityStatus(opportunity, today)) {
    case "OPEN":
    case "RECURRING":
      return null;
    default:
      return statusLabel(opportunity, today);
  }
}

/**
 * Whether a record should count toward the "currently open" number rather than being shown as a
 * closed cycle. Used for copy like "N open right now" so the number never overstates activity.
 */
export function isCurrentlyOpen(opportunity: Opportunity, today: Date = new Date()): boolean {
  const status = getOpportunityStatus(opportunity, today);
  return status === "OPEN" || status === "RECURRING";
}
