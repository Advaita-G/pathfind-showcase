/**
 * Rules for bringing new opportunity records into Pathfind's verified catalog.
 *
 * This module is plain JavaScript on purpose: the sync CLI (`scripts/sync-opportunities.mjs`) runs
 * it under bare Node, and the vitest suite (`scripts/opportunities-imported.test.mjs`) imports the
 * same file, so there is exactly one definition of what counts as a valid, non-duplicate record.
 *
 * The rules encode the product's data guarantees:
 * - A record is only valid if it names a real organization and links to that organization's own
 *   page. Aggregator links are rejected rather than silently imported.
 * - Unknown facts are dropped, never defaulted. Nothing here invents a deadline, a cost, or an
 *   eligibility range.
 * - Deduplication is by official URL first, then by organization + title, then by a loose title
 *   key, so the same program listed under two different phrasings lands as one record.
 */
import { readFileSync } from "node:fs";

export const OPPORTUNITY_TYPES = ["Program", "Internship", "Research", "Competition"];
export const LOCATIONS = ["Bay Area", "Remote", "In-Person"];
export const INTEREST_IDS = [
  "cs",
  "ai",
  "math",
  "physics",
  "chemistry",
  "biology",
  "environmental",
  "engineering",
  "finance",
  "entrepreneurship",
  "writing",
  "arts",
  "law",
  "psychology",
  "debate",
  "service",
];

/**
 * The canonical tag vocabulary, read from `src/data/tags.ts` so there is one list. A feed record may
 * only carry tags from it.
 */
export const CANONICAL_TAGS = (() => {
  const source = readFileSync(new URL("../../src/data/tags.ts", import.meta.url), "utf8");
  const block = source.match(/export const CANONICAL_TAGS = \[([\s\S]*?)\] as const/)?.[1] ?? "";
  return [...block.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
})();

const PARTICIPATION_TYPES = ["individual", "team", "club", "school", "nomination", "organization", "mixed"];
const VERIFIED_VALUES = [true, false, "unknown"];

/** Hosts that aggregate other people's programs; a record pointing here is not a primary source. */
const AGGREGATOR_HOSTS = [
  "reddit.com",
  "quora.com",
  "scholarships.com",
  "fastweb.com",
  "niche.com",
  "unigo.com",
  "collegevine.com",
  "pinterest.com",
  "medium.com",
];

export function normalizeText(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

/** Comparable form of a URL: no protocol, no "www.", no trailing slash, lowercase host + path. */
export function normalizeUrl(value) {
  const trimmed = normalizeText(value);
  if (!trimmed) return "";
  return trimmed
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

/** Words that do not tell two programs apart ("Summer Program" vs "Program"). */
const TITLE_NOISE = new Set([
  "the", "a", "an", "of", "for", "and", "in", "at", "to", "program", "programs", "summer", "high",
  "school", "student", "students", "annual", "national", "usa", "us",
]);

/**
 * Loose identity of a title: lowercase words minus punctuation and filler, sorted. "The Summer
 * Science Program" and "Science Program (Summer)" share a key. Empty when too little is left to be
 * distinctive, so generic titles never collide.
 */
export function titleKey(title) {
  const words = normalizeText(title)
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(" ")
    .filter((word) => word && !TITLE_NOISE.has(word));
  const key = Array.from(new Set(words)).sort().join(" ");
  return words.length >= 2 && key.length >= 8 ? key : "";
}

function hostOf(url) {
  return normalizeUrl(url).split("/")[0] ?? "";
}

/**
 * The identity a record dedupes on. The official URL is authoritative; when a record has no URL
 * yet, organization + title is the fallback so the same program cannot be added twice by hand.
 */
export function recordKey(record) {
  const url = normalizeUrl(record?.link ?? record?.sourceUrl);
  if (url) return `url:${url}`;
  return `name:${normalizeText(record?.org).toLowerCase()}|${normalizeText(record?.title).toLowerCase()}`;
}

/**
 * Every key a record can collide on: its official URL, and its loose title on the same site. The
 * site is part of the title key because many universities run a "Summer Research Program".
 */
export function recordKeys(record) {
  const keys = [recordKey(record)];
  const title = titleKey(record?.title);
  const host = hostOf(record?.link ?? record?.sourceUrl ?? "");
  if (title && host) keys.push(`title:${host}|${title}`);
  return keys;
}

function isIsoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Everything that would make a record untrustworthy. Returns an array of human-readable reasons —
 * empty means the record is importable. A record is rejected rather than repaired whenever a
 * required fact is missing, because silently patching data is how fabricated records get in.
 */
export function validateRecord(record) {
  const issues = [];
  if (!record || typeof record !== "object") return ["record is not an object"];

  const title = normalizeText(record.title);
  const org = normalizeText(record.org);
  const description = normalizeText(record.description);
  const link = normalizeText(record.link);

  if (!title) issues.push("missing title");
  if (!org) issues.push("missing org");
  if (description.length < 40) issues.push("description is missing or too short to be verified");
  if (!link) {
    issues.push("missing official link");
  } else if (!/^https?:\/\//i.test(link)) {
    issues.push("link is not an absolute http(s) URL");
  } else if (AGGREGATOR_HOSTS.some((host) => hostOf(link) === host || hostOf(link).endsWith(`.${host}`))) {
    issues.push(`link points at an aggregator (${hostOf(link)}), not an official source`);
  }

  if (!OPPORTUNITY_TYPES.includes(record.type)) {
    issues.push(`type must be one of ${OPPORTUNITY_TYPES.join(", ")}`);
  }
  if (!LOCATIONS.includes(record.location)) {
    issues.push(`location must be one of ${LOCATIONS.join(", ")}`);
  }

  const interests = Array.isArray(record.interests) ? record.interests : [];
  if (interests.length === 0) issues.push("missing interests");
  const unknownInterests = interests.filter((interest) => !INTEREST_IDS.includes(interest));
  if (unknownInterests.length > 0) issues.push(`unknown interests: ${unknownInterests.join(", ")}`);

  const { minGrade, maxGrade } = record;
  if (!Number.isInteger(minGrade) || !Number.isInteger(maxGrade)) {
    issues.push("minGrade and maxGrade must be integers");
  } else if (minGrade < 8 || maxGrade > 12 || minGrade > maxGrade) {
    // 8 is allowed because some national programs officially include 8th graders, which still
    // covers every Pathfind user. Nothing may start after grade 12.
    issues.push("grade range must sit inside 8-12 with minGrade <= maxGrade");
  }

  if (record.deadline !== undefined && !isIsoDate(record.deadline)) {
    issues.push("deadline must be an ISO YYYY-MM-DD date");
  }
  if (record.applicationOpenDate !== undefined && !isIsoDate(record.applicationOpenDate)) {
    issues.push("applicationOpenDate must be an ISO YYYY-MM-DD date");
  }
  for (const field of ["minAge", "maxAge"]) {
    if (record[field] !== undefined && !Number.isInteger(record[field])) {
      issues.push(`${field} must be an integer`);
    }
  }
  if (record.tags !== undefined) {
    const unknownTags = Array.isArray(record.tags) ? record.tags.filter((tag) => !CANONICAL_TAGS.includes(tag)) : ["(not a list)"];
    if (unknownTags.length > 0) issues.push(`unknown tags: ${unknownTags.join(", ")}`);
  }
  if (record.participation !== undefined) {
    const p = record.participation;
    if (
      !p ||
      !PARTICIPATION_TYPES.includes(p.participationType) ||
      !["canJoinIndividually", "requiresTeam", "requiresClubOrSchool"].every((field) => VERIFIED_VALUES.includes(p[field]))
    ) {
      issues.push("participation must name a participationType and true/false/\"unknown\" join rules");
    }
  }
  if (record.deadlineConfirmed === true && record.deadline === undefined) {
    issues.push("deadlineConfirmed needs a deadline");
  }
  for (const field of ["free", "paid", "stipend", "financialAid", "recurring", "inactive", "verified"]) {
    if (record[field] !== undefined && typeof record[field] !== "boolean") {
      issues.push(`${field} must be a boolean`);
    }
  }

  return issues;
}

/**
 * Trims and de-duplicates a record without adding anything. Optional fields that are absent stay
 * absent; lists lose repeats. Research-only fields (`evidence`) are dropped here, so they never
 * reach the app bundle.
 */
export function normalizeRecord(record) {
  const normalized = {
    id: normalizeText(record.id).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    title: normalizeText(record.title),
    org: normalizeText(record.org),
    type: record.type,
    interests: Array.from(new Set(record.interests ?? [])),
    minGrade: record.minGrade,
    maxGrade: record.maxGrade,
    description: normalizeText(record.description),
    link: normalizeText(record.link),
    free: record.free === true,
    location: record.location,
  };

  for (const field of [
    "deadline",
    "deadlineConfirmed",
    "applicationOpenDate",
    "minAge",
    "maxAge",
    "city",
    "state",
    "country",
    "paid",
    "stipend",
    "financialAid",
    "sourceUrl",
    "sourceName",
    "lastChecked",
    "inactive",
    "recurring",
    "featured",
    "tags",
    "participation",
    "verified",
  ]) {
    if (record[field] !== undefined) normalized[field] = record[field];
  }

  return normalized;
}

/**
 * Splits a batch into importable records and the reasons the rest were rejected. `existingKeys`
 * are the keys already in the catalog, so a re-run never re-inserts a program.
 */
export function ingest(records, existingKeys = []) {
  const seen = new Set(existingKeys);
  const accepted = [];
  const duplicates = [];
  const rejected = [];

  for (const [index, record] of (records ?? []).entries()) {
    const label = `${normalizeText(record?.org)} — ${normalizeText(record?.title)}`.trim() ||
      `record #${index + 1}`;

    const issues = validateRecord(record);
    if (issues.length > 0) {
      rejected.push({ label, issues });
      continue;
    }

    const keys = recordKeys(record);
    const key = keys.find((candidate) => seen.has(candidate));
    if (key) {
      duplicates.push({ label, key });
      continue;
    }

    for (const candidate of keys) seen.add(candidate);
    accepted.push(normalizeRecord(record));
  }

  return { accepted, duplicates, rejected };
}

/** The report format printed by the CLI. */
export function formatReport({ accepted, duplicates, rejected }, source) {
  const lines = [
    `Source: ${source}`,
    `Accepted: ${accepted.length}`,
    `Duplicates skipped: ${duplicates.length}`,
    `Rejected: ${rejected.length}`,
  ];
  for (const duplicate of duplicates) lines.push(`  duplicate: ${duplicate.label} (${duplicate.key})`);
  for (const rejection of rejected) lines.push(`  rejected: ${rejection.label} — ${rejection.issues.join("; ")}`);
  return lines.join("\n");
}
