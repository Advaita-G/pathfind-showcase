import type { CanonicalTag } from "./tags";

export type Interest =
  | "cs"
  | "ai"
  | "math"
  | "physics"
  | "chemistry"
  | "biology"
  | "environmental"
  | "engineering"
  | "finance"
  | "entrepreneurship"
  | "writing"
  | "arts"
  | "law"
  | "psychology"
  | "debate"
  | "service";

export const OPPORTUNITY_TYPES = ["Program", "Internship", "Research", "Competition"] as const;
export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number];

export const LOCATIONS = ["Bay Area", "Remote", "In-Person"] as const;
export type Location = (typeof LOCATIONS)[number];

export const SORTS = ["deadline", "type", "grade"] as const;
export type SortBy = (typeof SORTS)[number];

export type ParticipationType =
  | "individual"
  | "team"
  | "club"
  | "school"
  | "nomination"
  | "organization"
  | "mixed"
  | "unknown";

/** A fact we either verified as true/false, or don't yet have verified — never guessed. */
export type Verified<T> = T | "unknown";

/**
 * How a student actually joins — as opposed to whether they're eligible. Some verified
 * opportunities (a school Mock Trial team, a DECA chapter) cannot be joined by applying
 * individually, and Pathfind must say so rather than implying every listing is a direct
 * apply-yourself program.
 *
 * Every field is independently "unknown" until verified against the program's own official
 * information — never inferred from the opportunity's name or category. Omit `participation`
 * entirely (or leave a field out) when nothing has been verified yet; the UI already renders
 * "Participation requirements not yet verified." for that case.
 */
export interface ParticipationInfo {
  participationType: ParticipationType;
  canJoinIndividually: Verified<boolean>;
  requiresTeam: Verified<boolean>;
  requiresClubOrSchool: Verified<boolean>;
  /** Short verified explanation, e.g. "Join through a school Mock Trial team." */
  howToJoin?: string;
  /** Official team/chapter directory or finder tool, only when the source itself provides one. */
  teamFinderUrl?: string;
  /** Official "how to start a team/chapter" page, only when the source itself provides one. */
  startTeamUrl?: string;
}

/**
 * Where a program sits in its annual cycle. Computed from `deadline` by `getOpportunityStatus`
 * rather than stored, so a record never goes stale simply because time passed.
 */
export type OpportunityLifecycleStatus =
  | "OPEN"
  | "UPCOMING"
  | "RECURRING"
  | "DEADLINE_PASSED"
  | "UNKNOWN"
  | "INACTIVE";

export interface Opportunity {
  id: string;
  title: string;
  org: string;
  type: OpportunityType;
  interests: Interest[];
  minGrade: number;
  maxGrade: number;
  description: string;
  link: string;
  /** ISO date (YYYY-MM-DD). Absent means rolling/ongoing admission (e.g. join a school chapter). */
  deadline?: string;
  /**
   * Many deadlines shift a little year to year and next cycle's exact date
   * isn't published yet — false marks a best estimate from the prior cycle's pattern.
   */
  deadlineConfirmed?: boolean;
  /** No cost to participate (may still require covering optional housing/travel). */
  free: boolean;
  location: Location;
  /** Shown on the landing view before a student picks any filters. */
  featured?: boolean;
  /** Absent means participation requirements have not been verified yet. */
  participation?: ParticipationInfo;

  /*
   * The fields below are all optional and must stay that way: each is only filled in when the
   * program's own official information states it. An unknown value is left off entirely rather
   * than guessed, so `undefined` means "not verified", never "false".
   */

  /**
   * Canonical tags (see `data/tags.ts`). Only needed when the record's own wording under-tags it;
   * otherwise tags are derived from the title, org, description, and interests at read time.
   */
  tags?: CanonicalTag[];
  /** ISO date (YYYY-MM-DD) applications open. Only when the official source publishes one. */
  applicationOpenDate?: string;
  /** Minimum age the program states, when it states one. */
  minAge?: number;
  /** Maximum age the program states, when it states one. */
  maxAge?: number;
  /** City of the program, when it is tied to one place. */
  city?: string;
  /** Two-letter state code, when the program is tied to one place. */
  state?: string;
  /** Country of the program site, when it is tied to one place. */
  country?: string;
  /** Only set when the program's own materials say participants are paid. */
  paid?: boolean;
  /** Only set when the program's own materials state a stipend. */
  stipend?: boolean;
  /** Only set when the program's own materials state need-based aid is offered. */
  financialAid?: boolean;
  /** Official program page used for verification. Defaults to `link` when omitted. */
  sourceUrl?: string;
  /** Where the record came from, e.g. "Official program website". */
  sourceName?: string;
  /** ISO date this record was last checked against its official source. */
  lastChecked?: string;
  /**
   * True when `npm run verify:opportunities` found every eligibility/cost/deadline quote on the
   * official page on `lastChecked`. Only the import pipeline sets it.
   */
  verified?: boolean;
  /**
   * Set only when the source states the program has ended or been discontinued. Inactive records
   * are kept for reference but never recommended as a current opportunity.
   */
  inactive?: boolean;
  /**
   * Set when the program runs on a known annual cycle, so a passed deadline should read as
   * "expected to reopen next cycle" instead of looking open.
   */
  recurring?: boolean;
}

export type InterestGroup = "STEM & Tech" | "Business" | "Humanities & Arts" | "Community & Leadership";

/** Re-exported here so opportunity records can type their tags without a second import. */
export type { CanonicalTag };

export const INTERESTS: { id: Interest; label: string; group: InterestGroup }[] = [
  { id: "cs", label: "Computer Science", group: "STEM & Tech" },
  { id: "ai", label: "Data Science & AI", group: "STEM & Tech" },
  { id: "math", label: "Math", group: "STEM & Tech" },
  { id: "physics", label: "Physics & Astronomy", group: "STEM & Tech" },
  { id: "chemistry", label: "Chemistry", group: "STEM & Tech" },
  { id: "biology", label: "Biology & Medicine", group: "STEM & Tech" },
  { id: "environmental", label: "Environmental Science", group: "STEM & Tech" },
  { id: "engineering", label: "Engineering & Robotics", group: "STEM & Tech" },
  { id: "finance", label: "Finance & Investing", group: "Business" },
  { id: "entrepreneurship", label: "Entrepreneurship", group: "Business" },
  { id: "writing", label: "Writing & Journalism", group: "Humanities & Arts" },
  { id: "arts", label: "Visual & Performing Arts", group: "Humanities & Arts" },
  { id: "law", label: "Law & Public Policy", group: "Humanities & Arts" },
  { id: "psychology", label: "Psychology & Neuroscience", group: "Humanities & Arts" },
  { id: "debate", label: "Debate & Public Speaking", group: "Community & Leadership" },
  { id: "service", label: "Social Impact & Service", group: "Community & Leadership" },
];

export const INTEREST_GROUPS: InterestGroup[] = [
  "STEM & Tech",
  "Business",
  "Humanities & Arts",
  "Community & Leadership",
];

export const GRADES = [9, 10, 11, 12] as const;

/**
 * Path goals, shared by Build My Path (step 03) and the profile drawer so both
 * always show identical, human-readable labels. Stored values are the ids.
 * `types` maps a goal to the opportunity types it surfaces in results (empty = none).
 */
export type PathGoal =
  | "research"
  | "internship"
  | "competition"
  | "build"
  | "teach"
  | "volunteer"
  | "academics"
  | "explore"
  | "decide";

export const GOALS: { id: PathGoal; label: string; types: OpportunityType[] }[] = [
  { id: "research", label: "Do research", types: ["Research"] },
  { id: "internship", label: "Get an internship", types: ["Internship"] },
  { id: "competition", label: "Enter a competition", types: ["Competition"] },
  { id: "build", label: "Build something", types: [] },
  { id: "teach", label: "Teach others", types: [] },
  { id: "volunteer", label: "Volunteer or create impact", types: [] },
  { id: "academics", label: "Strengthen academics", types: ["Program"] },
  { id: "explore", label: "Explore a field", types: [] },
  { id: "decide", label: "Help me decide", types: [] },
];

export type Skill =
  | "python"
  | "java"
  | "javascript"
  | "cpp"
  | "sql"
  | "web-dev"
  | "data"
  | "machine-learning"
  | "research"
  | "writing"
  | "speaking"
  | "design"
  | "video"
  | "marketing"
  | "leadership"
  | "beginner";

export const SKILLS: { id: Skill; label: string }[] = [
  { id: "python", label: "Python" },
  { id: "java", label: "Java" },
  { id: "javascript", label: "JavaScript" },
  { id: "cpp", label: "C/C++" },
  { id: "sql", label: "SQL" },
  { id: "web-dev", label: "Web dev" },
  { id: "data", label: "Data analysis" },
  { id: "machine-learning", label: "Machine learning" },
  { id: "research", label: "Research" },
  { id: "writing", label: "Writing" },
  { id: "speaking", label: "Public speaking" },
  { id: "design", label: "Design" },
  { id: "video", label: "Video editing" },
  { id: "marketing", label: "Marketing & social media" },
  { id: "leadership", label: "Leadership" },
  { id: "beginner", label: "I'm just starting" },
];

export type Cause =
  | "education"
  | "climate"
  | "health"
  | "accessibility"
  | "community"
  | "technology"
  | "sports"
  | "arts"
  | "social-impact";

export const CAUSES: { id: Cause; label: string }[] = [
  { id: "education", label: "Education" },
  { id: "climate", label: "Climate" },
  { id: "health", label: "Health" },
  { id: "accessibility", label: "Accessibility" },
  { id: "community", label: "Community" },
  { id: "technology", label: "Technology" },
  { id: "sports", label: "Sports" },
  { id: "arts", label: "Arts" },
  { id: "social-impact", label: "Social impact" },
];

export const TIME_COMMITMENTS = [
  "< 2 hrs/week",
  "2-5 hrs/week",
  "5-10 hrs/week",
  "10+ hrs/week",
] as const;
export type TimeCommitment = (typeof TIME_COMMITMENTS)[number];
