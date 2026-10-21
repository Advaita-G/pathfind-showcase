import type { College } from "../data/colleges";

/**
 * Forgiving search over the IPEDS college directory.
 *
 * Ranking tiers (highest first): exact name-or-alias → name-or-alias prefix → every query word
 * is a prefix of a name/alias word ("csu long", "uc ber") → name substring → city → fuzzy (one
 * typo per word, "berkley"). A curated alias (UCSB, UCLA, …) ranks with a literal name match at
 * the same tier rather than below it — otherwise an obscure college whose real name happens to
 * start with the same letters (e.g. "UCNJ Union College") would outrank every actual University
 * of California campus when a student searches "UC". Ties prefer 4-year institutions, then
 * alphabetical — so "san jose" lists San Jose State before San Jose City College.
 *
 * ~3,900 records × a few string comparisons per keystroke is well under a millisecond; the
 * index is built once per directory load (see useColleges).
 */

const STATE_NAMES: Record<string, string> = {
  AL: "alabama", AK: "alaska", AZ: "arizona", AR: "arkansas", CA: "california", CO: "colorado",
  CT: "connecticut", DE: "delaware", DC: "district of columbia", FL: "florida", GA: "georgia",
  HI: "hawaii", ID: "idaho", IL: "illinois", IN: "indiana", IA: "iowa", KS: "kansas", KY: "kentucky",
  LA: "louisiana", ME: "maine", MD: "maryland", MA: "massachusetts", MI: "michigan", MN: "minnesota",
  MS: "mississippi", MO: "missouri", MT: "montana", NE: "nebraska", NV: "nevada", NH: "new hampshire",
  NJ: "new jersey", NM: "new mexico", NY: "new york", NC: "north carolina", ND: "north dakota",
  OH: "ohio", OK: "oklahoma", OR: "oregon", PA: "pennsylvania", RI: "rhode island",
  SC: "south carolina", SD: "south dakota", TN: "tennessee", TX: "texas", UT: "utah", VT: "vermont",
  VA: "virginia", WA: "washington", WV: "west virginia", WI: "wisconsin", WY: "wyoming",
};
const STATE_BY_NAME = new Map(Object.entries(STATE_NAMES).map(([code, name]) => [name, code]));

const TOKEN_SYNONYMS: Record<string, string> = { st: "saint", mt: "mount", univ: "university", ft: "fort" };

/** Lowercase, ASCII-fold, drop punctuation, expand "&" and "St." so both sides compare equal. */
export function normalizeCollegeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['\u2019]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/^the /, "") // "The University of Texas at Austin" should prefix-match "university of texas"
    .split(" ")
    .filter(Boolean)
    .map((token) => TOKEN_SYNONYMS[token] ?? token)
    .join(" ");
}

interface IndexedCollege {
  college: College;
  name: string;
  nameTokens: string[];
  aliases: string[];
  aliasTokens: string[][];
  city: string;
}

export interface CollegeSearchIndex {
  entries: IndexedCollege[];
  byKey: Map<string, College>;
}

export function buildCollegeIndex(colleges: College[]): CollegeSearchIndex {
  const entries: IndexedCollege[] = [];
  const byKey = new Map<string, College>();
  for (const college of colleges) {
    const name = normalizeCollegeText(college.name);
    const aliases = college.aliases.map(normalizeCollegeText).filter(Boolean);
    entries.push({
      college,
      name,
      nameTokens: name.split(" "),
      aliases,
      aliasTokens: aliases.map((alias) => alias.split(" ")),
      city: normalizeCollegeText(college.city),
    });
    // First writer wins so a real name is never shadowed by another school's alias.
    if (!byKey.has(name)) byKey.set(name, college);
    for (const alias of aliases) if (!byKey.has(alias)) byKey.set(alias, college);
  }
  return { entries, byKey };
}

export type CollegeMatchKind = "name" | "alias" | "city" | "fuzzy";

export interface CollegeMatch {
  college: College;
  score: number;
  kind: CollegeMatchKind;
  /** Set when the hit came from an alias the student typed rather than the display name. */
  matchedAlias?: string;
}

/** Damerau–Levenshtein (adjacent transpositions count once) capped at `max` for speed. */
export function editDistance(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i++) d[i][0] = i;
  for (let j = 0; j < cols; j++) d[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

const allowedTypos = (token: string) => (token.length >= 8 ? 2 : token.length >= 4 ? 1 : 0);

const tokensPrefixMatch = (queryTokens: string[], targetTokens: string[]) =>
  queryTokens.every((q) => targetTokens.some((t) => t.startsWith(q)));

const tokensFuzzyMatch = (queryTokens: string[], targetTokens: string[]) =>
  queryTokens.every((q) => {
    const budget = allowedTypos(q);
    return targetTokens.some((t) => t.startsWith(q) || (budget > 0 && editDistance(q, t, budget) <= budget));
  });

function scoreEntry(entry: IndexedCollege, query: string, queryTokens: string[]): CollegeMatch | null {
  const { college, name, aliases } = entry;
  // A curated abbreviation like "UCSB" is just as strong a signal of intent as a literal name
  // match, and must not lose to an unrelated college whose real name coincidentally starts with
  // the same letters — so name and alias hits share a score at every tier above. The one
  // exception is a bare single character ("l"): nobody types one letter meaning a specific
  // abbreviation, and `aliases` also holds noisy former/raw IPEDS names (not just nicknames),
  // so at that length alias hits stay a notch below real name matches like the old behavior.
  const aliasTierMatchesNameTier = query.length >= 2;
  if (name === query) return { college, score: 1000, kind: "name" };
  const exactAlias = aliases.findIndex((alias) => alias === query);
  if (exactAlias >= 0) {
    return { college, score: aliasTierMatchesNameTier ? 1000 : 950, kind: "alias", matchedAlias: college.aliases[exactAlias] };
  }
  if (name.startsWith(query)) return { college, score: 900, kind: "name" };
  const prefixAlias = aliases.findIndex((alias) => alias.startsWith(query));
  if (prefixAlias >= 0) {
    return { college, score: aliasTierMatchesNameTier ? 900 : 860, kind: "alias", matchedAlias: college.aliases[prefixAlias] };
  }
  if (tokensPrefixMatch(queryTokens, entry.nameTokens)) return { college, score: 800, kind: "name" };
  const tokenAlias = entry.aliasTokens.findIndex((tokens) => tokensPrefixMatch(queryTokens, tokens));
  if (tokenAlias >= 0) {
    return { college, score: aliasTierMatchesNameTier ? 800 : 780, kind: "alias", matchedAlias: college.aliases[tokenAlias] };
  }
  if (name.includes(query)) return { college, score: 700, kind: "name" };
  if (entry.city === query || entry.city.startsWith(query) || tokensPrefixMatch(queryTokens, entry.city.split(" "))) {
    return { college, score: 500, kind: "city" };
  }
  // A typo of the whole name or alias ("berkley" → alias "Berkeley") outranks a typo that merely
  // hits one word inside a longer name ("berkley" → Berklee College of Music).
  if (query.length >= 4) {
    const budget = allowedTypos(query);
    if (budget > 0) {
      if (editDistance(query, name, budget) <= budget) return { college, score: 400, kind: "fuzzy" };
      const wholeAlias = aliases.findIndex((alias) => editDistance(query, alias, budget) <= budget);
      if (wholeAlias >= 0) return { college, score: 400, kind: "fuzzy", matchedAlias: college.aliases[wholeAlias] };
    }
  }
  if (queryTokens.some((q) => q.length >= 4) && tokensFuzzyMatch(queryTokens, entry.nameTokens)) {
    return { college, score: 300, kind: "fuzzy" };
  }
  const fuzzyAlias = entry.aliasTokens.findIndex(
    (tokens) => queryTokens.some((q) => q.length >= 4) && tokensFuzzyMatch(queryTokens, tokens),
  );
  if (fuzzyAlias >= 0) return { college, score: 300, kind: "fuzzy", matchedAlias: college.aliases[fuzzyAlias] };
  return null;
}

/** "bethel university tn" / "bethel university tennessee" → filter to that state. */
function splitStateSuffix(tokens: string[]): { tokens: string[]; state: string | null } {
  if (tokens.length < 2) return { tokens, state: null };
  const last = tokens[tokens.length - 1];
  const lastTwo = tokens.slice(-2).join(" ");
  if (STATE_BY_NAME.has(lastTwo) && tokens.length > 2) return { tokens: tokens.slice(0, -2), state: STATE_BY_NAME.get(lastTwo)! };
  if (STATE_BY_NAME.has(last)) return { tokens: tokens.slice(0, -1), state: STATE_BY_NAME.get(last)! };
  if (last.length === 2 && STATE_NAMES[last.toUpperCase()]) return { tokens: tokens.slice(0, -1), state: last.toUpperCase() };
  return { tokens, state: null };
}

export interface SearchCollegesOptions {
  limit?: number;
  /** Names already chosen — hidden from results. */
  exclude?: string[];
}

function collect(index: CollegeSearchIndex, queryTokens: string[], state: string | null, excluded: Set<string>): CollegeMatch[] {
  const query = queryTokens.join(" ");
  if (!query) return [];
  const matches: CollegeMatch[] = [];
  for (const entry of index.entries) {
    if (state && entry.college.state !== state) continue;
    if (excluded.has(entry.name)) continue;
    const match = scoreEntry(entry, query, queryTokens);
    if (match) matches.push(match);
  }
  return matches;
}

export function searchColleges(index: CollegeSearchIndex, rawQuery: string, options: SearchCollegesOptions = {}): CollegeMatch[] {
  const limit = options.limit ?? 8;
  const normalized = normalizeCollegeText(rawQuery);
  if (!normalized) return [];
  const excluded = new Set((options.exclude ?? []).map(normalizeCollegeText));
  const allTokens = normalized.split(" ");

  // The literal query wins whenever it matches anything ("santa mo" must keep showing Santa
  // Monica while typing, "university of texas" must not become a Texas-only "university of").
  // The trailing-state form ("bethel university tn") is only a fallback for when it doesn't.
  let matches = collect(index, allTokens, null, excluded);
  if (matches.length === 0) {
    const { tokens, state } = splitStateSuffix(allTokens);
    if (state) matches = collect(index, tokens, state, excluded);
  }
  matches.sort(
    (a, b) =>
      b.score - a.score ||
      (a.college.level === b.college.level ? 0 : a.college.level === "4-year" ? -1 : 1) ||
      a.college.name.localeCompare(b.college.name),
  );
  return matches.slice(0, limit);
}

/**
 * Maps a stored value (canonical name, legacy Pathfind abbreviation like "UC Berkeley", or an
 * IPEDS raw name) to its directory record; null when nothing matches exactly. Never guesses —
 * a saved name we can't resolve is kept verbatim by callers instead of being dropped.
 */
export function resolveCollege(index: CollegeSearchIndex, savedName: string): College | null {
  return index.byKey.get(normalizeCollegeText(savedName)) ?? null;
}

export interface HighlightSegment {
  text: string;
  match: boolean;
}

/** Marks the typed prefixes inside a display name so the dropdown can bold what matched. */
export function highlightCollegeName(name: string, rawQuery: string): HighlightSegment[] {
  const queryTokens = normalizeCollegeText(rawQuery).split(" ").filter(Boolean);
  if (queryTokens.length === 0) return [{ text: name, match: false }];
  const segments: HighlightSegment[] = [];
  for (const part of name.split(/(\s+|,)/)) {
    if (!part) continue;
    const normalizedWord = normalizeCollegeText(part);
    const hit = normalizedWord ? queryTokens.find((q) => normalizedWord.startsWith(q)) : undefined;
    if (!hit) {
      segments.push({ text: part, match: false });
      continue;
    }
    // Approximate the highlighted length in the original word (punctuation may shift it by a char).
    const length = Math.max(1, Math.min(part.length, hit.length + (part.length - normalizedWord.length)));
    segments.push({ text: part.slice(0, length), match: true });
    if (length < part.length) segments.push({ text: part.slice(length), match: false });
  }
  return segments;
}
