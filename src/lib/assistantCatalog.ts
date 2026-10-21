// Resolves ids the assistant recommends against Pathfind's own canonical local data. The
// assistant edge function only ever returns record ids + reasoning — never authored facts — so
// title/org/deadline/cost/link always come from here, and any id that doesn't match a current
// record (stale, hallucinated, or since removed) is silently dropped rather than shown.
import { OPPORTUNITIES } from "../data/opportunities";
import type { Opportunity } from "../data/types";
import type { College } from "../data/colleges";

const OPPORTUNITIES_BY_ID = new Map(OPPORTUNITIES.map((o) => [o.id, o]));

export function resolveOpportunityIds(ids: string[]): Opportunity[] {
  return ids
    .map((id) => OPPORTUNITIES_BY_ID.get(id))
    .filter((o): o is Opportunity => o !== undefined);
}

export function resolveCollegeIds(ids: number[], colleges: College[]): College[] {
  const byId = new Map(colleges.map((c) => [c.id, c]));
  return ids.map((id) => byId.get(id)).filter((c): c is College => c !== undefined);
}
