import type { Opportunity } from "../data/types";
import { COLLEGE_OPPORTUNITY_IDS, LEGACY_COLLEGE_NAMES } from "../data/collegeOpportunityLinks";
import { normalizeCollegeText } from "./collegeSearch";

// Deliberately a static, hand-verified lookup rather than name-matching — see
// collegeOpportunityLinks.ts for why automatic matching isn't safe here.
const IDS_BY_KEY = new Map<string, string[]>();
for (const [name, ids] of Object.entries(COLLEGE_OPPORTUNITY_IDS)) IDS_BY_KEY.set(normalizeCollegeText(name), ids);
for (const [legacy, canonical] of Object.entries(LEGACY_COLLEGE_NAMES)) {
  const ids = COLLEGE_OPPORTUNITY_IDS[canonical];
  if (ids) IDS_BY_KEY.set(normalizeCollegeText(legacy), ids);
}

/** Accepts the canonical directory name or a legacy stored abbreviation ("UC Berkeley"). */
export function opportunitiesForCollege(opportunities: Opportunity[], college: string): Opportunity[] {
  const ids = IDS_BY_KEY.get(normalizeCollegeText(college));
  if (!ids || ids.length === 0) return [];

  const byId = new Map(opportunities.map((opportunity) => [opportunity.id, opportunity]));
  return ids
    .map((id) => byId.get(id))
    .filter((opportunity): opportunity is Opportunity => opportunity !== undefined);
}
