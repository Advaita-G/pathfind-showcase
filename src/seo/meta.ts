import type { Opportunity } from "../data/types";
import { ALL_CATEGORIES, type Category } from "./categories";
import { GUIDES, type Guide } from "./guides";
import { OPPORTUNITIES } from "../data/opportunities";
import { DEMO_PATHFIND_IDEAS, type PathfindIdea } from "../data/pathfindIdeas";
import { formatDeadline } from "../lib/formatDeadline";

const SITE_URL = "https://www.getpathfind.com";
const BRAND_SUFFIX = " | Pathfind";
const MAX_DESCRIPTION = 158;
/** Roughly what a search result shows before truncating. */
const MAX_TITLE = 70;
/**
 * Display budget: past ~60 characters Google elides the tail, and the tail is where the
 * organization name lives. Titles that fit this keep the brand suffix; longer ones are
 * rebuilt so the words a student searched for come first.
 */
const FULL_TITLE_MAX = 60;
/**
 * The brand adds disambiguation only while the whole tag still fits a search result;
 * past this budget the brand is the first thing to go, not the audience phrase.
 */
const BRAND_FITS = 58;

export interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  robotsNoindex?: boolean;
}

export function siteUrl(path: string): string {
  return path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`;
}

/**
 * Adds the brand to a title only while the whole tag still fits a search result — a
 * truncated "...| Pathf" helps nobody, and long category names carry their own meaning.
 */
function withBrand(base: string): string {
  return base.length + BRAND_SUFFIX.length <= BRAND_FITS ? `${base}${BRAND_SUFFIX}` : base;
}

/** Trims to a whole word so a description never ends mid-word. */
function clip(text: string): string {
  if (text.length <= MAX_DESCRIPTION) return text;
  const slice = text.slice(0, MAX_DESCRIPTION + 1);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > 40 ? slice.slice(0, lastSpace) : text.slice(0, MAX_DESCRIPTION);
  return cut.replace(/[\s,;:.—-]+$/, "");
}

const TYPE_NOUNS: Record<Opportunity["type"], string> = {
  Program: "program",
  Internship: "internship",
  Research: "research program",
  Competition: "competition",
};

const LOCATION_PHRASES: Record<Opportunity["location"], string> = {
  "Bay Area": "based in the Bay Area",
  Remote: "online",
  "In-Person": "in person",
};

/**
 * The organization earns its space only when it does real work: disambiguating two
 * listings that share a name, or when the org name *is* the disambiguating part of the
 * query ("Kaiser volunteer program"). Otherwise the program name leads alone and the
 * org lives in the description — past ~60 characters the tail of a title is elided in
 * search results anyway, so a squeezed "… — Long Organization Name | Pathf" helps nobody.
 */
export function opportunityTitle(o: Opportunity): string {
  // Two listings share the program name: the org is doing disambiguation work.
  const isUniqueTitle = OPPORTUNITIES.filter((other) => other.title === o.title).length === 1;
  if (!isUniqueTitle) return withBrand(`${o.title} — ${o.org}`);

  // The program name alone fits the display budget with the brand.
  if (o.title.length + BRAND_SUFFIX.length <= FULL_TITLE_MAX) return `${o.title}${BRAND_SUFFIX}`;

  // Long program name: drop the brand before dropping meaning.
  return o.title.slice(0, MAX_TITLE).trimEnd().replace(/[\s—-]+$/, "");
}

export function opportunityMeta(o: Opportunity): PageMeta {
  const gradeRange = o.minGrade === o.maxGrade ? `grade ${o.minGrade}` : `grades ${o.minGrade}-${o.maxGrade}`;
  const deadlinePart = o.deadline
    ? `Deadline ${formatDeadline(o.deadline)}${o.deadlineConfirmed === false ? " (estimated)" : ""}.`
    : "Rolling admission, open year-round.";
  const noun = TYPE_NOUNS[o.type];
  return {
    title: opportunityTitle(o),
    description: clip(
      `${o.title}: ${/^[aeiou]/.test(noun) ? "an" : "a"} ${noun} from ${o.org} for ${gradeRange}, ${
        LOCATION_PHRASES[o.location]
      }. ${o.free ? "Tuition-free" : "Paid"}. ${deadlinePart}`,
    ),
    canonical: siteUrl(`/opportunities/${o.id}`),
  };
}

export function categoryMeta(category: Category, count: number): PageMeta {
  // Descriptions lead with the category's own search language rather than a sentence
  // lifted from the intro: the count and subject together make each one unique, and the
  // terms a student typed are actually in the snippet.
  return {
    title: categoryTitle(category),
    description: clip(category.buildDescription(count)),
    canonical: siteUrl(category.path),
  };
}

export function guideMeta(guide: Guide, count: number): PageMeta {
  return {
    title: withBrand(guide.title),
    description: clip(
      `${guide.title}: ${count} verified options from Pathfind's database, with real deadlines and eligibility, plus what to look for before you apply.`,
    ),
    canonical: siteUrl(guide.path),
  };
}

/**
 * "X Opportunities for High School Students" runs past the ~60 characters a search
 * result displays for longer subject names, and the tail it elides is the audience
 * phrase — the words that make the page match "psychology programs for high school
 * students". Those five categories drop the brand instead: the subject + audience
 * phrase stays intact, and the org carrying the query is the page itself, not Pathfind.
 */
function categoryTitle(category: Category): string {
  // Interest pages share the template "X Opportunities for High School Students"; for
  // long subject names that reads as two competing audience phrases, and the shorter
  // form keeps the full phrase inside the display budget with the brand attached.
  const templated = " Opportunities for High School Students";
  if (category.kind === "interest" && category.title.endsWith(templated)) {
    const subject = category.title.slice(0, -templated.length);
    const shortened = `${subject} for High School Students`;
    if (shortened.length + BRAND_SUFFIX.length <= BRAND_FITS) return `${shortened}${BRAND_SUFFIX}`;
    return shortened;
  }
  return withBrand(category.title);
}

export function hubMeta(count: number): PageMeta {
  return {
    title: withBrand("All Verified Opportunities for High School Students"),
    description: `Browse all ${count} verified research programs, internships, competitions, and summer programs on Pathfind — every listing checked, every deadline tracked.`.slice(
      0,
      MAX_DESCRIPTION,
    ),
    canonical: siteUrl("/opportunities"),
  };
}

export function guidesIndexMeta(): PageMeta {
  return {
    title: withBrand("Guides for High School Students"),
    description:
      "Practical guides to finding research programs, summer programs, and competitions as a high schooler — pulled from Pathfind's verified opportunity database.",
    canonical: siteUrl("/guides"),
  };
}

/**
 * The homepage carries the brand query. Its title states what Pathfind is ("verified"), and the
 * description names the opportunity types students actually search for.
 */
export function homeMeta(): PageMeta {
  return {
    // The brand leads here, and it carries its own "| Pathfind" — no suffix needed.
    title: "Pathfind — Verified Opportunities for High School Students",
    description:
      "Pathfind helps high school students discover verified internships, research programs, competitions, summer programs, and volunteering.",
    canonical: siteUrl("/"),
  };
}

export function notFoundMeta(): PageMeta {
  return {
    title: withBrand("Page Not Found"),
    description:
      "This page doesn't exist. Browse verified research programs, internships, and competitions for high schoolers on Pathfind instead.",
    canonical: siteUrl("/404"),
    robotsNoindex: true,
  };
}

/**
 * /profile is a private app page: prerendered only so a direct visit or refresh serves
 * real HTML instead of a 404, and permanently excluded from search results and sitemap.
 */
export function profileMeta(): PageMeta {
  return {
    title: withBrand("Your Profile"),
    description:
      "Your private Pathfind profile: what Pathfind knows about you and what it uses to personalize your path. Sign in to view it.",
    canonical: siteUrl("/profile"),
    robotsNoindex: true,
  };
}

export function ideaMeta(idea: PathfindIdea): PageMeta {
  return {
    title: withBrand(idea.title),
    description: clip(`${idea.summary} A Pathfind idea, not a verified program.`),
    canonical: siteUrl(`/ideas/${idea.id}`),
    robotsNoindex: true,
  };
}

export function plansMeta(): PageMeta {
  return {
    title: withBrand("Your Plans"),
    description:
      "Your private Pathfind plans: step-by-step checklists, back-planned dates, and progress for the opportunities you chose. Sign in to sync them.",
    canonical: siteUrl("/plans"),
    robotsNoindex: true,
  };
}

export function sharedPathMeta(): PageMeta {
  return {
    title: withBrand("Shared Path"),
    description:
      "A read-only view of a student's Pathfind opportunities and progress, shared by link. The student can turn this link off at any time.",
    canonical: siteUrl("/shared"),
    robotsNoindex: true,
  };
}

export function resolveRouteMeta(routePath: string): PageMeta {
  if (routePath === "/") return homeMeta();
  if (routePath === "/opportunities") return hubMeta(OPPORTUNITIES.length);
  if (routePath === "/guides") return guidesIndexMeta();

  const opportunityMatch = routePath.match(/^\/opportunities\/(.+)$/);
  if (opportunityMatch) {
    const opportunity = OPPORTUNITIES.find((o) => o.id === opportunityMatch[1]);
    if (opportunity) return opportunityMeta(opportunity);
  }

  const category = ALL_CATEGORIES.find((c) => c.path === routePath);
  if (category) return categoryMeta(category, OPPORTUNITIES.filter(category.predicate).length);

  const guide = GUIDES.find((g) => g.path === routePath);
  if (guide) return guideMeta(guide, OPPORTUNITIES.filter(guide.predicate).length);

  const ideaMatch = routePath.match(/^\/ideas\/(.+)$/);
  if (ideaMatch) {
    const idea = DEMO_PATHFIND_IDEAS.find((i) => i.id === ideaMatch[1]);
    if (idea) return ideaMeta(idea);
  }

  if (routePath === "/profile") return profileMeta();
  if (routePath === "/plans") return plansMeta();
  if (routePath === "/shared") return sharedPathMeta();

  return notFoundMeta();
}
