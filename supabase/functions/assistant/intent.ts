// Deterministic intent routing: decides what a message is asking for, and turns catalog
// requests into search filters, without a model call. Self-contained (no imports) so it runs
// in the Deno edge function and in vitest.
//
// Kinds:
// - unclear:  gibberish or empty. Fixed reply; no search, no model call, no quota.
// - greeting: fixed reply, same as unclear.
// - search:   an explicit request for programs/colleges. Runs the catalog search.
// - advice:   "what should I do / what fits me". Uses the student's own profile and saved items.
// - general:  school, study, stress, strategy questions. Answered normally; no search.
// - entity:   a question about a named school the catalog doesn't cover. No search, no invented facts.

export type IntentKind = "unclear" | "greeting" | "search" | "advice" | "general" | "entity";
export type IntentTarget = "opportunities" | "colleges" | "saved" | "plan" | null;

export interface Intent {
  kind: IntentKind;
  target: IntentTarget;
  /** The named school for `entity` messages, as typed. */
  entity: string | null;
  terms: string[];
  interests: string[];
  types: string[];
  freeOnly: boolean;
  closingWithinDays: number | null;
  grade: number | null;
}

const INTEREST_KEYWORDS: Record<string, string[]> = {
  cs: ["computer science", "coding", "code", "programming", "software", "cs", "app", "apps", "hackathon", "hackathons", "cybersecurity"],
  ai: ["ai", "artificial intelligence", "machine learning", "ml", "data science"],
  math: ["math", "mathematics", "calculus", "statistics"],
  physics: ["physics", "astronomy", "space", "astrophysics"],
  chemistry: ["chemistry", "chem"],
  biology: ["biology", "bio", "medicine", "medical", "health", "premed", "pre-med", "genetics", "biotech"],
  environmental: ["environment", "environmental", "climate", "sustainability", "ecology"],
  engineering: ["engineering", "robotics", "robot", "robots", "engineer"],
  finance: ["finance", "investing", "economics", "econ", "business"],
  entrepreneurship: ["entrepreneurship", "startup", "startups", "entrepreneur"],
  writing: ["writing", "journalism", "poetry", "creative writing"],
  arts: ["art", "arts", "music", "theater", "theatre", "film", "design", "dance"],
  law: ["law", "policy", "government", "politics", "legal"],
  psychology: ["psychology", "neuroscience", "psych"],
  debate: ["debate", "public speaking", "speech", "model un", "mun"],
  service: ["volunteer", "volunteering", "service", "community", "nonprofit", "social impact"],
};

const TYPE_KEYWORDS: Record<string, string[]> = {
  Research: ["research", "lab", "labs"],
  Internship: ["internship", "internships", "intern"],
  Competition: ["competition", "competitions", "contest", "contests", "olympiad", "olympiads"],
  Program: ["summer program", "summer programs", "camp", "camps", "pre-college", "precollege"],
};

const GRADE_WORDS: Record<string, number> = { freshman: 9, sophomore: 10, junior: 11, senior: 12 };

const STOPWORDS = new Set(
  ("a an and any are as at be best by can could do does for from get give good great how i im " +
    "in into is it just know like list me more my need of on or other out please really should " +
    "show so some tell that the them there these they things this those to up us want we what " +
    "whats when where which who why will with would you your about also find help looking look " +
    "programs program opportunities opportunity options stuff next apply applying available " +
    "open cool fun interesting new today now year years grade grades graders summer high school " +
    "student students college colleges university universities pick choose free cheap soon " +
    "closing due deadline deadlines upcoming month week remote online search").split(" "),
);

const GREETING =
  /^(hi|hey|hello|yo|sup|hiya|howdy|thanks|thank you|ty|ok|okay|cool|whats up|what's up|how are you|good morning|good afternoon|good evening)( there| pathfind)?[\s!.?]*$/;
const FILLER = /^(hmm+|idk|lol|lmao|huh|what|test|testing|\?+|\.+)$/;
const COLLEGE = /\b(colleges?|universit(y|ies)|campus(es)?)\b/;
const NOT_COLLEGE = /\b(programs?|internships?|research|camps?|competitions?|summer|fellowships?)\b/;
const SAVED = /\b(saved|bookmark(ed|s)?|my list)\b/;
const PERSONAL =
  /\b(for me|fits? me|good fit|should i|apply to|work on|focus on|prioriti[sz]e|my plan|a plan|plan for|next steps?|what next|match(es)? me|my profile|this (semester|summer|year|fall|spring|month))\b/;
const SEARCH_VERB = /\b(find|show|search|list|looking for|look for|any|are there|give me|recommend|suggest)\b/;
const CATALOG_NOUN =
  /\b(programs?|opportunit(y|ies)|internships?|scholarships?|research|competitions?|contests?|olympiads?|camps?|fellowships?|hackathons?|colleges?|universit(y|ies))\b/;
const GENERAL =
  /\b(stress(ed|ful)?|pressure|anxi(ety|ous)|burn(ed|t)? ?out|overwhelm(ed|ing)?|balanc(e|ing)|study(ing)?|homework|gpa|classes|courses?|schedule|time management|motivat(ion|ed)|procrastinat\w*|sleep|sat|act|ap|ib|teachers?|parents?|extracurriculars?|resume|recommendation letters?|essays?|tips?|advice|how (do|can|should) i)\b/;
// A named school: "Monte Vista High School", "lincoln high school", "Phillips Academy".
const SCHOOL = /\b([a-z][a-z.'-]*(?:\s+[a-z][a-z.'-]*){0,3})\s+(high school|middle school|academy|prep school)\b/i;
const NOT_A_NAME = new Set(
  "in my at of the a an during for to public private your our and junior senior before after through from about is as with freshman sophomore stressful hard".split(" "),
);

/** Keyboard mashing and nonsense: consonant pile-ups, no vowels, repeats, home-row runs. */
function isGibberish(token: string): boolean {
  if (/[^aeiouy]{6,}/.test(token)) return true;
  if (token.length >= 5 && !/[aeiouy]/.test(token)) return true;
  if (/^(.{2,})\1+$/.test(token)) return true;
  return /asdf|sdfg|dfgh|fghj|ghjk|hjkl|qwer|wert|erty|zxcv|xcvb|jkjk/.test(token);
}

function includesPhrase(text: string, phrase: string): boolean {
  return new RegExp(`(^|[^a-z0-9])${phrase.replace(/[-]/g, "\\-")}($|[^a-z0-9])`).test(text);
}

function namedSchool(message: string): string | null {
  const match = message.match(SCHOOL);
  if (!match) return null;
  const words = match[1].split(/\s+/);
  // Keep only the trailing run of name-like words: "pressure at Monte Vista High School" → "Monte Vista".
  let start = words.length;
  while (start > 0 && !NOT_A_NAME.has(words[start - 1].toLowerCase()) && !GENERAL.test(words[start - 1].toLowerCase())) {
    start--;
  }
  const name = words.slice(start).join(" ");
  return name ? `${name} ${match[2]}` : null;
}

export function parseIntent(message: string): Intent {
  const text = message.toLowerCase().replace(/[’']/g, "'").trim();
  const intent: Intent = {
    kind: "general",
    target: null,
    entity: null,
    terms: [],
    interests: [],
    types: [],
    freeOnly: /\b(free|no cost|tuition-free|cheap)\b/.test(text),
    closingWithinDays: /\b(closing|due soon|soon|this month|next month|upcoming|deadlines? coming)\b/.test(text) ? 45 : null,
    grade: null,
  };

  const words = text.split(/[^a-z0-9]+/).filter(Boolean);
  if (!/[a-z]/.test(text) || FILLER.test(text) || (words.length <= 3 && words.every(isGibberish))) {
    return { ...intent, kind: "unclear", freeOnly: false, closingWithinDays: null };
  }
  if (GREETING.test(text)) return { ...intent, kind: "greeting" };

  const matchedWords = new Set<string>();
  const collect = (map: Record<string, string[]>, into: string[]) => {
    for (const [id, phrases] of Object.entries(map)) {
      for (const phrase of phrases) {
        if (includesPhrase(text, phrase)) {
          if (!into.includes(id)) into.push(id);
          phrase.split(/[\s-]+/).forEach((w) => matchedWords.add(w));
        }
      }
    }
  };
  collect(INTEREST_KEYWORDS, intent.interests);
  collect(TYPE_KEYWORDS, intent.types);

  const gradeMatch = text.match(/\b(9|10|11|12)(th)?\s*grade|grade\s*(9|10|11|12)\b/);
  if (gradeMatch) intent.grade = Number(gradeMatch[1] ?? gradeMatch[3]);
  for (const [word, grade] of Object.entries(GRADE_WORDS)) {
    if (new RegExp(`\\b${word}s?\\b`).test(text)) intent.grade = grade;
  }

  intent.terms = [...new Set(words)]
    .filter((w) => w.length >= 3 && !/^\d+(th)?$/.test(w) && !STOPWORDS.has(w) && !matchedWords.has(w))
    .filter((w) => !(w in GRADE_WORDS) && !(w.endsWith("s") && w.slice(0, -1) in GRADE_WORDS))
    .slice(0, 5);

  const wantsColleges = COLLEGE.test(text) && !NOT_COLLEGE.test(text);
  const catalogAsk = CATALOG_NOUN.test(text) || intent.freeOnly || !!intent.closingWithinDays;
  const general = GENERAL.test(text);

  if (SAVED.test(text)) return { ...intent, kind: "advice", target: "saved" };

  if (PERSONAL.test(text) && !(general && !catalogAsk)) {
    const target: IntentTarget = wantsColleges
      ? "colleges"
      : catalogAsk || intent.interests.length || intent.types.length || /\bapply\b/.test(text)
      ? "opportunities"
      : "plan";
    return { ...intent, kind: "advice", target };
  }

  if (catalogAsk && !(general && !SEARCH_VERB.test(text))) {
    return { ...intent, kind: "search", target: wantsColleges ? "colleges" : "opportunities" };
  }

  const school = namedSchool(message);
  if (school) return { ...intent, kind: "entity", entity: school };

  if (general) return intent;

  // Short bare topics ("robotics", "stanford", "nasa") are searches, not questions.
  if ((intent.interests.length || intent.types.length) && words.length <= 4) {
    return { ...intent, kind: "search", target: "opportunities" };
  }
  if (intent.terms.length && words.length <= 3) {
    return { ...intent, kind: "search", target: wantsColleges ? "colleges" : "opportunities" };
  }
  return intent;
}
