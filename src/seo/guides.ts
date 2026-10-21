import type { Opportunity } from "../data/types";

export interface Guide {
  path: string;
  title: string;
  intro: string[];
  predicate: (opportunity: Opportunity) => boolean;
  relatedCategoryPath: string;
  relatedCategoryLabel: string;
}

/**
 * Summer placements where a high schooler interested in medicine does actual research —
 * working in or alongside a university/hospital lab rather than sitting a lecture
 * course. All Research records tagged biology qualify; internships and hands-on
 * clinical/health programs qualify when they're summer-shaped (a deadline exists) and
 * their record describes mentored research or lab/clinical work. Volunteering,
 * competitions, and tuition lecture courses stay out.
 */
const SUMMER_MEDICAL_RESEARCH_IDS = [
  "simr", // Stanford Institutes of Medicine — 8-week mentored lab placement
  "simons-srp", // Stony Brook lab fellowship, $1,000 stipend
  "ucdavis-ysp", // UC Davis lab placement, original project
  "rsi", // MIT mentorship research program (math/cs/bio)
  "lumiere", // remote PhD-mentored research paper
  "polygence", // remote expert-mentored research project
  "lbnl-einr", // Berkeley Lab paid research internship
  "calacademy-cis", // multi-year science internship, fieldwork + visitor programs
  "ucsf-sep-intern", // UCSF mentored research, $4,500 stipend
  "ucsf-ai4all", // UCSF biomedical data-science research
  "stanford-grips", // Stanford wet-lab genomics internship
  "ucsf-ssrp", // UCSF researcher/clinician pairing, symposium
  "smysp", // Stanford science/medicine/public-health program
  "stanford-csi", // clinical medicine: simulation labs, skills practice
  "stanford-cnix", // neuroscience/psychiatry immersion, capstone
  "ucsf-pitch", // mentored health-career investigations at UCSF
];

function isSummerMedicalResearch(o: Opportunity): boolean {
  if (!o.interests.includes("biology")) return false;
  return o.type === "Research" || SUMMER_MEDICAL_RESEARCH_IDS.includes(o.id);
}

export const GUIDES: Guide[] = [
  {
    path: "/guides/summer-medical-research-programs-for-high-school-students",
    title: "Summer Medical Research Programs for High School Students",
    intro: [
      "Medical research is a different entry point from the pre-med pipeline most students hear about. Instead of shadowing or volunteering, you join a real lab for the summer — at a university or hospital — and work on a piece of someone's actual research in immunology, neuroscience, genomics, or bioengineering.",
      "Every program below is pulled from Pathfind's verified database and pairs a high schooler with mentored research or clinical work: eight weeks in a Stanford lab, genomics at Stanford, a UCSF research symposium, a Stony Brook fellowship with a stipend. Some are free, some pay you, and some charge tuition — cost and eligibility differ enough that the details on each listing matter more than the name.",
      "Two honest notes before you apply. Most lab placements concentrate in grades 11–12, and most strongly favor students who can commute to the site — a handful of these are open only to specific county or district residents. Check the eligibility line on each one before you plan a summer around it.",
    ],
    predicate: isSummerMedicalResearch,
    relatedCategoryPath: "/interests/biology-medicine",
    relatedCategoryLabel: "Biology & Medicine Opportunities",
  },
  {
    path: "/guides/research-opportunities-for-high-school-students",
    title: "Research Opportunities for High School Students",
    intro: [
      "If you want to do real research before college — not a school science fair project, but working alongside actual researchers — there are more paths in than most students realize. University summer research programs, structured mentorship programs, and lab-based fellowships all count, and many are open to students who've never done research before.",
      "The list below is pulled directly from Pathfind's verified opportunity database — every program listed has a real application process, and we track whether each deadline is officially confirmed or still an estimate from last year's cycle.",
      "Research opportunities tend to be more selective than general summer programs, so it's worth applying to a few at different competitiveness levels rather than just the most famous one.",
    ],
    predicate: (o) => o.type === "Research",
    relatedCategoryPath: "/research-programs",
    relatedCategoryLabel: "Research Programs",
  },
  {
    path: "/guides/summer-programs-for-9th-graders",
    title: "Summer Programs for 9th Graders",
    intro: [
      "Most high-profile summer programs are written with juniors in mind, which makes it easy to assume there's nothing out there for a freshman. That's not true — a real, if shorter, set of programs is open to 9th graders specifically, and starting early is one of the better ways to figure out what you actually like before it's time to build a junior-year resume around it.",
      "Below are verified programs from Pathfind's database where a 9th grader meets the published grade requirement — not just programs that happen to accept \"high schoolers\" broadly.",
      "Freshman year is also the cheapest time to try something and be wrong about it. Use these mostly to explore, not to optimize.",
    ],
    predicate: (o) => o.type === "Program" && o.minGrade <= 9 && 9 <= o.maxGrade,
    relatedCategoryPath: "/grades/9",
    relatedCategoryLabel: "Grade 9 Opportunities",
  },
  {
    path: "/guides/free-summer-programs-for-high-school-students",
    title: "Free Summer Programs for High School Students",
    intro: [
      "Cost is often the real filter on whether a summer program is possible, not interest or qualifications. \"Free\" on Pathfind means no tuition or program fee — some free programs still expect you to cover travel or housing, so check each program's own site for exactly what is and isn't included before you assume it's fully free.",
      "Free doesn't mean lower quality. Several of the most selective research and STEM programs in the country don't charge tuition at all, specifically so cost isn't what decides who gets to attend.",
      "The list below pulls every verified summer program in our database marked free, so you can compare real options instead of guessing which ones might waive fees.",
    ],
    predicate: (o) => o.type === "Program" && o.free === true,
    relatedCategoryPath: "/free-programs",
    relatedCategoryLabel: "Free Programs",
  },
  {
    path: "/guides/computer-science-opportunities-for-high-school-students",
    // Deliberately not "Computer Science Opportunities for High School Students" — that's
    // the /interests/computer-science page title, and two pages fighting for one query is
    // worse than one page owning it.
    title: "Computer Science Opportunities: Where to Start",
    intro: [
      "Computer science opportunities for high schoolers range widely: some are competitive research programs, some are project-based courses, some are hackathon-style competitions, and a few are internships. They're not interchangeable, so it's worth knowing which kind you're looking at before you apply.",
      "Everything below is tagged Computer Science in Pathfind's verified opportunity database, spanning research, internships, competitions, and structured programs — not just one flavor of \"CS program.\"",
      "If you're also interested in data science, AI, or robotics specifically, those are tracked as separate interests on Pathfind since the application pools and skill expectations differ.",
    ],
    predicate: (o) => o.interests.includes("cs"),
    relatedCategoryPath: "/interests/computer-science",
    relatedCategoryLabel: "Computer Science Opportunities",
  },
  {
    path: "/guides/competitions-for-high-school-students",
    // Distinct from the /competitions category title on purpose — see the note above.
    title: "Choosing a Competition in High School",
    intro: [
      "Academic competitions are one of the few opportunity types that don't require an application essay or teacher recommendation to get started — you register, prepare, and compete. That makes them one of the more accessible ways to build a real track record, especially earlier in high school.",
      "The competitions below are pulled from Pathfind's verified database and span math, computer science, and other subjects — each with a real registration deadline, not a guess.",
      "Competitiveness varies a lot between these — some are open to any student who registers, others select a small team. Read the actual eligibility on each competition's page before ruling one out.",
    ],
    predicate: (o) => o.type === "Competition",
    relatedCategoryPath: "/competitions",
    relatedCategoryLabel: "Competitions",
  },
  {
    path: "/guides/internships-for-high-school-students",
    // Distinct from the /internships category title on purpose — see the note above.
    title: "High School Internships: What to Expect",
    intro: [
      "High school internships work differently from summer programs, and the difference matters when you're deciding where to spend your time. A program is designed around teaching you something; an internship is a real role on someone's team, where you're expected to produce work that gets used.",
      "That's also why paid internships for high schoolers are uncommon — many organizations can host a student but not pay one. Pathfind marks each listing as free or paid so you can see the cost before you invest an evening in an application.",
      "Ages matter here more than in most categories. Some internships require you to be 16 or 18, and a few run during the school year rather than the summer. Read the eligibility on each posting rather than assuming you're old enough.",
    ],
    predicate: (o) => o.type === "Internship",
    relatedCategoryPath: "/internships",
    relatedCategoryLabel: "Internships",
  },
  {
    path: "/guides/volunteer-opportunities-for-high-school-students",
    // Short enough to keep the brand suffix in the <title>; "community service" is covered
    // in the intro and description rather than padded into the tag.
    title: "Volunteer Opportunities for High School Students",
    intro: [
      "Volunteering and community service are usually the same thing on an application: hours you spent helping someone else, confirmed by an adult who supervised you. It's the one category on this list that almost never turns you down for lack of experience — if you're in 9th or 10th grade and want to start doing something real before you have a resume, service work is the fastest way in.",
      "It also splits into two very different kinds of commitment. Some opportunities are drop-in — show up, help, repeat — while others ask you to run a chapter, organize an event, or keep a regular weekly shift. Both count, but they build different things, and the second kind is much harder to start and much more interesting to talk about later.",
      "One honest caveat: many schools and scholarships want hours documented, so keep your own record of dates and supervisors from the first day. Programs listed here are verified against the organization's own site, but their hour-tracking process is theirs, not Pathfind's.",
    ],
    predicate: (o) => o.interests.includes("service"),
    relatedCategoryPath: "/interests/social-impact-service",
    relatedCategoryLabel: "Social Impact & Service Opportunities",
  },
  {
    path: "/guides/ai-opportunities-for-high-school-students",
    // Distinct from the /interests/data-science-ai page title on purpose — that page owns
    // its query, and two pages competing for one is worse than one page owning it.
    title: "AI Opportunities for High School Students",
    intro: [
      "\"AI opportunity\" has become a marketing phrase as much as a real category, so it's worth separating the two. The verified listings here are actual internships, competitions, structured programs, and research placements tagged Data Science & AI in Pathfind's database — not a course that put \"AI\" in its title.",
      "Most of them are less about chatbots and more about the substance underneath: data analysis, statistics, and machine learning. If you're deciding what to learn first, that's the direction the opportunities themselves point in.",
      "AI-specific programs are newer and fewer than math or science listings, so also consider adjacent fields — a data-heavy research placement or a coding competition builds much of the same foundation. Pathfind tracks those under their own subjects.",
    ],
    predicate: (o) => o.interests.includes("ai"),
    relatedCategoryPath: "/interests/data-science-ai",
    relatedCategoryLabel: "Data Science & AI Opportunities",
  },
  {
    path: "/guides/math-competitions-for-high-school-students",
    title: "Math Competitions for High School Students",
    intro: [
      "Math competitions are the rare opportunity where preparation is fully in your control. There's no essay, no interview, and no recommendation letter — you register, you practice, and your score is your score. That makes them one of the fairest ways for a strong math student to build a record.",
      "They also differ enormously in commitment. Some are single sittings you can enter with a few weeks of practice; others are multi-round contests where the first round is usually taken at your own school, which means you may need a teacher willing to proctor it.",
      "A practical note: many of these have registration windows that close months before the contest date, and school-based rounds often have an earlier internal deadline. If a competition looks interesting, check the deadline now rather than in the spring.",
    ],
    predicate: (o) => o.type === "Competition" && o.interests.includes("math"),
    relatedCategoryPath: "/interests/math",
    relatedCategoryLabel: "Math Opportunities",
  },
  {
    path: "/guides/science-competitions-for-high-school-students",
    title: "Science Competitions for High School Students",
    intro: [
      "Science competitions come in two shapes, and they ask for completely different work. Exam-based contests test how much biology, chemistry, or physics you know. Project-based ones — science fairs and research showcases — ask you to design an investigation and present results, sometimes over an entire school year.",
      "Pick based on what you actually enjoy. If you like problem sets and fast feedback, the exam side is a better fit. If you'd rather spend months on one question you chose yourself, the project side is worth the commitment, and it overlaps naturally with finding a research mentor.",
      "Both kinds usually need a teacher or school sponsor to register or submit on your behalf, so the first step for most of these is talking to a science teacher before the deadline, not after.",
    ],
    predicate: (o) =>
      o.type === "Competition" &&
      o.interests.some((interest) =>
        ["biology", "chemistry", "physics", "environmental"].includes(interest),
      ),
    relatedCategoryPath: "/competitions",
    relatedCategoryLabel: "Competitions",
  },
];

export function findGuideByPath(path: string): Guide | undefined {
  return GUIDES.find((guide) => guide.path === path);
}
