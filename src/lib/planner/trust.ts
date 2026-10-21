import type { Opportunity } from "../../data/types";
import { daysUntil, formatDeadline } from "../formatDeadline";

/** A record last checked longer ago than this is shown as outdated until it is re-verified. */
export const STALE_AFTER_DAYS = 45;

export type TrustLevel = "verified" | "outdated" | "unknown";

export interface Trust {
  level: TrustLevel;
  label: string;
  detail: string;
}

/**
 * How much to trust a record's facts, from its real metadata only. `lastChecked` is set by the
 * import pipeline and `verified` only when every quoted fact was found on the official page.
 */
export function getTrust(opportunity: Opportunity, today: Date = new Date()): Trust {
  const { lastChecked } = opportunity;
  if (!lastChecked || !/^\d{4}-\d{2}-\d{2}$/.test(lastChecked)) {
    return { level: "unknown", label: "Not yet verified", detail: "Pathfind has no check date for this record. Confirm details on the official site." };
  }
  const age = -daysUntil(lastChecked, today);
  const when = formatDeadline(lastChecked);
  if (age > STALE_AFTER_DAYS) {
    return { level: "outdated", label: `Last checked ${when}`, detail: `This was checked ${age} days ago. Details may have changed — confirm on the official site.` };
  }
  if (opportunity.verified === true) {
    return { level: "verified", label: `Verified ${when}`, detail: "Checked against the official program page." };
  }
  return { level: "unknown", label: `Checked ${when}, not fully confirmed`, detail: "Some details could not be matched to the official page. Confirm them there." };
}
