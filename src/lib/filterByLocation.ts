import type { Location, Opportunity } from "../data/types";

export function filterByLocation(
  opportunities: Opportunity[],
  locations: Location[],
): Opportunity[] {
  if (locations.length === 0) {
    return opportunities;
  }
  return opportunities.filter((opportunity) => locations.includes(opportunity.location));
}
