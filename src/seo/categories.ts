import { slugify } from "../lib/slugify";
import {
  GRADES,
  INTERESTS,
  LOCATIONS,
  type Interest,
  type Location,
  type Opportunity,
} from "../data/types";

export interface Category {
  path: string;
  title: string;
  shortLabel: string;
  kind: "type" | "free" | "grade" | "interest" | "location" | "group";
  predicate: (opportunity: Opportunity) => boolean;
  buildDescription: (count: number) => string;
  /**
   * Short editorial introduction shown under the H1. Only set this where there is
   * something genuinely useful to say about the category — an empty intro is better
   * than a paragraph of padded keywords.
   */
  intro?: string[];
  /**
   * Paths this category points down into (a topic hub → its subject pages). The
   * reverse direction is derived automatically, so linking here also earns a
   * back-link from the child page.
   */
  relatedPaths?: string[];
  /**
   * Declares that this hub curates the same pool as the named category on purpose —
   * same verified opportunities, different search intent and framing (e.g.
   * "volunteering" vs Pathfind's taxonomy label). Lets the guard tests require a
   * strict superset everywhere else while still allowing this one honest exception.
   */
  synonymOf?: string;
}

const TYPE_CATEGORIES: Category[] = [
  {
    path: "/research-programs",
    title: "Research Programs for High School Students",
    shortLabel: "Research Programs",
    kind: "type",
    predicate: (o) => o.type === "Research",
    buildDescription: (n) =>
      `Browse ${n} verified research programs for high schoolers, with real deadlines, cost, and grade eligibility for each one.`,
    intro: [
      "Research programs let you work on a real question with real researchers — usually at a university, hospital, or lab — instead of a classroom project where the answer is already known. Most are summer programs, and most admit students who have never done research before.",
      "They also tend to be the most selective listings on Pathfind, so applying to a few at different competitiveness levels works better than pinning everything on one famous program. Check the grade range on each one: several open only to juniors and seniors.",
    ],
  },
  {
    path: "/internships",
    title: "Internships for High School Students",
    shortLabel: "Internships",
    kind: "type",
    predicate: (o) => o.type === "Internship",
    buildDescription: (n) =>
      `Browse ${n} verified internships for high schoolers on Pathfind — real roles, real deadlines, no fabricated listings.`,
    intro: [
      "A high school internship is usually the same shape as an adult one: you apply, you get assigned real work, and someone supervises you. Paid openings are rare at this level, so read the cost field carefully — some \"internships\" are actually fee-based programs, and Pathfind labels those as paid rather than hiding it.",
      "Internships for high schoolers are less standardized than summer programs, which means deadlines vary a lot and a few are rolling. If a listing says rolling, applying earlier generally helps.",
    ],
  },
  {
    path: "/competitions",
    title: "Competitions for High School Students",
    shortLabel: "Competitions",
    kind: "type",
    predicate: (o) => o.type === "Competition",
    buildDescription: (n) =>
      `Browse ${n} verified academic competitions for high schoolers, from math to computer science, with real registration deadlines.`,
    intro: [
      "Competitions are one of the few opportunities that don't require an essay, a recommendation letter, or a resume to get started — you register and you compete. That makes them the most accessible way to build a real record early in high school, and also the easiest to underestimate: the strongest ones reward months of preparation, not a weekend.",
      "Some of these are open to anyone who signs up, while others select a small team or require qualifying through a school round. Eligibility differs enough that it's worth reading each competition's own page rather than assuming.",
    ],
  },
  {
    path: "/summer-programs",
    title: "Summer Programs for High School Students",
    shortLabel: "Summer Programs",
    kind: "type",
    predicate: (o) => o.type === "Program",
    buildDescription: (n) =>
      `Browse ${n} verified summer and pre-college programs for high schoolers, with real cost and deadline info for each one.`,
    intro: [
      "This is the widest category on Pathfind — structured programs that run in the summer or after school, from one-week intensives to multi-year research tracks. They range from free and selective to expensive and open-enrollment, and the price tells you less about quality than you'd expect.",
      "Two things decide whether a program is worth your summer: how you'll spend the hours, and whether it teaches you something you couldn't get from a free online course. Both answers are usually on the organization's own site — we link to it on every listing.",
    ],
  },
];

const FREE_CATEGORY: Category = {
  path: "/free-programs",
  title: "Free Programs for High School Students",
  shortLabel: "Free Programs",
  kind: "free",
  predicate: (o) => o.free === true,
  buildDescription: (n) =>
    `Browse ${n} verified tuition-free programs for high schoolers — no cost to participate, though some may still involve travel or housing.`,
  intro: [
    "Every opportunity on this page costs nothing to participate in. That's the program fee specifically — some free programs still expect you to cover travel, housing, or materials, so check the organization's own page before assuming a program is fully free.",
    "Cost is often the real filter on whether an opportunity is possible, not interest or qualifications. Several of the most selective research and STEM programs in the country charge no tuition at all, precisely so that money isn't what decides who attends.",
  ],
};

/**
 * Per-grade context, grounded in how the verified dataset actually distributes across
 * grades (which types dominate at 9 vs 11, where research/internship eligibility starts).
 * Deliberately qualitative — the live count is rendered by the lede, so no numbers here
 * that a dataset edit could silently falsify.
 */
const GRADE_INTROS: Record<number, string[]> = {
  9: [
    "Freshman year has more on it than most students expect — the catch is that the mix leans heavily toward programs and competitions. Only a small slice of research placements and internships admit 9th graders, because most organizations set their eligibility at 10th grade or later.",
    "That makes competitions the fairest starting point: no essays, no recommendations, and a score that's entirely yours. Pick one or two programs that genuinely interest you, and treat this year as the low-stakes year to discover what you actually enjoy.",
  ],
  10: [
    "Sophomore year opens the list up noticeably: more internships accept 10th graders, and a handful of research programs do too. The most selective summer research programs still mostly wait for juniors — that's eligibility, not a judgment.",
    "It's a good year to go deeper instead of wider. If a competition or subject clicked last year, look for the next level of it; depth is easier to explain in an application than a long list of one-week programs.",
  ],
  11: [
    "Junior year has the widest list of any grade — most of Pathfind's research programs and internships concentrate their eligibility here, and essay-and-recommendation programs become realistic options.",
    "The trade-off is time. Junior-year deadlines arrive alongside the busiest school year, so it's worth sorting by deadline early and choosing a few applications to do well rather than many to do late.",
  ],
  12: [
    "Senior year is not the wind-down it's assumed to be. Competitions and programs still make up most of the list, several opportunities are designed for students about to graduate, and a few research placements admit seniors.",
    "The practical difference is your calendar: many deadlines land during application season. Single-sitting competitions and shorter programs fit a busy fall better than semester-length commitments — and applying is still worth it.",
  ],
};

const GRADE_CATEGORIES: Category[] = GRADES.map((grade) => ({
  path: `/grades/${grade}`,
  title: `Opportunities for Grade ${grade} Students`,
  shortLabel: `Grade ${grade}`,
  kind: "grade" as const,
  predicate: (o: Opportunity) => o.minGrade <= grade && grade <= o.maxGrade,
  buildDescription: (n: number) =>
    `Browse ${n} verified opportunities open to grade ${grade} students — research programs, internships, competitions, and summer programs all in one place.`,
  intro: GRADE_INTROS[grade],
}));

const INTEREST_CATEGORIES: Category[] = INTERESTS.map((interest) => ({
  path: `/interests/${slugify(interest.label)}`,
  title: `${interest.label} Opportunities for High School Students`,
  shortLabel: interest.label,
  kind: "interest" as const,
  predicate: (o: Opportunity) => o.interests.includes(interest.id),
  buildDescription: (n: number) =>
    `Browse ${n} verified ${interest.label} opportunities for high schoolers, matched by interest with real deadlines and eligibility.`,
}));

const LOCATION_DESCRIPTIONS: Record<Location, (count: number) => string> = {
  "Bay Area": (n) =>
    `Browse ${n} verified Bay Area opportunities for high schoolers, from in-person programs to local competitions.`,
  Remote: (n) =>
    `Browse ${n} verified remote opportunities for high schoolers — programs, competitions, and internships you can do from anywhere.`,
  "In-Person": (n) =>
    `Browse ${n} verified in-person opportunities for high schoolers across research programs, internships, and more.`,
};

const LOCATION_CATEGORIES: Category[] = LOCATIONS.map((location) => ({
  path: `/locations/${slugify(location)}`,
  title: `${location} Opportunities for High School Students`,
  shortLabel: location,
  kind: "location" as const,
  predicate: (o: Opportunity) => o.location === location,
  buildDescription: LOCATION_DESCRIPTIONS[location],
}));

/**
 * Broader topic hubs. These deliberately group several interests rather than mirroring
 * one, so they add a page that doesn't already exist as an interest category — and they
 * point down into those interest pages, which keeps the internal-link graph connected.
 */
const STEM_INTERESTS: Interest[] = [
  "cs",
  "ai",
  "math",
  "physics",
  "chemistry",
  "biology",
  "environmental",
  "engineering",
];

const SCIENCE_INTERESTS: Interest[] = ["biology", "chemistry", "physics", "environmental"];

const GROUP_CATEGORIES: Category[] = [
  {
    path: "/stem",
    title: "STEM Opportunities for High School Students",
    shortLabel: "STEM",
    kind: "group",
    predicate: (o) => o.interests.some((interest) => STEM_INTERESTS.includes(interest)),
    buildDescription: (n) =>
      `Browse ${n} verified STEM opportunities for high schoolers — research programs, internships, competitions, and summer programs in science, math, engineering, and technology.`,
    intro: [
      "STEM covers a lot of ground, and the opportunities inside it don't behave the same way. A math competition rewards practice and has no application; a research program is selective and asks for essays and recommendations; a summer engineering program sits somewhere between the two.",
      "Because of that, this page is a starting point rather than a shortlist. Pick the subject you'd actually spend a free Saturday on, then look at the specific list — computer science, biology, math, physics, engineering, and the rest each have their own page with far fewer, better-matched options.",
    ],
    relatedPaths: [
      "/science",
      "/interests/computer-science",
      "/interests/data-science-ai",
      "/interests/math",
      "/interests/biology-medicine",
      "/interests/physics-astronomy",
      "/interests/chemistry",
      "/interests/environmental-science",
      "/interests/engineering-robotics",
    ],
  },
  {
    path: "/business",
    title: "Business Programs for High School Students",
    shortLabel: "Business",
    kind: "group",
    predicate: (o) => o.interests.includes("finance") || o.interests.includes("entrepreneurship"),
    buildDescription: (n) =>
      `Browse ${n} verified business, finance, and entrepreneurship opportunities for high schoolers — competitions, programs, and internships with real deadlines.`,
    intro: [
      "Business opportunities for high schoolers are mostly hands-on: case competitions, investment challenges, pitch contests, and chapter-run programs where you actually run something rather than study it.",
      "That makes them unusually friendly to students with no business background — several of the competitions here are open to anyone who registers, and the free ones cost nothing but the time you put in.",
    ],
    relatedPaths: ["/interests/finance-investing", "/interests/entrepreneurship"],
  },
  {
    path: "/science",
    title: "Science Opportunities for High School Students",
    shortLabel: "Science",
    kind: "group",
    predicate: (o) => o.interests.some((interest) => SCIENCE_INTERESTS.includes(interest)),
    buildDescription: (n) =>
      `Browse ${n} verified science opportunities for high schoolers across biology, chemistry, physics, and environmental science — with real deadlines and eligibility.`,
    intro: [
      "Science opportunities split into exam-style contests, hands-on research placements, and structured programs in fields like biology, chemistry, physics, and environmental science. The right choice depends less on the subject than on how you like to work: fast problem sets, months on one question, or a taught course with a mentor.",
      "Each of those subjects also has its own page on Pathfind with a shorter, better-matched list — the subject pages below are the place to go once you know whether you're a lab person, a field person, or a competition person.",
    ],
    relatedPaths: [
      "/interests/biology-medicine",
      "/interests/chemistry",
      "/interests/physics-astronomy",
      "/interests/environmental-science",
    ],
  },
  {
    // The service interest already has an auto-generated interest page; this hub exists
    // because "volunteering" is the word students actually search, and the two pages are
    // deliberately framed for different queries (see the distinct title below).
    path: "/volunteering",
    title: "Volunteering & Community Service for High School Students",
    shortLabel: "Volunteering",
    kind: "group",
    predicate: (o) => o.interests.includes("service"),
    buildDescription: (n) =>
      `Browse ${n} verified volunteering and community-service opportunities for high schoolers — youth programs, civic roles, and service organizations with real commitments.`,
    intro: [
      "Most students meet community service through a school requirement, but the verified opportunities here go beyond logging hours: youth commissions and civic boards, hospital and science-education programs, youth media, and service organizations like Key Club and Interact that you can grow inside over several years.",
      "Some are year-round civic roles with real application processes, others are chapter-based clubs, and a few are summer placements — the format, eligibility, and time commitment are on each listing. What they share is that the work is real: you hold a role, not just attendance.",
    ],
    relatedPaths: ["/interests/social-impact-service"],
    synonymOf: "/interests/social-impact-service",
  },
];

export const ALL_CATEGORIES: Category[] = [
  ...TYPE_CATEGORIES,
  FREE_CATEGORY,
  ...GROUP_CATEGORIES,
  ...GRADE_CATEGORIES,
  ...INTEREST_CATEGORIES,
  ...LOCATION_CATEGORIES,
];

export function findCategoryByPath(path: string): Category | undefined {
  return ALL_CATEGORIES.find((category) => category.path === path);
}
