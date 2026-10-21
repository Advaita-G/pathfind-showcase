import type { Cause, Interest, Skill } from "./types";
import { LIBRARY_IDEAS } from "./pathfindIdeasLibrary";

/**
 * A PATHFIND IDEA is an original project/teaching/community concept suggested
 * to a student — it is NOT a verified external opportunity. It must never be
 * presented as university-affiliated, guaranteed, or backed by any
 * organization. See the "PATHFIND IDEA" badge wherever these render.
 *
 * Hand-written, deterministic set: the originals below plus the structured library.
 * A future server-side generator can replace this list without changing the
 * UI, as long as it returns the same shape.
 */
export interface PathfindIdea {
  id: string;
  title: string;
  /** One-sentence hook. */
  summary: string;
  /**
   * 2–3 sentences covering: what the student builds or does, who it serves
   * and how the output is used, and what makes the work substantive beyond
   * the roadmap steps. Must not repeat roadmap bullet text verbatim.
   */
  description: string;
  category: "build" | "teach" | "contribute" | "research" | "create";
  matchesInterests: Interest[];
  matchesCauses: Cause[];
  /**
   * Skills this idea is genuinely built around, beyond whatever's already implied by
   * `skillsRequired`/`skillsYouWillLearn` text. Optional — older entries rely on the
   * text-based skill match in matchPathfindIdeas.ts instead.
   */
  matchesSkills?: Skill[];
  difficulty: "beginner" | "intermediate" | "advanced";
  /** Human-readable weekly time, e.g. "3-4 hours". */
  weeklyHours: string;
  /** Lower bound in hours, used to respect a student's stated time budget. */
  minWeeklyHours: number;
  duration: string;
  cost: string;
  skillsRequired: string[];
  skillsYouWillLearn: string[];
  firstStep: string;
  roadmap: string[];
  deliverables: string[];
  potentialImpact: string;
  /** Ids into src/data/opportunities.ts — real programs that build the same skills. */
  relatedOpportunityIds: string[];

  /* Structured fields, filled in by the idea library (`pathfindIdeasLibrary.ts`). */

  /** The concrete problem the project tackles. */
  problem?: string;
  /** Who uses or benefits from the finished project. */
  whoItHelps?: string;
  /** Named tools, apps, or libraries. */
  tools?: string[];
  /** A real public dataset or the data the student collects. */
  dataSource?: string;
  teamSize?: "solo" | "team" | "either";
  setting?: "local" | "remote" | "either";
  stretchGoal?: string;
  /** What the finished project shows a mentor, program, or college. */
  portfolioValue?: string;
  /** Extra words a student might type ("volleyball", "quant") that this idea covers. */
  topics?: string[];
}

export const DEMO_PATHFIND_IDEAS: PathfindIdea[] = [
  {
    id: "ai-workshop-middle-school",
    title: "Beginner AI workshop for middle schoolers",
    summary:
      "Design and run a six-week intro AI workshop covering data, classifiers, and bias — ending in a student project.",
    description:
      "You'll create a complete curriculum — lesson plans, hands-on activities, and a final showcase — and deliver it yourself to a real group of younger students. The workshop serves 10–15 middle schoolers who may never have encountered AI in any structured way, giving them a concrete first experience with how data and algorithms actually work. What makes this substantive is that you own the entire experience from design through delivery, and the finished curriculum becomes a reusable resource others can run after you.",
    category: "teach",
    matchesInterests: ["cs", "ai"],
    matchesCauses: ["education"],
    difficulty: "intermediate",
    weeklyHours: "3-4 hours",
    minWeeklyHours: 3,
    duration: "8-10 weeks (prep + delivery)",
    cost: "Free",
    skillsRequired: ["Basic Python", "A rough sense of how ML models work"],
    skillsYouWillLearn: ["Curriculum design", "Teaching", "Explaining technical ideas simply"],
    firstStep: "Outline six sessions, each with one concept and one hands-on activity.",
    roadmap: [
      "Weeks 1-2: Draft the curriculum and learning goals for each session",
      "Weeks 3-4: Build the hands-on activities and example projects",
      "Week 5: Find a venue — a library, community center, or your own school",
      "Week 6: Recruit students and promote the workshop",
      "Weeks 7-12: Run the six sessions",
      "Week 13: Collect feedback and write up what worked",
    ],
    deliverables: [
      "A shareable curriculum guide",
      "A showcase of student projects",
      "A short reflection on what you'd change next time",
    ],
    potentialImpact: "Introduce 10-15 middle schoolers to AI concepts they might not otherwise encounter.",
    relatedOpportunityIds: ["kode-with-klossy", "girls-who-code-pathways", "inspirit-ai"],
  },
  {
    id: "air-quality-explorer",
    title: "Local air quality data explorer",
    summary:
      "Build a website that pulls public air-quality data and helps your community understand it.",
    description:
      "You'll build a live website that fetches real air quality readings from public APIs and presents them in a form local residents can actually interpret and act on. It serves community members — including families with respiratory conditions — who currently have no easy way to monitor what's in the air near them. The project is substantive because it ships real software connected to real data, requires you to solve genuine UX and data problems, and leaves a publicly accessible tool that keeps updating after you finish.",
    category: "build",
    matchesInterests: ["cs", "environmental"],
    matchesCauses: ["climate", "health", "technology"],
    difficulty: "intermediate",
    weeklyHours: "4-6 hours",
    minWeeklyHours: 4,
    duration: "6-8 weeks",
    cost: "Free",
    skillsRequired: ["HTML/CSS/JavaScript basics", "Comfort reading API documentation"],
    skillsYouWillLearn: ["Working with real public APIs", "Data visualization", "Deploying a website"],
    firstStep: "Pull one day of data from AirNow's public API and log it to the console.",
    roadmap: [
      "Week 1: Explore the AirNow / PurpleAir APIs and sketch the UI",
      "Week 2: Build basic data fetching and a simple table view",
      "Weeks 3-4: Add a map and let people filter by area",
      "Week 5: Add a historical trend chart",
      "Week 6: Add plain-language context for what the numbers mean",
      "Weeks 7-8: Deploy it, test it with a few real users, and write it up",
    ],
    deliverables: ["A live website with the source on GitHub", "A short write-up of what you learned"],
    potentialImpact: "Help people nearby understand local air quality and when to be careful outside.",
    relatedOpportunityIds: ["simr", "lbnl-einr", "chabot-galaxy-explorers"],
  },
  {
    id: "algebra-peer-tutoring",
    title: "Free algebra tutoring at your school",
    summary: "Start a weekly drop-in tutoring hour for underclassmen struggling with Algebra 1.",
    description:
      "You'll design and run weekly drop-in sessions, adapting what you cover each week based on the actual problems students bring in. It serves underclassmen at your school who cannot afford a tutor and need a consistent, low-pressure place to catch up rather than fall further behind. The work is substantive because it runs for a semester or longer, you build reusable reference materials from the real patterns you observe, and you take genuine responsibility for whether students show improvement.",
    category: "teach",
    matchesInterests: ["math"],
    matchesCauses: ["education", "community"],
    difficulty: "beginner",
    weeklyHours: "2-3 hours",
    minWeeklyHours: 2,
    duration: "One semester, ongoing after that",
    cost: "Free",
    skillsRequired: ["Solid Algebra 1 grades", "Patience explaining things more than once"],
    skillsYouWillLearn: ["Teaching", "Breaking problems into steps", "Running a recurring program"],
    firstStep: "Ask a math teacher for a classroom to use once a week and a way to reach struggling students.",
    roadmap: [
      "Week 1: Find a room, a weekly time slot, and a teacher sponsor",
      "Week 2: Make a simple sign-up sheet and announce it in classes",
      "Weeks 3-4: Run your first sessions and note which topics come up most",
      "Weeks 5-8: Build a short reference sheet for the most common problem types",
      "Ongoing: Keep the weekly hour going and recruit a co-tutor for coverage",
    ],
    deliverables: ["A running weekly tutoring hour", "A one-page reference sheet for common topics"],
    potentialImpact: "Give classmates a free, low-pressure place to catch up instead of falling behind.",
    relatedOpportunityIds: ["amc", "usamts", "mathcamp"],
  },
  {
    id: "creek-water-quality-monitoring",
    title: "Water quality monitoring for a local creek",
    summary:
      "Run monthly water tests on a nearby creek and publish the results for your community.",
    description:
      "You'll conduct monthly field measurements at a specific waterway using a consistent protocol you establish yourself, building a longitudinal dataset over at least one semester. The data serves your community and potentially environmental agencies that may lack granular local records for that stretch of water. What makes this substantive is that rigorous repetition and cross-referencing against county data turns your individual measurements into something genuinely useful to people working on local environmental quality.",
    category: "research",
    matchesInterests: ["environmental", "chemistry"],
    matchesCauses: ["climate", "community"],
    difficulty: "beginner",
    weeklyHours: "2-3 hours",
    minWeeklyHours: 2,
    duration: "One semester minimum",
    cost: "$20-50 for a basic test kit",
    skillsRequired: ["Basic chemistry", "Comfort with fieldwork outdoors"],
    skillsYouWillLearn: ["Field data collection", "Basic statistics", "Environmental monitoring methods"],
    firstStep: "Pick a testing site and a monthly schedule, then order a basic water test kit.",
    roadmap: [
      "Week 1-2: Choose a site and learn safe, consistent testing procedure",
      "Month 1-2: Take your first two rounds of measurements",
      "Month 3: Build a simple spreadsheet or chart to track trends",
      "Month 4: Compare against any public county data for the same waterway",
      "Ongoing: Publish a short update after each round of testing",
    ],
    deliverables: ["A running dataset of water quality measurements", "A short public summary of findings"],
    potentialImpact: "Build an early record that could flag pollution trends before they become a bigger problem.",
    relatedOpportunityIds: ["envirothon", "grassroots-ecology-youth-stewards", "marine-mammal-center-youth-crew"],
  },
  {
    id: "nonprofit-accessibility-audit",
    title: "Accessibility audit for a local nonprofit's website",
    summary:
      "Review a small nonprofit's website for accessibility issues and help them fix the easy ones.",
    description:
      "You'll apply real accessibility evaluation techniques — automated checks, keyboard testing, and screen reader evaluation — to a small nonprofit's actual live site, then fix some of the issues yourself. The work directly serves the organization and the people they serve who currently cannot use the site effectively due to barriers like missing alt text or insufficient contrast. What makes it substantive is that you diagnose and document real problems on a real website, produce a written report another developer could act on, and leave the site measurably more usable than you found it.",
    category: "contribute",
    matchesInterests: ["cs", "service"],
    matchesCauses: ["accessibility", "community", "technology"],
    difficulty: "intermediate",
    weeklyHours: "2-4 hours",
    minWeeklyHours: 2,
    duration: "3-4 weeks per organization",
    cost: "Free",
    skillsRequired: ["Basic HTML/CSS", "Willingness to learn accessibility guidelines"],
    skillsYouWillLearn: ["Web accessibility standards (WCAG)", "Auditing", "Working with a real client"],
    firstStep: "Pick one local nonprofit and run their site through a free accessibility checker.",
    roadmap: [
      "Week 1: Run automated checks and manually test with a keyboard and screen reader",
      "Week 2: Write up the issues in plain language, ranked by how much they matter",
      "Week 3: Offer to fix the simplest issues yourself, like missing alt text or contrast",
      "Week 4: Share a short before/after summary with the organization",
    ],
    deliverables: ["A written accessibility report", "A list of fixes made or recommended"],
    potentialImpact: "Make a small organization's site usable for more of the people it's trying to reach.",
    relatedOpportunityIds: ["hidden-genius-project", "project-pull", "genesys-works"],
  },
  {
    id: "community-issue-mini-doc",
    title: "Short documentary on a local issue",
    summary: "Report and edit a 5-10 minute video on something happening in your own community.",
    description:
      "You'll research a specific local issue by conducting real interviews, then shoot, edit, and release a 5–10 minute documentary for your community to watch. It serves local residents and anyone with a stake in the issue, giving a story real screen time it would otherwise never get. The project is substantive because it requires genuine journalism — finding sources, earning their trust, fact-checking your framing, and making real editorial decisions about how to tell a true story responsibly.",
    category: "create",
    matchesInterests: ["writing", "arts"],
    matchesCauses: ["community", "social-impact"],
    difficulty: "beginner",
    weeklyHours: "3-5 hours",
    minWeeklyHours: 3,
    duration: "6-8 weeks",
    cost: "Free (phone camera is enough to start)",
    skillsRequired: ["Curiosity", "Comfort asking people questions"],
    skillsYouWillLearn: ["Interviewing", "Video editing", "Telling a true story clearly"],
    firstStep: "Pick one specific local issue and list three people you could interview about it.",
    roadmap: [
      "Weeks 1-2: Research the topic and reach out to people to interview",
      "Weeks 3-4: Film interviews and any relevant footage",
      "Weeks 5-6: Write a rough script and edit a first cut",
      "Weeks 7-8: Get feedback, revise, and share it",
    ],
    deliverables: ["A finished short documentary", "A one-paragraph summary of what you learned reporting it"],
    potentialImpact: "Give a local story more visibility than it would otherwise get.",
    relatedOpportunityIds: ["yr-media", "mosaic-journalism", "youth-speaks"],
  },
  {
    id: "elementary-coding-club",
    title: "Free coding club at your local library",
    summary: "Run a weekly beginner coding club for elementary schoolers using free block-based tools.",
    description:
      "You'll plan and run recurring weekly sessions at your public library, teaching young children to build simple interactive projects using tools like Scratch. It serves elementary-age kids in your area who have no access to coding education outside school, giving them a consistent creative outlet and a trusted older mentor. The work is substantive because you manage a real ongoing program — not a one-time event — and develop session plans and reusable project templates that outlast any single run.",
    category: "teach",
    matchesInterests: ["cs"],
    matchesCauses: ["education", "community"],
    difficulty: "beginner",
    weeklyHours: "2-3 hours",
    minWeeklyHours: 2,
    duration: "One semester, ongoing after that",
    cost: "Free",
    skillsRequired: ["Comfort with Scratch or a similar block-based tool", "Patience with younger kids"],
    skillsYouWillLearn: ["Teaching young learners", "Session planning", "Running a recurring program"],
    firstStep: "Ask your local library's youth program coordinator about hosting a weekly session.",
    roadmap: [
      "Week 1: Confirm a room and weekly slot with the library",
      "Week 2: Plan your first four sessions using Scratch projects",
      "Weeks 3-6: Run sessions and adjust based on what kids struggle with",
      "Ongoing: Add a small showcase where kids present what they built",
    ],
    deliverables: ["A running weekly coding club", "A set of reusable beginner project templates"],
    potentialImpact: "Give younger kids in your area an early, low-pressure introduction to programming.",
    relatedOpportunityIds: ["girls-who-code-pathways", "exploratorium-explainer", "calacademy-cis"],
  },
  {
    id: "mental-health-peer-zine",
    title: "A peer-written mental health zine",
    summary: "Write, design, and distribute a small zine of student essays on mental health at your school.",
    description:
      "You'll solicit, sensitively edit, design, and distribute an original publication combining student writing with verified support resources. It serves peers at your school by making honest experiences visible while providing trustworthy places to turn for help. What makes this substantive is the responsibility involved: you must create a safe submission process, make careful editorial choices around vulnerable stories, distinguish peer expression from clinical advice, and ship both a printed and digital edition.",
    category: "create",
    matchesInterests: ["psychology", "writing", "arts"],
    matchesCauses: ["health", "social-impact"],
    difficulty: "beginner",
    weeklyHours: "2-3 hours",
    minWeeklyHours: 2,
    duration: "6 weeks",
    cost: "$20-40 for printing",
    skillsRequired: ["Writing", "Basic layout/design"],
    skillsYouWillLearn: ["Editing", "Publication design", "Handling sensitive topics responsibly"],
    firstStep: "Ask five classmates if they'd contribute a short piece, anonymously or not.",
    roadmap: [
      "Weeks 1-2: Collect submissions and a resource list for anyone who needs support",
      "Weeks 3-4: Edit pieces and lay out the zine",
      "Week 5: Print a small run",
      "Week 6: Distribute it at school and share a digital copy",
    ],
    deliverables: ["A printed and digital zine", "A shared list of real mental health resources"],
    potentialImpact: "Make it a little easier for students to feel less alone with what they're going through.",
    relatedOpportunityIds: ["youth-speaks", "scholastic-art-writing", "mosaic-journalism"],
  },
  {
    id: "science-evidence-atlas",
    title: "A visual atlas of one science question",
    summary:
      "Turn one question about space, health, chemistry, or the environment into a carefully sourced visual guide that a ninth grader can understand.",
    description:
      "You'll research one focused science question, trace every claim to a credible source, and translate the evidence into original diagrams and plain-language explanations. The finished atlas serves ninth graders or other first-time learners who need an accurate, approachable entry point they can read online or print. It is substantive because you must synthesize multiple sources, make defensible information-design choices, and validate the guide with real readers rather than simply summarizing what one article says.",
    category: "create",
    matchesInterests: ["physics", "chemistry", "biology", "environmental", "writing"],
    matchesCauses: ["education", "climate", "health"],
    difficulty: "beginner",
    weeklyHours: "1-2 hours",
    minWeeklyHours: 1,
    duration: "4 weeks",
    cost: "Free",
    skillsRequired: ["Curiosity", "Willingness to check sources"],
    skillsYouWillLearn: ["Research", "Scientific writing", "Information design"],
    firstStep: "Write one answerable question and collect three trustworthy sources that approach it from different angles.",
    roadmap: [
      "Week 1: Narrow the question and create a source log",
      "Week 2: Pull out the five facts a reader must understand first",
      "Week 3: Draft diagrams, captions, and a plain-language explanation",
      "Week 4: Ask two students to test it, revise confusing parts, and publish",
    ],
    deliverables: ["A digital or printable science atlas", "An annotated source list showing where each claim came from"],
    potentialImpact: "Give other students a clear, reliable starting point for a science topic that usually feels intimidating.",
    relatedOpportunityIds: [],
  },
  {
    id: "everyday-measurement-lab",
    title: "An everyday measurement lab",
    summary:
      "Design a small repeatable experiment around heat, motion, water, plants, or materials and publish the data—not just the conclusion.",
    description:
      "You'll turn an everyday observation into a controlled experiment, collect repeated measurements, analyze the full dataset, and publish instructions another student can follow. It serves other curious students and teachers by offering a transparent investigation they can reproduce, challenge, or extend. The project is substantive because you expose your methods, mistakes, raw data, and uncertainty — demonstrating scientific reasoning rather than producing a polished conclusion with no evidence trail.",
    category: "research",
    matchesInterests: ["math", "physics", "chemistry", "biology", "environmental", "engineering"],
    matchesCauses: ["climate", "health", "technology"],
    difficulty: "beginner",
    weeklyHours: "1-2 hours",
    minWeeklyHours: 1,
    duration: "5 weeks",
    cost: "$0-20, depending on materials",
    skillsRequired: ["Basic spreadsheet use", "Careful note-taking"],
    skillsYouWillLearn: ["Experimental design", "Data analysis", "Explaining uncertainty"],
    firstStep: "Choose one thing you can measure the same way at least ten times and write down what you expect to happen.",
    roadmap: [
      "Week 1: Define one variable, one comparison, and a consistent procedure",
      "Weeks 2-3: Run repeated measurements and record mistakes as well as results",
      "Week 4: Graph the data and look for alternative explanations",
      "Week 5: Write a short methods-and-findings report another student could reproduce",
    ],
    deliverables: ["A clean dataset and chart", "A reproducible experiment guide with limitations"],
    potentialImpact: "Show peers what real investigation looks like: a clear method, honest data, and room for uncertainty.",
    relatedOpportunityIds: [],
  },
  {
    id: "access-first-redesign",
    title: "Redesign an everyday tool for one overlooked user",
    summary:
      "Pick a school or household object, study where it fails someone, and prototype a more accessible version with simple materials or code.",
    description:
      "You'll partner with one person who encounters an accessibility barrier, study how an everyday tool fails them, and create a physical or digital prototype shaped by their feedback. The result serves that specific user first, while the documented case study can help others understand the broader design problem. What makes the work substantive is the repeated cycle of observation, prototyping, and testing with a real stakeholder — not guessing at a solution on someone else's behalf.",
    category: "build",
    matchesInterests: ["cs", "ai", "engineering", "physics", "service"],
    matchesCauses: ["accessibility", "technology", "community"],
    difficulty: "beginner",
    weeklyHours: "1-2 hours",
    minWeeklyHours: 1,
    duration: "5-6 weeks",
    cost: "$0-25 for prototype materials",
    skillsRequired: ["Empathy", "Comfort making rough prototypes"],
    skillsYouWillLearn: ["User research", "Engineering iteration", "Accessible design"],
    firstStep: "Interview one potential user about a tool or routine that creates unnecessary friction for them.",
    roadmap: [
      "Week 1: Observe the current experience and define the specific barrier",
      "Week 2: Sketch three approaches without choosing a favorite",
      "Weeks 3-4: Build the cheapest testable version",
      "Weeks 5-6: Test, document feedback, and revise one important detail",
    ],
    deliverables: ["A working physical or digital prototype", "A before-and-after case study grounded in user feedback"],
    potentialImpact: "Make one routine easier while learning to design with people rather than making assumptions about them.",
    relatedOpportunityIds: [],
  },
  {
    id: "one-question-data-story",
    title: "A one-question local data story",
    summary:
      "Use a small public dataset to answer one concrete question about money, climate, technology, or student life in your area.",
    description:
      "You'll find and clean a credible public dataset, use it to answer one sharply defined local question, and publish the result as a chart-led article or mini-site. It gives students, families, or neighbors a shared evidence base for discussing an issue that currently runs on anecdotes. The work is substantive because your readers can inspect the cleaned data and methods themselves, and because you must explain both what the numbers reveal and what they cannot prove.",
    category: "create",
    matchesInterests: ["cs", "ai", "math", "finance", "environmental", "psychology"],
    matchesCauses: ["climate", "health", "community", "technology"],
    difficulty: "beginner",
    weeklyHours: "1-2 hours",
    minWeeklyHours: 1,
    duration: "4-5 weeks",
    cost: "Free",
    skillsRequired: ["Basic spreadsheet use or willingness to learn"],
    skillsYouWillLearn: ["Data analysis", "Data visualization", "Evidence-based storytelling"],
    firstStep: "Write one question that can be answered with numbers, then find one public dataset with a clear source and date.",
    roadmap: [
      "Week 1: Inspect the columns, definitions, gaps, and limits of the dataset",
      "Week 2: Clean only the fields needed for your question",
      "Week 3: Create three possible charts and choose the clearest one",
      "Weeks 4-5: Add context, explain what the data cannot prove, and publish",
    ],
    deliverables: ["A chart-led article or mini-site", "A downloadable cleaned dataset and methods note"],
    potentialImpact: "Help people discuss a local question with shared evidence instead of guesses.",
    relatedOpportunityIds: [],
  },
  {
    id: "money-basics-field-guide",
    title: "A money basics field guide for first-job students",
    summary:
      "Create a no-hype guide to reading a pay stub, making a starter budget, comparing bank accounts, and spotting common financial traps.",
    description:
      "You'll turn real questions from students with first jobs into a concise, source-backed guide with worked examples, a sample budget, and clear warnings about common traps. It serves teenagers navigating paychecks and bank accounts for the first time, in a printable and digital format they can consult when an actual decision comes up. The project is substantive because every factual claim must be verified, every example must be tested for clarity with its intended readers, and the finished resource must be practical enough to use rather than merely informative.",
    category: "teach",
    matchesInterests: ["finance", "entrepreneurship", "math", "writing", "service"],
    matchesCauses: ["education", "community", "social-impact"],
    difficulty: "beginner",
    weeklyHours: "1-2 hours",
    minWeeklyHours: 1,
    duration: "5 weeks",
    cost: "Free",
    skillsRequired: ["Basic arithmetic", "Care with factual claims"],
    skillsYouWillLearn: ["Financial literacy", "Instructional writing", "Fact-checking"],
    firstStep: "Ask three students with part-time jobs which money topic confused them most when they started.",
    roadmap: [
      "Week 1: Choose four topics from real student questions",
      "Week 2: Research each topic using government or nonprofit sources",
      "Week 3: Draft examples using clearly fictional numbers and scenarios",
      "Week 4: Test the guide with students and mark every confusing phrase",
      "Week 5: Revise, add source links, and share a printable version",
    ],
    deliverables: ["A concise digital and printable field guide", "A source sheet and reusable sample budget"],
    potentialImpact: "Give students practical financial context before small misunderstandings become expensive mistakes.",
    relatedOpportunityIds: [],
  },
  {
    id: "seven-day-venture-test",
    title: "A seven-day micro-venture test",
    summary:
      "Test a tiny product or service with real people before spending weeks building it, then decide whether the idea deserves a second round.",
    description:
      "You'll identify one concrete problem, interview the people who experience it, and put the smallest credible version of a product or service in front of them for a real-world test. The test serves those potential users by exploring whether a modest solution would actually help, without asking them to validate a polished pitch. What makes it substantive is that you track behavior, costs, rejections, and surprises, then make an evidence-based stop, change, or continue decision rather than declaring success because you built something.",
    category: "build",
    matchesInterests: ["entrepreneurship", "finance", "arts", "cs"],
    matchesCauses: ["community", "technology", "arts"],
    difficulty: "beginner",
    weeklyHours: "1-2 hours",
    minWeeklyHours: 1,
    duration: "3 weeks",
    cost: "$0-20 test budget",
    skillsRequired: ["Curiosity", "Willingness to hear no"],
    skillsYouWillLearn: ["Customer interviews", "Budgeting", "Rapid prototyping"],
    firstStep: "Describe one problem, one specific person who has it, and the smallest way you could test whether they care.",
    roadmap: [
      "Week 1: Interview five potential users without pitching them",
      "Week 2: Build a paper, visual, or no-code prototype and set a firm test budget",
      "Week 3: Run the test, track responses, costs, and surprises, then choose stop, change, or continue",
    ],
    deliverables: ["A testable prototype", "A one-page decision memo with evidence, costs, and next move"],
    potentialImpact: "Solve a small real problem while learning that useful ventures begin with evidence, not a polished pitch.",
    relatedOpportunityIds: [],
  },
  {
    id: "student-policy-brief",
    title: "A student policy brief on one local rule",
    summary:
      "Investigate one school or city policy, represent competing views fairly, and recommend one realistic change in a two-page brief.",
    description:
      "You'll investigate the official record behind one school or city rule, interview people affected by it, and turn the evidence into a concise recommendation for a relevant decision-maker. The brief serves both officials who need a usable student perspective and community members who want the policy and its tradeoffs explained clearly. The work is substantive because you must represent competing views fairly, verify every factual claim, compare realistic alternatives, and defend one proposed change in a meeting or public comment.",
    category: "research",
    matchesInterests: ["law", "debate", "writing", "service", "psychology"],
    matchesCauses: ["education", "accessibility", "community", "social-impact"],
    difficulty: "beginner",
    weeklyHours: "1-2 hours",
    minWeeklyHours: 1,
    duration: "5 weeks",
    cost: "Free",
    skillsRequired: ["Careful reading", "Respectful interviewing"],
    skillsYouWillLearn: ["Policy research", "Argumentation", "Public speaking"],
    firstStep: "Choose one policy narrow enough to explain in a paragraph and find the official text or decision record.",
    roadmap: [
      "Week 1: Read the policy and write a neutral explanation of what it does",
      "Weeks 2-3: Interview or collect statements from at least two affected perspectives",
      "Week 4: Compare three possible changes for benefits, costs, and tradeoffs",
      "Week 5: Write the brief, verify every factual claim, and request a meeting with a relevant decision-maker",
    ],
    deliverables: ["A sourced two-page policy brief", "A three-minute spoken version for a meeting or public comment"],
    potentialImpact: "Give a local decision-maker a student perspective that is specific, informed, and possible to act on.",
    relatedOpportunityIds: [],
  },
  {
    id: "community-listening-report",
    title: "A community listening report",
    summary:
      "Interview a small, clearly defined group about one shared experience and turn recurring themes into an honest public report.",
    description:
      "You'll conduct consent-based interviews with a clearly defined group, identify recurring themes without exposing individual participants, and publish a report grounded in what people actually said. It serves the interviewed community by making shared concerns visible to peers, school leaders, or local organizations that can respond. The project is substantive because responsible qualitative research requires a thoughtful privacy process, disciplined interpretation that does not overstate a small sample, and participant review before publication.",
    category: "research",
    matchesInterests: ["psychology", "law", "debate", "writing", "service"],
    matchesCauses: ["health", "accessibility", "community", "social-impact"],
    difficulty: "beginner",
    weeklyHours: "1-2 hours",
    minWeeklyHours: 1,
    duration: "5-6 weeks",
    cost: "Free",
    skillsRequired: ["Listening", "Respect for privacy and consent"],
    skillsYouWillLearn: ["Interviewing", "Qualitative research", "Responsible reporting"],
    firstStep: "Define exactly whose experiences you want to understand and draft five neutral, non-leading questions.",
    roadmap: [
      "Week 1: Create a consent script and decide what information you will not collect",
      "Weeks 2-3: Conduct five to eight short interviews",
      "Week 4: Group notes into themes without claiming the sample represents everyone",
      "Weeks 5-6: Share a draft with participants, revise, and publish the final report",
    ],
    deliverables: ["An anonymized themes report", "A practical list of next questions or small actions"],
    potentialImpact: "Help a community see patterns in student experience while treating individual stories with care.",
    relatedOpportunityIds: [],
  },
  {
    id: "public-information-campaign",
    title: "A public information campaign students will actually read",
    summary:
      "Turn one useful but ignored resource into a small visual campaign built around the questions students really ask.",
    description:
      "You'll research why students overlook or distrust one legitimate resource, then design and distribute a coordinated set of messages around their real questions. The campaign serves students who could benefit from that resource and the organization trying to reach them, using an approved channel where the materials can prompt actual use. What makes this substantive is that you test competing messages before launch and measure attention or action afterward, treating communication as a problem to investigate rather than decoration to produce.",
    category: "create",
    matchesInterests: ["arts", "writing", "debate", "service", "entrepreneurship"],
    matchesCauses: ["education", "health", "arts", "community", "social-impact"],
    difficulty: "beginner",
    weeklyHours: "1-2 hours",
    minWeeklyHours: 1,
    duration: "4 weeks",
    cost: "$0-15 if printed",
    skillsRequired: ["Clear communication", "Basic visual judgment"],
    skillsYouWillLearn: ["Campaign strategy", "Visual design", "Measuring engagement"],
    firstStep: "Pick one real resource and ask five students what would stop them from noticing, trusting, or using it.",
    roadmap: [
      "Week 1: Verify the resource and collect the actual questions students have",
      "Week 2: Draft three messages and two visual directions",
      "Week 3: Test the drafts with students, then produce a small set of final materials",
      "Week 4: Share them in one approved channel and measure what people notice or do",
    ],
    deliverables: ["A coordinated set of posters, posts, or slides", "A short results note explaining what gained attention"],
    potentialImpact: "Connect more students to an existing resource by making the information clearer and easier to trust.",
    relatedOpportunityIds: [],
  },
  {
    id: "accessible-resource-map",
    title: "An accessible map of local student resources",
    summary:
      "Research and publish a simple, mobile-friendly map of useful services with clear access details and a process for keeping it current.",
    description:
      "You'll verify local services one by one and publish their hours, eligibility, access requirements, and contact details in a keyboard-friendly resource map or directory. It serves students looking for help by replacing scattered, ambiguous listings with one usable mobile reference and a way to submit corrections. The work is substantive because accuracy is maintained through direct verification, a visible source log, accessibility testing, and a scheduled update process rather than a one-time collection of links.",
    category: "contribute",
    matchesInterests: ["service", "cs", "law", "psychology", "writing"],
    matchesCauses: ["accessibility", "health", "community", "technology"],
    difficulty: "beginner",
    weeklyHours: "1-2 hours",
    minWeeklyHours: 1,
    duration: "6 weeks",
    cost: "Free",
    skillsRequired: ["Online research", "Careful organization"],
    skillsYouWillLearn: ["Web development", "Accessibility", "Source verification"],
    firstStep: "Choose one resource category and verify the hours, eligibility, and contact details for five local entries.",
    roadmap: [
      "Weeks 1-2: Define the scope and create a consistent verification checklist",
      "Week 3: Contact organizations when public details are unclear",
      "Weeks 4-5: Build a keyboard-friendly page or map with plain-language entries",
      "Week 6: Test on a phone, add a correction form, and schedule the first update check",
    ],
    deliverables: ["A published resource map or directory", "A verification log and maintenance schedule"],
    potentialImpact: "Reduce the time students spend searching for help and make access requirements easier to understand.",
    relatedOpportunityIds: [],
  },
  {
    id: "tabletop-robotics-testbench",
    title: "A tabletop robotics testbench",
    summary:
      "Build or simulate one small moving system, compare three control strategies, and document why each version behaves differently.",
    description:
      "You'll build or simulate a small moving system, implement three different control approaches, and compare them through repeated measurements under the same conditions. The published build log serves other beginner roboticists by sharing working code or diagrams alongside the failed attempts and the data behind your conclusions. What makes it substantive is the controlled comparison: you define a measurable task, test each approach consistently, and explain engineering tradeoffs rather than showing only a polished final machine.",
    category: "build",
    matchesInterests: ["engineering", "cs", "physics", "ai", "math"],
    matchesCauses: ["education", "technology", "accessibility"],
    difficulty: "beginner",
    weeklyHours: "1-2 hours",
    minWeeklyHours: 1,
    duration: "6 weeks",
    cost: "$0 with simulation; $15-40 with basic hardware",
    skillsRequired: ["Patience debugging", "Basic algebra"],
    skillsYouWillLearn: ["Programming", "Control systems", "Engineering documentation"],
    firstStep: "Choose a simulation or simple motor setup and define one measurable task, such as following a line or holding a target speed.",
    roadmap: [
      "Week 1: Set up the system and record a baseline attempt",
      "Weeks 2-3: Implement two alternative control approaches",
      "Week 4: Run the same test repeatedly and graph the results",
      "Weeks 5-6: Improve the strongest approach and publish a build log with failures included",
    ],
    deliverables: ["A working simulation or physical prototype", "A test report comparing three approaches with code or diagrams"],
    potentialImpact: "Give other beginners a transparent robotics example that explains the failed versions as well as the final one.",
    relatedOpportunityIds: [],
  },
  {
    id: "health-claim-checker",
    title: "A student guide to checking one health claim",
    summary:
      "Trace one health claim from a social post back to its evidence and show other students how to judge what the research does—and does not—say.",
    description:
      "You'll trace one widely shared health claim through reposts to its original evidence, examine the study's methods and limits, and publish a plain-language claim check. It serves classmates who encounter confident health advice online by giving them both a careful analysis and a reusable checklist for evaluating the next claim themselves. The work is substantive because you must reconstruct the claim's source trail, have your interpretation challenged by a qualified adult, and distinguish evidence, uncertainty, and opinion without replacing professional medical guidance.",
    category: "teach",
    matchesInterests: ["biology", "chemistry", "psychology", "writing", "debate"],
    matchesCauses: ["education", "health", "social-impact"],
    difficulty: "beginner",
    weeklyHours: "1-2 hours",
    minWeeklyHours: 1,
    duration: "4 weeks",
    cost: "Free",
    skillsRequired: ["Careful reading", "Willingness to revise your first conclusion"],
    skillsYouWillLearn: ["Research literacy", "Scientific writing", "Evaluating arguments"],
    firstStep: "Save the exact wording of one widely shared claim, then locate the earliest credible source you can find for it.",
    roadmap: [
      "Week 1: Map how the claim changed as it moved between sources",
      "Week 2: Read the original research methods, sample, and limitations",
      "Week 3: Ask a science teacher or qualified expert to challenge your interpretation",
      "Week 4: Publish a plain-language guide that separates evidence, uncertainty, and opinion",
    ],
    deliverables: ["A sourced claim-check article or slide deck", "A reusable checklist for evaluating future health claims"],
    potentialImpact: "Help peers pause before sharing health advice and recognize when a confident claim outruns its evidence.",
    relatedOpportunityIds: [],
  },
  {
    id: "school-board-explainer-site",
    title: "A plain-language guide to your school board",
    summary:
      "Explain how your local school board actually works, then help students show up and ask questions.",
    description:
      "You'll translate real school-board agendas, budget decisions, and policy votes into a clear website students can actually understand, then use it to get classmates submitting questions or showing up to a meeting. It serves students and families who currently have no accessible way to follow decisions that affect their own school day. The work is substantive because every explanation must trace back to an actual public record, and success means measurable turnout or questions submitted, not just a page nobody reads.",
    category: "build",
    matchesInterests: ["law"],
    matchesCauses: ["education", "community"],
    matchesSkills: ["web-dev", "leadership"],
    difficulty: "beginner",
    weeklyHours: "2-3 hours",
    minWeeklyHours: 2,
    duration: "6 weeks",
    cost: "Free",
    skillsRequired: ["Basic HTML/CSS or a website builder", "Comfort reading official documents"],
    skillsYouWillLearn: ["Web development", "Civic research", "Organizing people around a shared goal"],
    firstStep: "Find your school board's or city council's public agenda page and read one upcoming item.",
    roadmap: [
      "Weeks 1-2: Pick one governing body and collect its recent agendas and minutes",
      "Week 3: Draft plain-language explanations of two real upcoming decisions",
      "Week 4: Put those explanations on a simple site or page laying out what's coming up",
      "Week 5: Share it with classmates and collect the questions they'd want answered",
      "Week 6: Submit those questions or organize a small group to attend one meeting",
    ],
    deliverables: [
      "A published explainer site",
      "A set of student questions submitted to the board or asked in person",
    ],
    potentialImpact: "Give more students a real, working way to understand and influence decisions made about their own school.",
    relatedOpportunityIds: ["california-mock-trial", "bmun"],
  },
  {
    id: "ai-privacy-policy-tracker",
    title: "An AI privacy policy comparison tool",
    summary:
      "Trace how AI tools students actually use handle their data, then build a tool that compares them side by side.",
    description:
      "You'll read the real privacy policies and terms of service for AI tools students actually use, extract exactly what each one says about collecting and sharing student data, and build a small tool that lets someone compare them side by side. It serves students, parents, and teachers trying to make an informed choice about a tool before adopting it, in a space where the fine print is long and genuinely hard to compare. The project is substantive because every comparison point must trace back to the policy's actual wording, and the finished tool has to hold up when someone checks your work against the source.",
    category: "research",
    matchesInterests: ["law", "ai"],
    matchesCauses: ["technology"],
    matchesSkills: ["python", "data"],
    difficulty: "intermediate",
    weeklyHours: "3-4 hours",
    minWeeklyHours: 3,
    duration: "6 weeks",
    cost: "Free",
    skillsRequired: ["Basic Python or web development", "Patience reading dense legal text"],
    skillsYouWillLearn: ["Reading and summarizing policy documents", "Data comparison", "Building a small public tool"],
    firstStep: "Pick one AI tool you or classmates use and find its actual privacy policy, not a summary of it.",
    roadmap: [
      "Week 1: Pick 4-5 AI tools or platforms students commonly use",
      "Week 2: Read each policy and log what it says about collecting and sharing data",
      "Week 3: Design a simple comparison structure — a table or short scoring rubric",
      "Week 4: Build the comparison tool with Python or a simple web page",
      "Week 5: Test it against the source policies and fix anything a reader could dispute",
      "Week 6: Publish it and share it with someone who'd use it before choosing a tool",
    ],
    deliverables: ["A working policy comparison tool", "A source log linking every claim to the exact policy text"],
    potentialImpact: "Help students and families see what they're actually agreeing to before trusting an AI tool with their data.",
    relatedOpportunityIds: ["inspirit-ai", "usaaio"],
  },
  {
    id: "neighborhood-ml-model",
    title: "Train a small machine-learning model",
    summary:
      "Use a small, trustworthy dataset to train a model, test how well it works, and explain the result in language another student can follow.",
    description:
      "You’ll choose one simple question—such as sorting plant photos or predicting a number—then train a small machine-learning model with a beginner-friendly notebook. You’ll test it on examples it has not seen, look at where it gets things wrong, and explain what the data and model can and cannot tell you. This is a real ML project, but it stays manageable: you do not need to invent a new algorithm or collect sensitive personal data.",
    category: "build",
    matchesInterests: ["ai", "cs", "math"],
    matchesCauses: ["technology", "education", "community"],
    matchesSkills: ["python", "data", "machine-learning"],
    difficulty: "beginner",
    weeklyHours: "2-4 hours",
    minWeeklyHours: 2,
    duration: "4-6 weeks",
    cost: "Free",
    skillsRequired: ["Basic Python or willingness to learn", "Curiosity about data"],
    skillsYouWillLearn: ["Cleaning a dataset", "Training and testing a model", "Explaining model mistakes"],
    firstStep: "Pick one small public dataset and write down exactly what you want the model to predict or sort.",
    roadmap: [
      "Week 1: Choose a small public dataset and understand what each column or label means",
      "Week 2: Clean the data and make a simple baseline prediction",
      "Week 3: Train a beginner-friendly model and test it on new examples",
      "Weeks 4-5: Study the mistakes, improve one thing, and compare the results",
      "Week 6: Publish the notebook with a plain-language explanation of its limits",
    ],
    deliverables: ["A working notebook and trained model", "A short report showing results, mistakes, and limitations"],
    potentialImpact: "Give other students a clear, honest first look at how machine learning works in practice.",
    relatedOpportunityIds: ["inspirit-ai", "usaaio"],
  },
  ...LIBRARY_IDEAS,
];
