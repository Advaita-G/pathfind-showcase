import type { Opportunity, OpportunityType } from "../data/types";

export function filterByType(
  opportunities: Opportunity[],
  types: OpportunityType[],
): Opportunity[] {
  if (types.length === 0) {
    return opportunities;
  }
  return opportunities.filter((opportunity) => types.includes(opportunity.type));
}
