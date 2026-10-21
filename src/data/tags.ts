/**
 * Canonical tagging vocabulary.
 *
 * Opportunity records are authored against the small `Interest` taxonomy in `types.ts`, but
 * students type (and pick) much more specific things: "environmental engineering", "ML",
 * "quant", "AI ethics", "sports analytics". Rather than adding a category for every phrase,
 * every free-text term is mapped onto one or more canonical tags here, and matching compares
 * canonical tags — never raw strings.
 *
 * Rules this file exists to enforce:
 * - A tag is only ever awarded from words the record actually contains, or from its own
 *   interest ids. Nothing is inferred about a program's content.
 * - Synonyms always resolve to an existing canonical tag; unknown phrases simply produce no
 *   tags (which is fine — unmapped preferences rank nothing rather than filtering everything).
 */

export const CANONICAL_TAGS = [
  "AI",
  "Machine Learning",
  "Computer Science",
  "Programming",
  "Data Science",
  "Statistics",
  "Cybersecurity",
  "Robotics",
  "Engineering",
  "Math",
  "Physics",
  "Astronomy",
  "Chemistry",
  "Biology",
  "Medicine",
  "Health",
  "Neuroscience",
  "Psychology",
  "Environmental Science",
  "Climate",
  "Sustainability",
  "Research",
  "Business",
  "Entrepreneurship",
  "Finance",
  "Economics",
  "Marketing",
  "Law",
  "Government",
  "Public Policy",
  "International Relations",
  "Writing",
  "Journalism",
  "Design",
  "Arts",
  "Music",
  "Film",
  "Theater",
  "History",
  "Education",
  "Volunteer",
  "Community Service",
  "Leadership",
  "Debate",
  "Public Speaking",
  "Sports",
  "Scholarship",
  "Internship",
  "Competition",
  "Summer Program",
  "Fellowship",
  "Mentorship",
  "Online Course",
  "STEM",
] as const;

export type CanonicalTag = (typeof CANONICAL_TAGS)[number];

const CANONICAL_TAG_SET = new Set<string>(CANONICAL_TAGS);
const CANONICAL_TAG_ORDER = new Map<string, number>(CANONICAL_TAGS.map((tag, index) => [tag, index]));

/**
 * Phrases that must map to a canonical tag even though the wording differs. Every key is
 * normalized (lowercased, punctuation stripped) before lookup, so "AI/ML" and "a.i." are
 * handled by the same entries.
 */
export const TAG_ALIASES: Record<CanonicalTag, string[]> = {
  AI: ["ai", "artificial intelligence", "generative ai", "llm", "large language model", "chatgpt", "deep learning", "computer vision", "nlp", "natural language processing"],
  "Machine Learning": ["machine learning", "ml", "neural network", "neural networks", "mlops", "computer vision", "nlp"],
  "Computer Science": ["computer science", "cs", "computing", "software", "software engineering", "coding", "bioinformatics", "computational biology"],
  Programming: ["programming", "coding", "python", "java", "javascript", "c++", "cpp", "developer", "app development"],
  "Data Science": [
    "data science",
    "data analysis",
    "data analytics",
    "analytics",
    "data",
    "statistics",
    "stats",
    "quant",
    "quantitative",
    "sports analytics",
    "bioinformatics",
    "computational biology",
  ],
  Statistics: ["statistics", "statistical", "stats", "probability", "sports analytics", "biostatistics"],
  Cybersecurity: ["cybersecurity", "cyber security", "infosec", "security", "hacking", "hackathon", "capture the flag", "ctf"],
  Robotics: ["robotics", "robot", "autonomous vehicles", "drones"],
  Engineering: ["engineering", "engineer", "aerospace", "mechanical", "electrical", "civil engineering", "biomedical"],
  Math: ["math", "mathematics", "maths", "quant", "number theory", "calculus", "olympiad"],
  Physics: ["physics", "mechanics", "quantum", "astrophysics"],
  Astronomy: ["astronomy", "space", "astrophysics", "planetary", "telescope", "nasa"],
  Chemistry: ["chemistry", "chemical", "biochemistry", "materials science"],
  Biology: ["biology", "biological", "genetics", "genomics", "ecology", "marine biology", "bioinformatics", "computational biology", "biotech", "biotechnology"],
  Medicine: ["medicine", "medical", "pre-med", "premed", "clinical", "physician", "nursing", "public health", "sports medicine"],
  Health: ["health", "healthcare", "wellness", "hospital", "mental health"],
  Neuroscience: ["neuroscience", "brain", "neuro"],
  Psychology: ["psychology", "psychological", "behavioral", "cognitive", "behavioral science"],
  "Environmental Science": ["environmental science", "environment", "environmental", "conservation", "wildlife", "ocean", "marine"],
  Climate: ["climate", "climate change", "global warming", "emissions", "decarbonization", "clean energy", "renewable energy"],
  Sustainability: ["sustainability", "sustainable", "recycling", "zero waste", "biodiversity"],
  Research: ["research", "scientific research", "lab", "laboratory", "experiment", "inquiry"],
  Business: ["business", "management", "commerce", "accounting", "marketing", "consulting"],
  Entrepreneurship: ["entrepreneurship", "entrepreneur", "startup", "startups", "venture", "innovation", "pitch"],
  Finance: ["finance", "financial", "investing", "investment", "trading", "banking", "quant", "stock market"],
  Economics: ["economics", "economic", "economy", "macro", "microeconomics"],
  Marketing: ["marketing", "social media", "branding", "advertising"],
  Law: ["law", "legal", "attorney", "lawyer", "court", "justice", "supreme court", "mock trial"],
  Government: ["government", "governance", "civics", "civic", "congress", "senate", "legislature", "elections"],
  "Public Policy": ["public policy", "policy", "policymaking", "politics", "political science", "advocacy", "legislation"],
  "International Relations": ["international relations", "diplomacy", "global affairs", "foreign policy", "model un", "united nations"],
  Writing: ["writing", "writer", "essay", "essays", "poetry", "literature", "creative writing", "nonfiction"],
  Journalism: ["journalism", "journalist", "news", "reporting", "newspaper", "broadcast"],
  Design: ["design", "ux", "ui", "graphic design", "product design", "architecture"],
  Arts: ["arts", "art", "visual arts", "painting", "drawing", "sculpture", "photography", "portfolio"],
  Music: ["music", "musician", "orchestra", "band", "jazz", "composition", "instrument"],
  Film: ["film", "film making", "filmmaking", "cinema", "video production", "animation", "documentary"],
  Theater: ["theater", "theatre", "drama", "acting", "musical theater"],
  History: ["history", "historical", "archives", "primary sources"],
  Education: ["education", "teaching", "tutor", "tutoring", "mentor", "mentoring", "literacy"],
  Volunteer: ["volunteer", "volunteering", "service hours", "community service", "nonprofit"],
  "Community Service": ["community service", "community impact", "mutual aid", "charity", "philanthropy"],
  Leadership: ["leadership", "leader", "student council", "student government", "civic engagement", "civic leadership"],
  Debate: ["debate", "debating", "forensics", "public forum", "lincoln-douglas", "speech and debate"],
  "Public Speaking": ["public speaking", "speech", "oratory", "oratorical", "presentation skills"],
  Sports: [
    "sports",
    "sport",
    "athletics",
    "athlete",
    "athletes",
    "sports analytics",
    "sports medicine",
    "basketball",
    "baseball",
    "football",
    "soccer",
    "volleyball",
    "tennis",
    "swimming",
    "track and field",
  ],
  Scholarship: ["scholarship", "scholarships", "financial aid", "stipend", "tuition"],
  Internship: ["internship", "internships", "intern", "apprenticeship", "externship"],
  Competition: ["competition", "competitions", "contest", "olympiad", "championship", "tournament", "challenge"],
  "Summer Program": ["summer program", "summer camp", "summer institute", "summer school", "residential program"],
  Fellowship: ["fellowship", "fellows program", "scholar program", "cohort"],
  Mentorship: ["mentorship", "mentor", "mentoring", "one-on-one", "adviser", "advisor"],
  "Online Course": ["online course", "self-paced", "mooc", "free course", "certificate course", "virtual course"],
  STEM: ["stem", "science", "technology", "engineering and math", "science and technology"],
};

/**
 * Normalization used for both stored tags and student-entered phrases.
 *
 * The dotted-abbreviation pass runs first so "A.I.", "M.L.", and "U.S." collapse into their plain
 * forms before punctuation is stripped — otherwise the phrase "A.I." would normalize to the
 * meaningless "a i" and never match the AI tag.
 */
export function normalizeTerm(value: string): string {
  return value
    .toLowerCase()
    .replace(/([a-z0-9])\.(?=[a-z0-9])/g, "$1")
    .replace(/[^a-z0-9+#]+/g, " ")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Precompiled word-boundary matchers so "ai" does not match inside "chair" and "art" does not
 * match inside "earth". Aliases are matched longest-first via a single union expression.
 */
const ALIAS_MATCHERS: { tag: CanonicalTag; pattern: RegExp; length: number }[] = CANONICAL_TAGS.flatMap((tag) =>
  TAG_ALIASES[tag].map((alias) => ({
    tag,
    length: alias.length,
    pattern: new RegExp(`\\b${escapeRegExp(alias).replace(/\s+/g, "\\s+")}\\b`),
  })),
).sort((a, b) => b.length - a.length);

const ALIASES_BY_TAG = new Map<CanonicalTag, string[]>(
  CANONICAL_TAGS.map((tag) => [tag, TAG_ALIASES[tag].map(normalizeTerm)]),
);

/** Sorts tags into the canonical order so scored/compared tag lists are deterministic. */
export function sortTags(tags: Iterable<string>): CanonicalTag[] {
  return Array.from(new Set(tags))
    .filter((tag): tag is CanonicalTag => CANONICAL_TAG_SET.has(tag))
    .sort((a, b) => (CANONICAL_TAG_ORDER.get(a) ?? 0) - (CANONICAL_TAG_ORDER.get(b) ?? 0));
}

/**
 * Canonical tags present in a block of text. Used for both opportunity records (tags are read
 * off the record's own verified wording) and student-entered phrases.
 */
export function tagsForText(text: string): CanonicalTag[] {
  const normalized = ` ${normalizeTerm(text)} `;
  if (normalized.trim().length === 0) return [];
  const found = ALIAS_MATCHERS.filter(({ pattern }) => pattern.test(normalized)).map(({ tag }) => tag);
  return sortTags(found);
}

/**
 * Canonical tags for a list of student inputs, which may be interest ids, interest labels, or
 * free text like "environmental engineering". An exact alias match is preferred; otherwise the
 * phrase is scanned for any canonical wording it contains, so compound phrases resolve to every
 * tag they name.
 */
export function canonicalTagsForInputs(values: string[]): CanonicalTag[] {
  const tags: CanonicalTag[] = [];
  for (const value of values) {
    const normalized = normalizeTerm(value);
    if (normalized.length === 0) continue;
    const exact = CANONICAL_TAGS.filter((tag) => ALIASES_BY_TAG.get(tag)?.includes(normalized));
    if (exact.length > 0) {
      tags.push(...exact);
      continue;
    }
    tags.push(...tagsForText(value));
  }
  return sortTags(tags);
}

/** True when a stored tag string is part of the canonical vocabulary. */
export function isCanonicalTag(value: string): value is CanonicalTag {
  return CANONICAL_TAG_SET.has(value);
}
