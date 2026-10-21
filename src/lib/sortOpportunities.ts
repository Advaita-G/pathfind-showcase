import type { Opportunity, SortBy } from "../data/types";

function toIsoDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Deadline order: upcoming deadlines soonest-first, then deadlines that have
 * already passed, then rolling entries alphabetically. An expired cycle is still
 * useful signal (it shows roughly when the program opens) but shouldn't lead.
 */
function byDeadline(today: string) {
  return (a: Opportunity, b: Opportunity): number => {
    const rank = (o: Opportunity) => (!o.deadline ? 2 : o.deadline < today ? 1 : 0);
    const rankDiff = rank(a) - rank(b);
    if (rankDiff !== 0) return rankDiff;
    if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
    return a.title.localeCompare(b.title);
  };
}

function byType(a: Opportunity, b: Opportunity): number {
  return a.type.localeCompare(b.type) || a.title.localeCompare(b.title);
}

function byGrade(a: Opportunity, b: Opportunity): number {
  return a.minGrade - b.minGrade || a.maxGrade - b.maxGrade || a.title.localeCompare(b.title);
}

export function sortOpportunities(
  opportunities: Opportunity[],
  sortBy: SortBy,
  today: Date = new Date(),
): Opportunity[] {
  const comparator =
    sortBy === "deadline" ? byDeadline(toIsoDay(today)) : sortBy === "type" ? byType : byGrade;
  return [...opportunities].sort(comparator);
}
