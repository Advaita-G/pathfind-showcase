import type { Opportunity } from "../data/types";
import { daysUntil } from "./formatDeadline";

/** Opportunities with a confirmed-or-estimated deadline that hasn't passed, nearest first. */
export function closingSoon(
  opportunities: Opportunity[],
  limit: number,
  today: Date = new Date(),
): Opportunity[] {
  return opportunities
    .filter((o): o is Opportunity & { deadline: string } => {
      if (!o.deadline) return false;
      return daysUntil(o.deadline, today) >= 0;
    })
    .sort((a, b) => daysUntil(a.deadline, today) - daysUntil(b.deadline, today))
    .slice(0, limit);
}
