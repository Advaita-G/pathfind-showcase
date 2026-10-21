import type { Opportunity } from "../data/types";

export function filterByCost(opportunities: Opportunity[], freeOnly: boolean): Opportunity[] {
  if (!freeOnly) {
    return opportunities;
  }
  return opportunities.filter((opportunity) => opportunity.free);
}
