import type { Opportunity } from "../data/types";

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function searchOpportunities(opportunities: Opportunity[], query: string): Opportunity[] {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) {
    return opportunities;
  }

  // Every word must appear somewhere, in any order ("summer math" finds "Math Summer Camp").
  return opportunities.filter((opportunity) => {
    const haystack = normalize(
      [opportunity.title, opportunity.org, opportunity.type, opportunity.description].join(" "),
    );
    return terms.every((term) => haystack.includes(term));
  });
}
