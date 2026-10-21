import type { Interest, Location, OpportunityType } from "../data/types";

export interface EmptyStateFilters {
  grade: number | null;
  interests: Interest[];
  types: OpportunityType[];
  locations: Location[];
  freeOnly: boolean;
  query: string;
}

/**
 * "No results" is a dead end. This names the filter most likely to be the one
 * holding everything back, so the student has a concrete next move instead of a
 * generic invitation to try something else.
 *
 * Order matters: the narrowest, most-often-overdone filters are suggested first
 * (a free text query beats everything, then cost, then place), because dropping
 * those recovers the most results.
 */
export function emptyStateHint(filters: EmptyStateFilters): string {
  const { grade, interests, types, locations, freeOnly, query } = filters;
  const active: string[] = [];
  if (query.trim() !== "") active.push("search");
  if (freeOnly) active.push("cost");
  if (locations.length > 0) active.push("location");
  if (types.length > 0) active.push("type");
  if (interests.length > 0) active.push("interest");
  if (grade !== null) active.push("grade");

  if (active.length === 0) {
    return "Nothing in the catalog matches right now. Try a different keyword.";
  }

  const trimmedQuery = query.trim();
  const count = active.length;
  const lead =
    count === 1
      ? "Nothing matches that filter."
      : `Nothing matches all ${count} filters at once.`;

  // The first entry is the narrowest active filter, so it is the one to drop.
  const [first, second] = active;
  if (first === "search") {
    return `${lead} Try a shorter keyword than “${trimmedQuery}”${
      second ? `, or drop the ${second} filter` : ""
    }.`;
  }
  return `${lead} Try removing the ${first} filter${second ? ` or the ${second} one` : ""}.`;
}
