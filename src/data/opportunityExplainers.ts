/**
 * Hand-written explainer copy for the opportunity detail drawer.
 *
 * Rules (enforced by `opportunityExplainers.test.ts`):
 * - Every statement restates something already verified on the opportunity record
 *   (description, organizer, type, grade range, cost flag, format/location, categories)
 *   OR is covered by the entry's `source`, which must point at the official page it was
 *   checked against.
 * - Anything not verified is omitted, never guessed. No invented deadlines, fees,
 *   eligibility rules, advancement rules, statistics or outcomes.
 * - Sections are optional: a short entry is better than a padded one.
 *
 * When the source data genuinely can't support a useful explanation, leave the entry out
 * and let the drawer fall back to verified-field copy (see `lib/opportunityCopy.ts`).
 */
export interface OpportunityExplainer {
  /** What the student actually does, step by step, in plain language. */
  whatYouDo?: string;
  /** Why participating could be useful or interesting — only from verified record signals. */
  whyWorthIt?: string;
  /** One or two sentences on who it's a fit for. Omit when nothing verified supports it. */
  fit?: string;
  /** Official page(s) any detail beyond the record itself was verified against. */
  source?: string;
}

export const OPPORTUNITY_EXPLAINERS: Record<string, OpportunityExplainer> = {
  amc: {
    whatYouDo:
      "You take one paper: 25 multiple-choice questions in 75 minutes, scored out of 150 — 6 points for a correct answer, 1.5 for a blank, and 0 for a wrong one — so a considered guess is usually worth more than leaving a question empty. There are two versions in November (A on November 5, 2026 and B on November 13, 2026), and your school's competition manager can enter you for either or both; no one takes the AMC 10 and the AMC 12 on the same day. You don't sign up with the MAA yourself: ask your school, or a nearby college, math circle, or learning center, because a competition manager has to register and pay the fees.",
    whyWorthIt:
      "It's the first rung of the U.S. math olympiad ladder: a high enough AMC 10 or AMC 12 score earns an invitation to the AIME, which leads toward the USAMO/USAJMO and, eventually, the team that represents the U.S. at the International Mathematical Olympiad. The MAA publishes its AIME qualifying scores each year — recent cycles used 100 or above on the AMC 10 and 85 or above on the AMC 12 — so your score gives you a concrete, comparable signal of where you stand.",
    fit:
      "The MAA's own rules are narrower than the grade range Pathfind lists: the AMC 10 is for students in grade 10 and below who are under 17.5 on competition day, and the AMC 12 is for grade 12 and below who are under 19.5. The AMC 10 leaves out trigonometry and advanced algebra but assumes elementary algebra, basic geometry, number theory and probability; the AMC 12 covers the full high school curriculum except calculus. So the AMC 10 is the usual starting point if you're earlier in high school, and the AMC 12 fits if your coursework has gone past those AMC 10 topics.",
    source:
      "https://maa.org/student-programs/amc/ ; https://maa.org/maa-invitational-competitions/",
  },

  cosmos: {
    whatYouDo:
      "You spend four weeks living on a UC campus inside one research cluster — robotics, AI, marine science, and others — working alongside university faculty and a small cohort of other students. Expect project and lab work in your cluster rather than a survey of everything.",
    whyWorthIt:
      "You get a month inside a UC research setting before you've even applied to college, and the cluster structure keeps the four weeks focused on one subject instead of sampling broadly.",
    fit: "Listed for grades 10–12, and you commit to a single cluster, so it's pitched at students ready to go deep in one STEM area.",
  },

  "berkeley-precollege": {
    whatYouDo:
      "You enroll in real UC Berkeley lower-division courses over a six- or eight-week summer session, as a commuter or in the residential track. You're taking the same courses Berkeley undergraduates take, with college credit attached.",
    whyWorthIt:
      "The courses carry actual college credit, so the summer ends with a Berkeley transcript entry rather than a certificate. It's tuition-based, so budget is part of the decision.",
    fit: "Open to grades 10–12 who want a genuine college course instead of a pre-college survey course.",
  },

  "berkeley-robotics-academy": {
    whatYouDo:
      "Over two weeks your team identifies a real-world problem and designs a robotic solution for it, finishing with a capstone presentation. Most of the time is hands-on design and building.",
    whyWorthIt:
      "You leave with a finished team project and a presentation you can talk about, and it's a short two-week commitment if you want to test an interest in engineering.",
    fit: "For grades 9–12, Bay Area based, and centered on engineering and robotics.",
  },

  "kode-with-klossy": {
    whatYouDo:
      "You pick one track — web development, machine learning, or mobile app design — and spend two weeks building in it with other girls and gender-expansive teens. The record says no experience is required.",
    whyWorthIt:
      "It's free and fully remote, and it's explicitly open to beginners, so there's no cost or experience barrier to trying a coding track over the summer.",
    fit: "For girls and gender-expansive students in grades 9–12, including students who have never coded before.",
  },

  "girls-who-code-pathways": {
    whatYouDo:
      "A free, self-paced seven-week virtual program where you work through one subject — AI, cybersecurity, data science, game design, or web development — with mentor check-ins along the way.",
    whyWorthIt:
      "It's free and you set your own pace across seven weeks with a mentor checking in. Note that it replaced the flagship Summer Immersion Program, which ended after its 2025 cohort.",
    fit: "Open to girls and non-binary students across grades 9–12, in any of the five subject tracks.",
  },

  "congressional-app-challenge": {
    whatYouDo:
      "You build an original app for any platform, solo or in a small team, and enter it against other students in your congressional district. Winning apps are exhibited in the U.S. Capitol.",
    whyWorthIt:
      "It's free to enter and you're judged against your own district rather than the whole country, with winning work displayed in the Capitol.",
    fit: "For grades 9–12, and the record allows either a solo entry or a team.",
  },

  usamts: {
    whatYouDo:
      "You work proof-based math problems from home over several weeks, then submit written solutions — and you get detailed written feedback on every solution you send. It's free.",
    whyWorthIt:
      "The feedback is the real payoff: instead of just a score, you get comments on each proof you write. It's free, and the multi-week format means you work on your own schedule.",
    fit: "For grades 9–12 who'd rather write proofs at their own pace than sit a timed multiple-choice exam.",
  },

  ross: {
    whatYouDo:
      "Six residential weeks of number theory built around discovery: you prove theorems yourself rather than following someone else's write-up, alongside counselors and other students doing the same.",
    whyWorthIt:
      "The format asks you to construct the mathematics yourself, which is a fundamentally different experience from a taught course. Pathfind lists it as tuition-based.",
    fit: "Listed for grades 9–12, and the daily proof work rewards students who are happy to sit with a hard problem for a while.",
  },

  awesomemath: {
    whatYouDo:
      "Three weeks of live online classes centered on olympiad and contest problem-solving, taught by experienced competition coaches, with problem sets between sessions.",
    whyWorthIt:
      "It's a concentrated, live, coached run at contest math rather than a general summer course. Tuition applies.",
    fit: "For grades 9–12 who are already drawn to competition math and want an intensive online session.",
  },

  simr: {
    whatYouDo:
      "You spend eight weeks in a Stanford lab on a mentored research placement, working in an area such as immunology, cancer biology, neuroscience, or bioengineering. The experience is built around a specific lab placement rather than a broad survey of medicine, so the exact project depends on the research area you join.",
    whyWorthIt:
      "It's an eight-week Stanford lab placement that costs nothing, and the record notes special consideration for Bay Area students. That combination makes the program especially relevant if you want a sustained research experience without tuition, while still needing to check the current eligibility details.",
    fit: "Listed for grades 11–12 with biology and medicine interests, and Bay Area students are considered with that priority in mind. It is a better match for a student ready to spend most of a summer in one research setting than for someone looking for a short class or a general campus tour.",
  },

  "simons-srp": {
    whatYouDo:
      "A seven-week research fellowship where you work in an active Stony Brook lab in science, math, or engineering under a faculty mentor.",
    whyWorthIt:
      "It's tuition-free and pays a $1,000 stipend on completion, and the record notes that commuting avoids the optional housing cost.",
    fit: "Open to juniors — grade 11 only.",
  },

  "ucdavis-ysp": {
    whatYouDo:
      "A six-week residential program that places about 40 students in UC Davis labs to run original projects in biology, agriculture, or environmental science.",
    whyWorthIt:
      "The cohort is small, roughly 40 students, and the work is your own research project rather than a course load. It's tuition-based.",
    fit: "For grades 11–12 working in biology or environmental science.",
  },

  "lbnl-einr": {
    whatYouDo:
      "A paid six-week internship — $500 a week for about 30-35 hours — working with Berkeley Lab scientists on real projects in data science, coding, or experimentation.",
    whyWorthIt:
      "It pays $500 a week while you work on live lab projects, which is unusual for a high school research placement.",
    fit: "For Northern California students in grades 10–12 who turn 16 by mid-June, with priority for students near the Berkeley site.",
  },

  "wharton-finance": {
    whatYouDo:
      "Two weeks online on corporate valuation, venture capital, and alternative investments, taught by Wharton faculty.",
    whyWorthIt:
      "Wharton faculty teach it, and it packs valuation and investing material you'd normally meet in college into two weeks. Tuition applies.",
    fit: "Listed for grades 9–11 who want a finance primer before committing to a longer program.",
  },

  "wharton-fdm": {
    whatYouDo:
      "Two weeks of daily live lectures and recitations covering the fundamentals of saving, borrowing, and investing, ending in a certificate.",
    whyWorthIt:
      "The subject is personal finance rather than corporate finance, and the daily live format keeps you accountable. It's tuition-based.",
    fit: "Open to grades 9–12, a wider grade range than the Wharton essentials course.",
  },

  deca: {
    whatYouDo:
      "You join your school's DECA chapter and compete in marketing, finance, and management case-study events, working up from regionals to state and then nationals.",
    whyWorthIt:
      "It's an in-person competition track with a clear ladder — regionals, state, nationals — and the school chapter handles the entry side.",
    fit: "For grades 9–12 who want business competition work through their own school.",
  },

  fbla: {
    whatYouDo:
      "Through your school's FBLA chapter you compete in banking, accounting, and financial-systems events, from your local conference up to nationals.",
    whyWorthIt:
      "FBLA gives you a structured path through business events with a local start, so you don't need prior competition experience to begin at the chapter level.",
    fit: "Listed for grades 9–12 with a finance focus, run through your school's chapter.",
  },

  "regeneron-sts": {
    whatYouDo:
      "Seniors submit original independent research — the work you have already done — and it's judged as a national science research competition rather than as an exam.",
    whyWorthIt:
      "It's the oldest US science research competition of its kind, and top awards exceed $250,000. There's no fee to enter.",
    fit: "Open to grade 12 only, and the entry is your own completed research project.",
  },

  "regeneron-isef": {
    whatYouDo:
      "You present original research at the world's largest pre-college science fair — but you get there by winning an affiliated regional or state fair first, not by applying directly.",
    whyWorthIt:
      "The route in is through a regional or state fair, so competing locally is the actual first step; entry itself costs nothing.",
    fit: "For grades 9–12 who have finished a research project and are prepared to qualify through a regional fair.",
  },

  rsi: {
    whatYouDo:
      "Six weeks on MIT's campus pairing you with a mentor for original STEM research, finishing with a formal presentation of your work.",
    whyWorthIt:
      "It's free including room and board, and it ends with a formal presentation of original research done on MIT's campus.",
    fit: "Juniors only — grade 11, and the record notes seniors are not eligible.",
  },

  "mit-primes": {
    whatYouDo:
      "A year-long original research project in mathematics, pairing you remotely with an MIT researcher, running across the school year rather than the summer.",
    whyWorthIt:
      "It's a full year of mathematics research with an MIT mentor, and it's completed remotely with no tuition or fee.",
    fit: "For sophomores and juniors — grades 10–11 — nationwide, working remotely.",
  },

  "jane-street-insight": {
    whatYouDo:
      "You spend several days at Jane Street's New York office getting an introduction to quantitative trading and software engineering, with the costs covered.",
    whyWorthIt:
      "It's all-expenses-paid and puts you inside a trading firm's actual office, with software engineering covered alongside trading.",
    fit: "For women, transgender, and gender-expansive students in grades 11–12; the record says no finance background is required.",
  },

  mathcamp: {
    whatYouDo:
      "Five residential weeks of advanced, exploratory mathematics that goes beyond the standard curriculum, living on campus with students who chose the same thing.",
    whyWorthIt:
      "Tuition is fully free for families earning under $100,000, with sliding-scale pricing above that, so five weeks of advanced math are accessible across a wide range of budgets.",
    fit: "Listed for grades 9–12 who want mathematics past the standard curriculum.",
  },

  promys: {
    whatYouDo:
      "Six residential weeks working open-ended number theory problem sets with counselors and visiting mathematicians, at a pace where a single problem can absorb a day.",
    whyWorthIt:
      "Tuition is fully covered for families earning under $80,000, and the problem sets are open-ended rather than textbook exercises with a known answer.",
    fit: "Listed for grades 9–12, and it suits students who enjoy working one hard problem from several angles.",
  },

  usaco: {
    whatYouDo:
      "You compete in up to four online programming contests a season in your division — Bronze through Platinum — solving algorithm problems against a clock from your own computer.",
    whyWorthIt:
      "There's no application and no fee, registration is rolling, and four contests a season means you can move up divisions over the course of a year.",
    fit: "Open to any pre-college student, and the four-division ladder means you start at a level that matches your programming.",
  },

  "davidson-fellows": {
    whatYouDo:
      "You submit a significant, original piece of work you've already produced — in science, technology, math, literature, music, or philosophy — and it's judged for a scholarship award.",
    whyWorthIt:
      "Awards run from $25,000 to $100,000, there's no fee to apply, and you can enter at any point up to age 18.",
    fit: "For students 18 or younger across grades 9–12; the entry is finished work rather than a proposal.",
  },

  "correlation-one-terminal": {
    whatYouDo:
      "You join a team and compete virtually in a round-robin, writing algorithms for finance and data-driven problems against other teams.",
    whyWorthIt:
      "It costs nothing, runs virtually, carries cash prizes, and the record notes Citadel recruiting exposure for participants.",
    fit: "For grades 9–12 with finance or computer science interests, competing as a team.",
  },

  lumiere: {
    whatYouDo:
      "Over about twelve weeks you work one-on-one online with a PhD mentor to produce an independent research paper on a topic you choose yourself.",
    whyWorthIt:
      "You pick the topic and work with a PhD mentor toward a finished paper, entirely online, with need-based aid available against the fee.",
    fit: "Open to grades 9–12 across several fields; it's self-directed, so you need a topic in mind.",
  },

  polygence: {
    whatYouDo:
      "Across roughly ten sessions you work one-on-one online with an expert mentor to complete a self-chosen project — a research project, a paper, or an app.",
    whyWorthIt:
      "You choose the output, whether that's a paper, a project, or an app, and the sessions are one-on-one rather than a class.",
    fit: "Listed for grades 9–12; the format fits students who already know roughly what they want to build.",
  },

  "stanford-precollegiate-si": {
    whatYouDo:
      "You take summer courses at Stanford, on campus or online, in subjects across computer science, math, biology, chemistry, and psychology.",
    whyWorthIt:
      "Courses are open to any qualifying student rather than only Stanford OHS enrollees, and need-based financial aid is available against the tuition.",
    fit: "For grades 9–11, with both on-campus and online formats listed.",
  },

  "berkeley-atdp": {
    whatYouDo:
      "You take summer enrichment courses at UC Berkeley, choosing across the sciences, math, and humanities.",
    whyWorthIt:
      "One course runs several hundred dollars up to about $1,250, and there's a Pathway Scholarship for financial need.",
    fit: "Open to grades 9–12, and you can pick subjects across the sciences and humanities instead of one track.",
  },

  "jhu-cty": {
    whatYouDo:
      "You take in-person or online summer academic courses, after qualifying through above-grade-level testing.",
    whyWorthIt:
      "The coursework sits above your grade level, and financial aid is available against the tuition.",
    fit: "For grades 9–12, and there's a step first — admission runs through above-grade-level test results.",
  },

  codeai: {
    whatYouDo:
      "You work through free, self-paced computer science and AI courses on your own schedule — there's no application and no deadline.",
    whyWorthIt:
      "It costs nothing and has no deadline, and the catalog now leans toward AI literacy after the 2026 rebrand from Code.org.",
    fit: "Listed for grades 9–12 and self-paced, so it fits around a full school schedule.",
  },

  "project-pull": {
    whatYouDo:
      "An eight-week paid internship placed in a San Francisco city department such as the SF Public Utilities Commission, with weekly STEAM enrichment alongside the work.",
    whyWorthIt:
      "It's paid and based in city departments, so you see how municipal engineering and environmental work actually runs day to day.",
    fit: "For San Francisco juniors and seniors — grades 11–12 — working in engineering or environmental science.",
  },

  "hidden-genius-project": {
    whatYouDo:
      "A free fifteen-month program in Oakland combining two seven-week summer sessions with year-round coding, entrepreneurship, and leadership training, alongside mentorship.",
    whyWorthIt:
      "It runs fifteen months rather than a single summer, costs nothing, and the record says no prior coding experience is needed to start.",
    fit: "For Black male high schoolers in grades 9–11, based in Oakland.",
  },

  "stanford-health-teen-volunteers": {
    whatYouDo:
      "You take a weekly shift at Stanford Health Care staffing the gift shop, information desks, or administrative areas, year-round.",
    whyWorthIt:
      "It's a year-round hospital role with a regular weekly shift, and the record is explicit that it's volunteering rather than clinical shadowing.",
    fit: "For ages 16 and up in grades 10–12, and it asks for a standing weekly commitment.",
  },

  "kaiser-teen-volunteer": {
    whatYouDo:
      "A structured, non-clinical volunteer role at a Northern California Kaiser medical center, requiring a health screening and a weekly shift.",
    whyWorthIt:
      "It's a formal hospital program for 16 and 17 year-olds, and the record notes each medical center maintains its own listing.",
    fit: "Ages 16–17 in grades 10–11; the linked page is the Santa Clara site, and other centers list separately.",
  },

  "ucsf-junior-ambassadors": {
    whatYouDo:
      "You support UCSF Benioff Children's Hospital through fundraising events, bedside activity kits, and cards for patients, as a volunteer rather than in a clinical role.",
    whyWorthIt:
      "The work is philanthropy and patient support rather than shadowing, and it opens at age 14 — earlier than most hospital volunteer programs.",
    fit: "Ages 14–18 across grades 9–12, and the record notes it is not clinical shadowing.",
  },

  "el-camino-junior-auxiliary": {
    whatYouDo:
      "You volunteer at El Camino Health in Mountain View or Los Gatos over a year-long commitment, joining through an application seminar.",
    whyWorthIt:
      "It asks for a full year of service rather than a summer stint, and the record says the application seminar is typically announced each January.",
    fit: "For students 14 and older who've finished 8th grade, across grades 9–12.",
  },

  "grassroots-ecology-youth-stewards": {
    whatYouDo:
      "You join a seasonal cohort doing hands-on habitat restoration — mainly invasive-plant removal — at open space preserves in Los Altos Hills and Palo Alto.",
    whyWorthIt:
      "It's free outdoor environmental work you can join on a seasonal cycle, and the record says the next round opens in spring.",
    fit: "Listed for grades 9–12 in the Bay Area; it's unpaid, local, hands-on fieldwork rather than a research placement.",
  },

  "marine-mammal-center-youth-crew": {
    whatYouDo:
      "Over five months at the Center's Sausalito hospital you work alongside staff on animal care and ocean-conservation education.",
    whyWorthIt:
      "Five months alongside staff means sustained animal-care experience rather than a one-off volunteer day. Applications open in fall for the following year.",
    fit: "Ages 15–18 in grades 9–12, based at the Sausalito hospital.",
  },

  "ggnpc-linc": {
    whatYouDo:
      "You pick one of two tracks — environmental-justice community science, or outdoor leadership with camping and kayaking — and spend the summer on it. Participants receive a completion stipend.",
    whyWorthIt:
      "It's free and pays a completion stipend, and the two tracks lead in different directions: community science or outdoor leadership.",
    fit: "Listed for grades 9–12 with an environmental interest, in the Bay Area.",
  },

  "iowa-young-writers": {
    whatYouDo:
      "Two residential weeks of creative writing workshops in Iowa City, following an application that asks for a writing sample, a statement of purpose, and a teacher recommendation.",
    whyWorthIt:
      "Need-based aid includes several full-tuition grants, so the price isn't necessarily the barrier it looks like — but the application does ask for real writing.",
    fit: "For grades 10–12 who write and can supply a sample plus a teacher recommendation.",
  },

  "kenyon-young-writers": {
    whatYouDo:
      "Two intensive weeks of creative writing workshops at Kenyon College, with no application fee.",
    whyWorthIt:
      "There's no fee to apply, and the record says need-based aid usually meets the full amount admitted students request.",
    fit: "For grades 10–12 who want a residential writing workshop with a lower financial barrier to entry.",
  },

  "adroit-mentorship": {
    whatYouDo:
      "You're paired one-on-one, entirely online, with a working poet or prose writer in poetry, fiction, or creative nonfiction.",
    whyWorthIt:
      "Your mentor is a working writer in the genre you choose, and the record notes fee remission is reviewed separately from admission.",
    fit: "For grades 9–12 writers, choosing one genre to work in.",
  },

  "scholastic-art-writing": {
    whatYouDo:
      "You submit writing or visual art in one of 28 categories, judged regionally first, with the Bay Area regional deadline falling in December.",
    whyWorthIt:
      "Entry costs $15 per work with a fee waiver built into the portal, and you can enter as many categories as you want.",
    fit: "For grades 9–12 writers and artists; because it's priced per piece, you don't need a full portfolio to start.",
  },

  youngarts: {
    whatYouDo:
      "You submit work in one of ten disciplines — writing, visual arts, film, theater, dance, voice, jazz, and others — for national judging.",
    whyWorthIt:
      "Awards run from $250 to $10,000 and come with mentorship, and the $35 entry fee can be waived.",
    fit: "For artists ages 15–18 in grades 10–12, submitting in a single discipline.",
  },

  interlochen: {
    whatYouDo:
      "You live on a northern Michigan campus for one to six weeks of arts study in music, theatre, dance, visual arts, film, or creative writing.",
    whyWorthIt:
      "The aid numbers are published: 86% of families who requested aid received it last summer, though tuition is steep without it.",
    fit: "Listed for grades 9–12, and session length is flexible between one and six weeks.",
  },

  "idyllwild-arts": {
    whatYouDo:
      "Two-week intensives on a Southern California mountain campus in one arts area, from visual arts and fashion to film and creative writing.",
    whyWorthIt:
      "Enrollment is rolling until sessions fill rather than a single deadline, and need-based scholarships are available.",
    fit: "For grades 9–12 across the arts; applying early matters because sessions close when full.",
  },

  csssa: {
    whatYouDo:
      "Four residential weeks at Cal Poly Pomona in one discipline — animation, film, dance, music, theater, visual arts, or creative writing — through a state-run program.",
    whyWorthIt:
      "Nearly 60% of students recently received full or partial scholarships, and the campus stay is four weeks.",
    fit: "California residents in grades 9–12.",
  },

  "sfcm-precollege": {
    whatYouDo:
      "Saturdays in downtown San Francisco from August through May: private lessons, ensembles, and master classes at the conservatory.",
    whyWorthIt:
      "It's a year-long conservatory schedule rather than a summer course, with private instruction built in, and financial aid is offered.",
    fit: "Admission is by audition and expects 1-2 years of prior study, so it suits students already playing at that level.",
  },

  "yr-media": {
    whatYouDo:
      "Free training in journalism, audio production, and digital storytelling at an Oakland organization, open to ages 14–24.",
    whyWorthIt:
      "It's free and open to beginners — but the record flags that the organization paused in late 2024 and relaunched in 2026, so confirm it's currently running before you apply.",
    fit: "Ages 14–24, which stretches past high school; listed for grades 9–12.",
  },

  "mosaic-journalism": {
    whatYouDo:
      "Two weeks in a working newsroom at San Jose State: you report, write, shoot, and produce stories that get published, with about 20 students in the cohort.",
    whyWorthIt:
      "It's free, the work gets published, and the cohort is small at about 20 students. It does require work samples and full attendance.",
    fit: "Mostly Bay Area students in grades 9–12, and it asks for work samples up front.",
  },

  "youth-speaks": {
    whatYouDo:
      "You attend free weekly spoken-word writing and performance workshops in San Francisco and Oakland, and you can enter the annual Teen Poetry Slam.",
    whyWorthIt:
      "The workshops are free and run weekly, and slam finalists go on to represent the Bay Area at Brave New Voices.",
    fit: "Listed for grades 9–12 in the Bay Area; the weekly workshops and the annual slam are separate ways in.",
  },

  "hoby-norcal": {
    whatYouDo:
      "A three-day residential leadership seminar at Menlo College in Atherton, built for sophomores.",
    whyWorthIt:
      "Schools often cover the fee, and the way in isn't an application — a counselor or administrator has to submit you.",
    fit: "Grade 10 only, and you can't self-nominate, so start that conversation with a counselor early.",
  },

  "genesys-works": {
    whatYouDo:
      "You do eight weeks of technical and professional training one summer, then a paid corporate internship through your senior year.",
    whyWorthIt:
      "Interns earn roughly $10,000-$13,000 over the year, and the training that leads into the placement is free.",
    fit: "For grades 11–12 students at partner high schools, with the internship running during senior year.",
  },

  "exploratorium-explainer": {
    whatYouDo:
      "You lead demonstrations and staff exhibits at the Exploratorium in San Francisco after 60+ hours of training, working about 7.5 hours a week.",
    whyWorthIt:
      "It's a paid museum job at about $19.61 an hour, the record says no science background is required, and postings open in July and March.",
    fit: "Ages 15–18 across grades 9–12, and it's part-time alongside school.",
  },

  "calacademy-cis": {
    whatYouDo:
      "A paid internship in Golden Gate Park doing fieldwork and visitor programs, running through graduation across two to three years.",
    whyWorthIt:
      "It's paid and multi-year, so it builds sustained fieldwork experience rather than one summer. It does require a 2.5 GPA.",
    fit: "For SFUSD 9th and 10th graders underrepresented in STEM, and it asks for a two-to-three-year commitment.",
  },

  "diamond-challenge": {
    whatYouDo:
      "Teams of two to four students pitch a venture in either the business or the social innovation track, with one adult advisor on the team.",
    whyWorthIt:
      "It's free to enter, the prize pool is $100K, and finalists compete at the Limitless World Summit.",
    fit: "For grades 9–12, competing as a team of two to four with an adult advisor.",
  },

  launchx: {
    whatYouDo:
      "You join a team that launches a real startup over the summer, in person or online, taking it from idea through to a pitch.",
    whyWorthIt:
      "The output is an actual launched venture rather than a business plan, and need-based awards are available. Priority applications land in mid-November.",
    fit: "For grades 9–12 who want to build a company with a team; the record describes admission as selective.",
  },

  "conrad-challenge": {
    whatYouDo:
      "Teams of two to five work through several stages, submitting a lean canvas, an innovation brief, a video, and a team site. The activation stage closes in October and the innovation stage in January.",
    whyWorthIt:
      "The staged structure gives you several distinct deliverables to build, but note that advancing teams pay a $499 team fee.",
    fit: "For grades 9–12 in teams of two to five, in innovation and engineering.",
  },

  "tye-silicon-valley": {
    whatYouDo:
      "About eight weeks in Palo Alto building a startup in a team, ending with a pitch to Silicon Valley judges.",
    whyWorthIt:
      "Winners advance toward TYE Global, and seats fill first-come rather than by selection, so moving early matters.",
    fit: "Bay Area students in grades 9–12; it's in person and paid.",
  },

  "nfte-world-series": {
    whatYouDo:
      "You submit a solution tied to one of the UN Sustainable Development Goals, working solo or in a small team, entirely online.",
    whyWorthIt:
      "It's free, runs online, and cash prizes go up to $1,500.",
    fit: "For grades 9–12 with an entrepreneurship interest, solo or in a small team.",
  },

  "wharton-investment-competition": {
    whatYouDo:
      "Over ten weeks, teams of four to six build an investment strategy for a real client case and manage a virtual portfolio.",
    whyWorthIt:
      "It's free, runs ten weeks, and the portfolio is virtual — so no real money is at stake while you work through the process.",
    fit: "For grades 9–12 in teams of four to six, and a teacher has to register the team.",
  },

  "california-boys-girls-state": {
    whatYouDo:
      "A week at CSU Sacramento running for office, drafting legislation, and arguing cases inside a government simulation.",
    whyWorthIt:
      "A local Legion post sponsors the fee, and the record says there's no direct application — your school nominates you.",
    fit: "Grade 11 only, and getting in depends on a school nomination.",
  },

  "youth-and-government": {
    whatYouDo:
      "You join a local Bay Area delegation for a year and take a role — legislator, attorney, judge, or journalist — at statewide sessions.",
    whyWorthIt:
      "It runs a full year rather than a weekend conference, and you commit to one specific role. Fees and deadlines are set by each local YMCA.",
    fit: "Listed for grades 9–12 with law and debate interests, joining through a local YMCA delegation.",
  },

  "california-mock-trial": {
    whatYouDo:
      "Your school's team argues a hypothetical criminal case in a real courtroom before sitting judges, against teams from other schools.",
    whyWorthIt:
      "You argue in actual courtrooms in front of real judges, and the competition spans Alameda, Santa Clara, San Francisco, and Contra Costa counties.",
    fit: "For grades 9–12, and you join through your school's existing team.",
  },

  bmun: {
    whatYouDo:
      "Three days on the UC Berkeley campus as a delegate in one of about 20 committees, at a conference of roughly 2,000 high school students.",
    whyWorthIt:
      "It's a large conference — roughly 2,000 delegates and 20 committees — so topic and committee size vary a lot. Registration is first-come.",
    fit: "For grades 9–12, and an adult advisor from your school has to register you.",
  },

  "georgetown-law-academy": {
    whatYouDo:
      "A week in Washington, DC covering criminal law, constitutional law, and Supreme Court cases through lectures and mock trials.",
    whyWorthIt:
      "Applying by the early deadline waives the application fee, and the week mixes lectures with mock-trial practice.",
    fit: "For grades 9–12 with law or debate interests; it's in person and tuition-based.",
  },

  snfi: {
    whatYouDo:
      "Summer sessions in Palo Alto, or online, covering speech, debate, and public speaking — run at Stanford since 1990.",
    whyWorthIt:
      "The institute has run at Stanford since 1990 and offers an online option if you can't get to Palo Alto. Enrollment is rolling and space-limited.",
    fit: "For grades 9–12 in debate and public speaking, with rolling enrollment.",
  },

  "victory-briefs": {
    whatYouDo:
      "You pick a two- or four-week residential camp and a format — Lincoln-Douglas, Public Forum, or World Schools — at either the University of San Diego or UT Austin.",
    whyWorthIt:
      "You choose between two campuses and two session lengths, and registration is rolling once dates post.",
    fit: "For grades 9–12 debaters; it's in person and paid.",
  },

  "stanford-cnix": {
    whatYouDo:
      "Two weeks of neuroscience, psychiatry, and psychology taught by Stanford faculty, ending in a capstone project — on campus or virtual.",
    whyWorthIt:
      "Stanford faculty teach it, it finishes with a capstone, and scholarships are available against the fee.",
    fit: "For grades 10–12 interested in psychology or biology.",
  },

  "ucsf-sep-intern": {
    whatYouDo:
      "Eight weeks of research at UCSF with a scientist mentor in neuroscience, immunology, or molecular biology, paying $4,500 on completion.",
    whyWorthIt:
      "It pays $4,500 for eight weeks, but the eligibility is narrow — roughly 25 spots.",
    fit: "Grade 11 only, limited to juniors at SFUSD or San Francisco public charter high schools.",
  },

  usapho: {
    whatYouDo:
      "You take the F=ma exam at your school in February; top scorers advance to the USAPhO and from there toward the U.S. Physics Team camp.",
    whyWorthIt:
      "It's the entry exam for the physics olympiad pathway, and your school handles registration rather than you — there's a school fee plus a per-student fee.",
    fit: "For grades 9–12 in physics and math, and you need a school willing to register and host the exam.",
  },

  usnco: {
    whatYouDo:
      "You sit a local-section exam in late winter; high scorers move on to the national exam in April, and top finishers are invited to a June study camp.",
    whyWorthIt:
      "The ladder is concrete — local exam, national exam, then a study camp — and your local ACS section sets its own qualifying cutoff.",
    fit: "For grades 9–12 in chemistry, registering through your local ACS section.",
  },

  usaaao: {
    whatYouDo:
      "You sit a proctored first round in February, and a national round follows in April as part of the three-round sequence.",
    whyWorthIt:
      "Registration is $30 per student with group discounts, and financial aid is available.",
    fit: "For grades 9–12 in physics and math; the first round is proctored.",
  },

  "breakthrough-junior": {
    whatYouDo:
      "You make an original two-minute video explaining a concept in physics, life sciences, or math, and submit it.",
    whyWorthIt:
      "The top prize is a $250,000 college scholarship and it's free to enter; finalists also peer-review at least five other entries.",
    fit: "For grades 9–12, working solo on one short explainer video.",
  },

  usaaio: {
    whatYouDo:
      "You sit a February first round with non-coding and Colab coding tasks, and if invited, a second round and a June camp that selects Team USA. Exams are proctored at your school or a test site.",
    whyWorthIt:
      "It's a multi-round AI competition with a national-team endpoint, and there's a fee to enter.",
    fit: "For grades 9–12 in AI, computer science, and math; round one is proctored.",
  },

  "slac-sage": {
    whatYouDo:
      "A free week living at the SLAC and Stanford campuses, with job shadowing, hands-on projects, and career sessions led by lab scientists.",
    whyWorthIt:
      "It's free, residential, and led by national-lab scientists — but the eligible counties are a fixed list, so check yours first.",
    fit: "Ages 14–17 in grades 9–12, limited to specific Northern and Central California counties.",
  },

  "stanford-ai4all": {
    whatYouDo:
      "Two weeks of AI covering computer vision, robotics, medical AI, NLP, and ethics, with graduate-student mentorship — online in June or residential in July.",
    whyWorthIt:
      "Graduate-student mentorship runs alongside the coursework, and need-based aid exists even though tuition is steep.",
    fit: "Open only to 9th graders, with the online June and residential July options.",
  },

  "stanford-shtem": {
    whatYouDo:
      "Eight weeks of in-person research at Stanford on interdisciplinary projects spanning information theory, machine learning, and the humanities.",
    whyWorthIt:
      "The projects cross disciplines rather than sitting inside one department — but it's unpaid, carries a $95 application fee, and you arrange your own housing and transport.",
    fit: "For grades 11–12 in AI, computer science, engineering, or math.",
  },

  bwsi: {
    whatYouDo:
      "Four weeks of project-based work at MIT in one of several areas — AI, autonomous racing, radar, satellites — after completing a free online prerequisite course that opens in winter.",
    whyWorthIt:
      "Tuition is free for families earning under $200,000, and admission hinges on finishing the free prerequisite course rather than on a test score.",
    fit: "Grade 11 only, and the prerequisite course has to be finished before you can be admitted.",
  },

  "inspirit-ai": {
    whatYouDo:
      "Ten live online sessions on AI taught by graduate students, ending with a social-impact project.",
    whyWorthIt:
      "Tuition is $1,400 with payment plans, admission is rolling year-round, and the course finishes with a project rather than a certificate alone.",
    fit: "For grades 9–12, online, with no application deadline to plan around.",
  },

  "veritas-ai": {
    whatYouDo:
      "You choose between a 25-hour group course over Zoom covering Python, neural networks, and AI ethics, or a mentored individual research fellowship.",
    whyWorthIt:
      "Need-based aid covers up to 100% of the fee, which matters because both options carry significant tuition.",
    fit: "For grades 9–12, online, choosing between the group course and the mentored fellowship.",
  },

  "chabot-galaxy-explorers": {
    whatYouDo:
      "You run museum demonstrations and join inquiry teams in engineering, climate tech, or digital media, with the chance of externships at partners such as NASA Ames.",
    whyWorthIt:
      "It's a multi-year Oakland program, so you build a role over time, and the annual cost is fully covered for students with demonstrated need.",
    fit: "For grades 9–12 across several fields, with the fee covered by need.",
  },

  "nasa-sees": {
    whatYouDo:
      "You work with real NASA mission data in astronomy, planetary science, or remote sensing, with an on-site session in Austin and virtual tracks available.",
    whyWorthIt:
      "It's free, it uses real mission data, and travel scholarships are available for the on-site portion.",
    fit: "U.S. citizens in grades 10–11 who are 16 by the start date.",
  },

  "ucsf-ai4all": {
    whatYouDo:
      "Ten weeks at UCSF Mission Bay working with faculty on biomedical research that uses data science and AI.",
    whyWorthIt:
      "You work on biomedical data projects with UCSF faculty, but the placement is unpaid and you commute daily — and it's restricted to SFUSD juniors in AP Statistics or AP Computer Science.",
    fit: "Juniors at SFUSD taking AP Statistics or AP Computer Science.",
  },

  frc: {
    whatYouDo:
      "Your team gets a common kit of parts and about six weeks to design and build an industrial-size robot for the season's game.",
    whyWorthIt:
      "The build season is short and team-based, and you join an existing school or community team rather than applying on your own — the team covers the season fee.",
    fit: "For grades 9–12 in engineering and computer science, competing through a registered team.",
  },

  ftc: {
    whatYouDo:
      "You design, build, and program a smaller reusable robot for the annual game — BIOBUZZ in the 2026-27 season — as part of a team.",
    whyWorthIt:
      "You join through a registered school or community team, so you don't have to organize a team yourself to take part.",
    fit: "For grades 9–12 in engineering and computer science, through a registered school or community team.",
  },

  "vex-v5": {
    whatYouDo:
      "You compete with a V5 robot in the 2026-27 game, Override, as part of a two-team alliance, starting at local fall tournaments and working toward the spring World Championship.",
    whyWorthIt:
      "The season has a visible ladder from local fall tournaments up to a World Championship, and you compete inside a registered team rather than solo.",
    fit: "For grades 9–12 in engineering and computer science.",
  },

  "science-olympiad": {
    whatYouDo:
      "Teams of up to 15 students prepare for 23 events across lab science, study topics, and build-and-test engineering, moving from regionals to state and then nationals.",
    whyWorthIt:
      "There are 23 event slots, so a team can spread across biology, chemistry, physics, and engineering rather than specialize, and the path runs up to nationals.",
    fit: "For grades 9–12, competing through your school's team.",
  },

  "technovation-girls": {
    whatYouDo:
      "You build a mobile app or AI project that addresses a community problem, work with a volunteer mentor, and submit code, a demo, and a business pitch.",
    whyWorthIt:
      "It's free, and you can register on your own without your school running a program.",
    fit: "Open to girls and gender-expansive students in grades 9–12.",
  },

  "mit-think": {
    whatYouDo:
      "You propose a STEM research or engineering project you haven't built yet — the proposal is the entry, not a finished project.",
    whyWorthIt:
      "Finalists get up to $1,000 in funding, weekly MIT mentorship, and an all-expenses-paid trip to MIT, and applying costs nothing.",
    fit: "For grades 9–12, solo or in pairs, in engineering, computer science, or physics.",
  },

  "genes-in-space": {
    whatYouDo:
      "You design a DNA-based biotechnology experiment that addresses a real challenge of space exploration, and submit the proposal.",
    whyWorthIt:
      "The winning proposal is actually run by astronauts aboard the ISS, and entering is free.",
    fit: "For grades 9–12 in biology and chemistry, solo or in teams of up to five.",
  },

  "blue-ocean": {
    whatYouDo:
      "You complete a free online mini-course, then submit a video pitch under five minutes for an original product idea.",
    whyWorthIt:
      "It's fully virtual, free, and no school sponsorship is needed — you can enter on your own.",
    fit: "For grades 9–12 in entrepreneurship and finance.",
  },

  "m3-challenge": {
    whatYouDo:
      "Teams of three to five students get one 14-hour window to build and write up a mathematical model of a real-world problem.",
    whyWorthIt:
      "It competes for over $100,000 in scholarships and costs nothing, though a teacher has to register the team.",
    fit: "For grades 11–12 in math and computer science, in teams of three to five.",
  },

  physicsbowl: {
    whatYouDo:
      "You sit a 40-question, 45-minute multiple-choice physics exam at your school in spring, in either the first-year or second-year division, scored individually and by team.",
    whyWorthIt:
      "The two divisions mean you aren't competing against students with an extra year of physics, and it's a short exam taken at school. Entry goes through a teacher.",
    fit: "For grades 9–12 in physics and math, entering through a teacher.",
  },

  nosb: {
    whatYouDo:
      "Your team competes buzzer-style at regionals on marine biology, chemistry, physics, geology, and ocean policy, with winners advancing to the national finals.",
    whyWorthIt:
      "A coach registers the team, so you don't handle entry yourself, and the subject range stretches from science into ocean policy.",
    fit: "For grades 9–12 in environmental science and biology, through a school or organization team.",
  },

  envirothon: {
    whatYouDo:
      "Teams of five test hands-on field knowledge of soils, aquatic ecology, forestry, wildlife, and a rotating current issue, moving from area to state to the North American finals.",
    whyWorthIt:
      "It's field-based rather than a written exam, and with five members a team can cover different stations. California entries route through California Envirothon.",
    fit: "For grades 9–12 in environmental science and biology, in teams of five.",
  },

  hosa: {
    whatYouDo:
      "You join your school's HOSA chapter and can compete in any of 70+ health-career events, attend leadership conferences, and take part in community health service, from state level up to international.",
    whyWorthIt:
      "With 70+ events a chapter can support a wide range of health interests, and the pathway runs all the way to international competition.",
    fit: "For grades 9–12 interested in health careers, joining through a school chapter.",
  },

  "national-history-day": {
    whatYouDo:
      "You research a topic tied to the year's theme and present it as a paper, exhibit, documentary, performance, or website, advancing from local and state contests to nationals in Maryland.",
    whyWorthIt:
      "You choose the format — paper, exhibit, documentary, performance, or website — so the project can match how you like to work, and the ladder runs to nationals.",
    fit: "For grades 9–12 in writing, arts, or law, with a research project tied to the annual theme.",
  },

  "stanford-csi": {
    whatYouDo:
      "Two weeks of clinical medicine — lectures, simulation labs, and hands-on skills practice — on campus or virtually.",
    whyWorthIt:
      "Fee waivers exist for households under $80,000, and the record is explicit that this is simulation-based instruction rather than patient shadowing.",
    fit: "For grades 11–12 in biology and psychology, with both on-campus and virtual options.",
  },

  "stanford-grips": {
    whatYouDo:
      "You spend eight weeks doing wet-lab genomics research with a Stanford mentor. The listing describes this as a Bay Area internship for students working in a lab setting, rather than a short lecture-based program.",
    whyWorthIt:
      "The internship is tuition-free apart from a waivable $55 application fee, so the main decision is whether the eligibility and location work for you. You get a focused eight-week research placement with Stanford mentorship instead of paying tuition for a general summer course.",
    fit: "You must be 16 or older, have a 3.0 GPA, and live in one of six Bay Area counties; Pathfind lists it for grades 10–12. That makes the county requirement and your ability to participate in a Bay Area lab just as important as your interest in biology or chemistry.",
  },

  smysp: {
    whatYouDo:
      "Five tuition-free weeks covering science, medicine, and public health, in a small cohort of juniors.",
    whyWorthIt:
      "It costs nothing and runs five weeks, but it's limited to low-income and/or first-generation students in Northern and Central California.",
    fit: "Grade 11 only, and limited to low-income and/or first-generation students in Northern and Central California.",
  },

  "ucsf-ssrp": {
    whatYouDo:
      "Seven full-time weeks paired one-on-one with UCSF researchers and clinicians, ending in a research symposium.",
    whyWorthIt:
      "High schoolers received a $3,000 stipend, and the program closes with a symposium where you present your work.",
    fit: "For grades 10–12 at age 16 or older, and you need to demonstrate economic, educational, or medical disadvantage.",
  },

  "ucsf-pitch": {
    whatYouDo:
      "Three weeks at UCSF exploring health and medical science careers through mentored investigations and college-readiness workshops.",
    whyWorthIt:
      "It's free and combines career exploration with college-readiness work, and first-generation and low-income students are prioritized.",
    fit: "For grades 9–10 with a 2.5 GPA minimum.",
  },

  "kp-launch": {
    whatYouDo:
      "A paid seven-week summer internship at a Northern California Kaiser facility, in a non-clinical role such as operations, IT, communications, or finance.",
    whyWorthIt:
      "It's paid and the roles are operational rather than clinical, which shows how a large health system runs day to day. Applications for 2027 open in November.",
    fit: "Ages 16–19 living in a Northern California Kaiser service area, across grades 11–12.",
  },

  "nylf-medicine": {
    whatYouDo:
      "Eight residential days on a host campus such as UC Berkeley, working through simulated trauma cases and suturing practice, with optional college credit.",
    whyWorthIt:
      "Admission is open enrollment rather than competitive, and optional college credit is available — but the clinical work is simulation, not patient contact.",
    fit: "For grades 9–12; it's tuition-based and in person.",
  },

  "sf-youth-commission": {
    whatYouDo:
      "You serve a year-long term on a 17-member commission that advises the Mayor and Board of Supervisors on youth budget and policy.",
    whyWorthIt:
      "It's the official youth voice in City Hall rather than a simulation, and the term runs a full year.",
    fit: "Open to San Francisco residents ages 12–23.",
  },

  "scc-youth-task-force": {
    whatYouDo:
      "You meet monthly in San Jose as part of a county advisory body, bringing student input to government and community-organization policy.",
    whyWorthIt:
      "The commitment is monthly rather than weekly, and the advising goes to real county policy rather than a classroom exercise.",
    fit: "For Santa Clara County students in grades 9–12.",
  },

  "oakland-yac": {
    whatYouDo:
      "You represent an Oakland council district on a commission of about 20 young people, meeting twice monthly at City Hall to advise the City Council and Mayor.",
    whyWorthIt:
      "It's unpaid, but dinner and transit are reimbursed, and the meetings put you in front of the City Council and Mayor twice a month.",
    fit: "Ages 13–21 in Oakland, across grades 9–12.",
  },

  "key-club": {
    whatYouDo:
      "You join your school's Key Club chapter and commit to at least 50 service hours a year, with the chapter run by students.",
    whyWorthIt:
      "It's student-led and exists on 5,000+ campuses, so a chapter may already be running at your school, and the annual dues are small.",
    fit: "For grades 9–12 with a service interest — and if your school has no chapter, the record says you can petition to start one.",
  },

  "interact-club": {
    whatYouDo:
      "You run at least two service projects a year — one local and one international — with mentorship from a sponsoring Rotary club.",
    whyWorthIt:
      "Members run the projects rather than only volunteering at them, and a Rotary club mentors the chapter throughout the year.",
    fit: "Ages 12–18 across grades 9–12, joining or starting a chapter through your school.",
  },

  "lockheed-martin-hs-internship": {
    whatYouDo:
      "Nine or more paid weeks working alongside aerospace and defense engineers on real projects at a Lockheed Martin site, with mentoring, workshops, and networking events.",
    whyWorthIt:
      "It's paid and runs nine-plus weeks on live engineering projects — but you have to live within commuting distance of one of the listed sites.",
    fit: "For grades 10–11 students 16 or older near a Lockheed Martin site; graduating seniors aren't eligible.",
  },

  "gtri-hs-summer-internship": {
    whatYouDo:
      "Five paid weeks working on real STEM research projects — robotics, drones, radar physics, piezoelectric systems — with GTRI engineers and scientists, up to 24 hours a week.",
    whyWorthIt:
      "It's paid and hands-on with research staff, but no housing is provided, so you need to be local. The session runs June 14 to July 23.",
    fit: "For Georgia residents in grades 9–12 who turn 16 by April 2027.",
  },

  "usc-unruh-hs-internship": {
    whatYouDo:
      "You research and write a legislative policy memo on a climate or sustainability bill, online, with mentorship and guest-speaker sessions from USC's Center for the Political Future.",
    whyWorthIt:
      "It's remote, so location isn't a factor, though it does require a 3.5 or higher unweighted GPA. The record notes 2027 dates aren't announced yet.",
    fit: "For rising sophomores, juniors, and seniors with a 3.5+ unweighted GPA; graduating seniors aren't eligible.",
  },

  "met-museum-hs-internship": {
    whatYouDo:
      "You're placed with Met museum professionals in a team such as curatorial, education, design, imaging, or social media, over the summer.",
    whyWorthIt:
      "It's paid, with a $1,100 completion stipend, and placements sit inside different museum departments. The record notes the 2027 deadline isn't published yet.",
    fit: "For NY/NJ/CT students in grades 10–11.",
  },
};

export function getOpportunityExplainer(
  id: string | null | undefined,
): OpportunityExplainer | null {
  if (!id) return null;
  return OPPORTUNITY_EXPLAINERS[id] ?? null;
}
