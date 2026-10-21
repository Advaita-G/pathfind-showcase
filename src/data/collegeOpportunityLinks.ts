/**
 * Manually verified links from a college (its canonical display name in the IPEDS-generated
 * directory, `colleges.generated.json`) to real Pathfind opportunities actually run by that college.
 *
 * This is hand-curated on purpose, not computed by matching names — a college's name often
 * collides with an unrelated organization's name (e.g. "Davidson College" vs. the unrelated
 * "Davidson Institute for Talent Development"; "American University" vs. "American Chemical
 * Society"; "University of San Francisco" vs. the city government of San Francisco). Matching
 * on name similarity produced false affiliations for exactly those cases, so every entry below
 * was checked by hand against each opportunity's real `org` field.
 *
 * When adding a new opportunity, only add it here if you've confirmed the host college in
 * `org` is genuinely that college (or a real sub-unit of it, e.g. "Stanford Medicine" for
 * "Stanford University") — not just a name that looks similar.
 */
export const COLLEGE_OPPORTUNITY_IDS: Record<string, string[]> = {
  "University of California, Berkeley": ["berkeley-precollege", "berkeley-robotics-academy", "berkeley-atdp", "bmun"],
  "University of California, Davis": ["ucdavis-ysp"],
  "San Jose State University": ["mosaic-journalism"],
  "Stanford University": [
    "simr",
    "stanford-precollegiate-si",
    "stanford-health-teen-volunteers",
    "snfi",
    "stanford-cnix",
    "stanford-ai4all",
    "stanford-shtem",
    "stanford-csi",
    "stanford-grips",
    "smysp",
  ],
  "University of Southern California": ["usc-unruh-hs-internship"],
  "Massachusetts Institute of Technology": ["rsi", "mit-primes", "bwsi", "mit-think"],
  "Georgetown University": ["georgetown-law-academy"],
  "Johns Hopkins University": ["jhu-cty"],
  "Boston University": ["promys"],
  "Georgia Institute of Technology": ["gtri-hs-summer-internship"],
  "University of Iowa": ["iowa-young-writers"],
};

/**
 * Names Pathfind stored in `profiles.dream_colleges` before the directory existed, mapped to the
 * canonical key above. Kept so saved paths keep showing their college-run programs without a
 * data migration; the full alias list lives in the generated directory.
 */
export const LEGACY_COLLEGE_NAMES: Record<string, string> = {
  "UC Berkeley": "University of California, Berkeley",
  "UC Davis": "University of California, Davis",
  USC: "University of Southern California",
  MIT: "Massachusetts Institute of Technology",
  "Georgia Tech": "Georgia Institute of Technology",
};
