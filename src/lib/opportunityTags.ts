import type { CanonicalTag } from "../data/tags";
import { canonicalTagsForInputs, sortTags, tagsForText } from "../data/tags";
import { INTERESTS, type Interest, type Opportunity, type OpportunityType } from "../data/types";

/**
 * Resolves an opportunity's canonical tags.
 *
 * Tags are never invented: they come from the record's own authored `tags`, its `interests`
 * ids, and words that literally appear in its title, org, or description. A record with no
 * verified content about, say, climate simply does not get the Climate tag.
 */

/*
 * Deliberately no generic "STEM" entry here: it is carried by almost every record, so using it as
 * a primary interest tag would make every science opportunity count as a match for every science
 * interest. "STEM" still exists in the tag vocabulary and is still read off a record's own wording
 * for search and for the broad fallback tier.
 */
const INTEREST_TAGS: Record<Interest, CanonicalTag[]> = {
  cs: ["Computer Science", "Programming"],
  ai: ["AI", "Machine Learning", "Data Science", "Computer Science"],
  math: ["Math"],
  physics: ["Physics", "Astronomy"],
  chemistry: ["Chemistry"],
  biology: ["Biology", "Medicine", "Health"],
  environmental: ["Environmental Science", "Climate", "Sustainability"],
  engineering: ["Engineering", "Robotics"],
  finance: ["Finance", "Business", "Economics"],
  entrepreneurship: ["Entrepreneurship", "Business"],
  writing: ["Writing", "Journalism"],
  arts: ["Arts", "Music", "Design", "Film", "Theater"],
  law: ["Law", "Government", "Public Policy"],
  psychology: ["Psychology", "Neuroscience"],
  debate: ["Debate", "Public Speaking", "Leadership"],
  service: ["Volunteer", "Community Service", "Leadership"],
};

/** The record's own classified type is grounded data, so it is a safe tag to derive. */
const TYPE_TAGS: Partial<Record<OpportunityType, CanonicalTag>> = {
  Internship: "Internship",
  Competition: "Competition",
  Research: "Research",
};

const INTEREST_LABELS = new Map(INTERESTS.map((interest) => [interest.id, interest.label]));

const TAG_CACHE = new WeakMap<Opportunity, CanonicalTag[]>();

/** Canonical tags for one opportunity, cached per record. */
export function opportunityTags(opportunity: Opportunity): CanonicalTag[] {
  const cached = TAG_CACHE.get(opportunity);
  if (cached) return cached;

  const fromText = tagsForText(
    [
      opportunity.title,
      opportunity.org,
      opportunity.description,
      ...opportunity.interests.map((interest) => INTEREST_LABELS.get(interest) ?? interest),
    ].join(" \n "),
  );
  const typeTag = TYPE_TAGS[opportunity.type];

  const tags = sortTags([
    ...(opportunity.tags ?? []),
    ...opportunity.interests.flatMap((interest) => INTEREST_TAGS[interest] ?? []),
    ...(typeTag ? [typeTag] : []),
    ...fromText,
  ]);

  TAG_CACHE.set(opportunity, tags);
  return tags;
}

/**
 * Canonical tags for whatever the student typed or picked. Interest ids resolve through the same
 * interest table used for records, so picking "Computer Science" and typing "coding" land on the
 * same tags; free text like "environmental engineering" or "sports analytics" resolves to every
 * tag it names.
 */
export function preferenceTags(values: string[]): CanonicalTag[] {
  const tags: CanonicalTag[] = [];
  const freeText: string[] = [];

  for (const value of values) {
    const interestTags = INTEREST_TAGS[value as Interest];
    if (interestTags) {
      tags.push(...interestTags);
    } else {
      freeText.push(value);
    }
  }

  tags.push(...canonicalTagsForInputs(freeText));
  return sortTags(tags);
}

/** How many of the student's canonical tags an opportunity carries. */
export function tagOverlap(opportunity: Opportunity, tags: CanonicalTag[]): number {
  if (tags.length === 0) return 0;
  const own = new Set<string>(opportunityTags(opportunity));
  return tags.filter((tag) => own.has(tag)).length;
}

/** Tags an opportunity carries that the student did not ask for — used to explain a match. */
export function sharedTags(opportunity: Opportunity, tags: CanonicalTag[]): CanonicalTag[] {
  const own = new Set<string>(opportunityTags(opportunity));
  return tags.filter((tag) => own.has(tag));
}
