import { describe, expect, test } from "vitest";
import { describeIdeaMatch, diversifyIdeas, matchPathfindIdeas, personalizeIdea } from "./matchPathfindIdeas";
import { DEMO_PATHFIND_IDEAS, type PathfindIdea } from "../data/pathfindIdeas";
import { INTERESTS, type Cause, type Interest, type Skill } from "../data/types";

function makeIdea(overrides: Partial<PathfindIdea>): PathfindIdea {
  return {
    id: "test-idea",
    title: "Test idea",
    summary: "A test idea.",
    description: "Build a concrete prototype for a real audience. Test it with users and revise it using what you learn.",
    category: "build",
    matchesInterests: ["cs"],
    matchesCauses: ["technology"],
    difficulty: "beginner",
    weeklyHours: "2-3 hours",
    minWeeklyHours: 2,
    duration: "4 weeks",
    cost: "Free",
    skillsRequired: [],
    skillsYouWillLearn: [],
    firstStep: "Start.",
    roadmap: [],
    deliverables: [],
    potentialImpact: "Some impact.",
    relatedOpportunityIds: [],
    ...overrides,
  };
}

describe("matchPathfindIdeas", () => {
  test("returns nothing when no interests are selected", () => {
    const ideas = [makeIdea({ id: "a" })];
    expect(matchPathfindIdeas(ideas, [], [], null)).toEqual([]);
  });

  test("matches ideas sharing at least one interest", () => {
    const csIdea = makeIdea({ id: "cs-idea", matchesInterests: ["cs"] });
    const bioIdea = makeIdea({ id: "bio-idea", matchesInterests: ["biology"] });

    const result = matchPathfindIdeas([csIdea, bioIdea], ["cs"], [], null);

    expect(result.map((i) => i.id)).toEqual(["cs-idea"]);
  });

  test("treats a custom Machine Learning interest as AI without changing the title", () => {
    const result = matchPathfindIdeas(
      DEMO_PATHFIND_IDEAS,
      ["Machine Learning" as Interest],
      ["community"],
      "2-5 hrs/week",
      ["decide"],
      ["python"],
    );

    expect(result[0]?.id).toBe("neighborhood-ml-model");
    const project = personalizeIdea(
      result[0]!,
      ["Machine Learning"],
      [],
      ["decide"],
      ["python"],
      null,
      "2-5 hrs/week",
    );
    expect(project.title).toBe(result[0]!.title);
    expect(project.description.toLowerCase()).toContain("machine-learning");
  });

  test("matches any custom Other value only when the idea actually mentions it", () => {
    const result = matchPathfindIdeas(
      DEMO_PATHFIND_IDEAS,
      ["water quality" as Interest],
      [],
      null,
    );

    expect(result[0]?.id).toBe("creek-water-quality-monitoring");
    expect(result.every((idea) => idea.id !== "community-issue-mini-doc")).toBe(true);
  });

  test("puts ideas that fit the weekly budget first and only appends heavier ones when few fit", () => {
    const light = makeIdea({ id: "light", minWeeklyHours: 1 });
    const heavy = makeIdea({ id: "heavy", minWeeklyHours: 6 });

    // Only one idea fits: the heavy one is appended (flagged by describeIdeaMatch) rather than
    // leaving a student with real interests looking at an empty list.
    expect(matchPathfindIdeas([heavy, light], ["cs"], [], "< 2 hrs/week").map((i) => i.id)).toEqual(["light", "heavy"]);

    // Enough ideas fit: the heavy one is dropped entirely.
    const fits = [1, 2, 3].map((n) => makeIdea({ id: `fit-${n}`, minWeeklyHours: 1 }));
    const ids = matchPathfindIdeas([heavy, ...fits], ["cs"], [], "< 2 hrs/week").map((i) => i.id);
    expect(ids).not.toContain("heavy");
    expect(ids).toHaveLength(3);
  });

  test("sorts ideas that also match a selected cause first", () => {
    const noCause = makeIdea({ id: "no-cause", matchesCauses: ["arts"] });
    const withCause = makeIdea({ id: "with-cause", matchesCauses: ["climate"] });

    const result = matchPathfindIdeas([noCause, withCause], ["cs"], ["climate"], null);

    expect(result.map((i) => i.id)).toEqual(["with-cause", "no-cause"]);
  });

  test("prioritizes ideas aligned with the selected goal", () => {
    const teaching = makeIdea({ id: "teaching", category: "teach" });
    const building = makeIdea({ id: "building", category: "build" });

    const result = matchPathfindIdeas(
      [building, teaching],
      ["cs"],
      [],
      null,
      ["teach"],
    );

    expect(result.map((idea) => idea.id)).toEqual(["teaching", "building"]);
  });

  test("can prioritize categories from multiple selected goals", () => {
    const teaching = makeIdea({ id: "teaching", category: "teach" });
    const research = makeIdea({ id: "research", category: "research" });
    const contributing = makeIdea({ id: "contributing", category: "contribute" });

    const result = matchPathfindIdeas(
      [contributing, teaching, research],
      ["cs"],
      [],
      null,
      ["teach", "research"],
    );

    expect(result.map((idea) => idea.id)).toEqual(["teaching", "research", "contributing"]);
  });

  test("uses selected skill labels as a ranking signal", () => {
    const noSkillMatch = makeIdea({ id: "no-match", skillsRequired: ["Java"] });
    const skillMatch = makeIdea({ id: "match", skillsRequired: ["Python basics"] });

    const result = matchPathfindIdeas(
      [noSkillMatch, skillMatch],
      ["cs"],
      [],
      null,
      [],
      ["python"],
    );

    expect(result.map((idea) => idea.id)).toEqual(["match", "no-match"]);
  });

  test("keeps direct interest matches ahead of broader route ideas", () => {
    const direct = makeIdea({ id: "direct", matchesInterests: ["finance"] });
    const broader = makeIdea({
      id: "broader",
      category: "teach",
      matchesInterests: ["writing"],
      matchesCauses: ["education"],
    });

    const result = matchPathfindIdeas(
      [broader, direct],
      ["finance"],
      ["education"],
      null,
      ["teach"],
    );

    expect(result.map((idea) => idea.id)).toEqual(["direct", "broader"]);
  });

  test("uses explicit adjacent interests when direct coverage is sparse", () => {
    const direct = makeIdea({ id: "direct", matchesInterests: ["physics"] });
    const adjacent = makeIdea({ id: "adjacent", matchesInterests: ["engineering"] });
    const unrelated = makeIdea({ id: "unrelated", matchesInterests: ["arts"] });

    const result = matchPathfindIdeas(
      [unrelated, adjacent, direct],
      ["physics"],
      [],
      null,
    );

    expect(result.map((idea) => idea.id)).toEqual(["direct", "adjacent"]);
  });

  test("returns deterministic ordering for tied ideas", () => {
    const first = makeIdea({ id: "first" });
    const second = makeIdea({ id: "second" });

    expect(matchPathfindIdeas([first, second], ["cs"], [], null).map((idea) => idea.id))
      .toEqual(["first", "second"]);
  });

  test.each(INTERESTS.map((interest) => interest.id))(
    "provides at least three time-compatible catalog ideas for %s",
    (interest) => {
      const result = matchPathfindIdeas(
        DEMO_PATHFIND_IDEAS,
        [interest],
        [],
        "< 2 hrs/week",
      );

      expect(result.length).toBeGreaterThanOrEqual(3);
      expect(result.every((idea) => idea.minWeeklyHours <= 2)).toBe(true);
      expect(result[0]?.matchesInterests).toContain(interest);
    },
  );
});

describe("multi-signal personalization", () => {
  // Four Build My Path test profiles spanning different interests, skills, causes and
  // goals, used to check that passion-project recommendations are genuinely tailored
  // rather than converging on the same generic pick for anyone sharing one interest.
  const studentA = {
    interests: ["law"] as Interest[],
    causes: ["education"] as Cause[],
    skills: ["web-dev", "leadership"] as Skill[],
    goals: ["build"],
  };
  // Same as student A but with no goal selected — the exact minimal profile a student
  // gets after only filling interests/causes/skills. A broadly-tagged idea that merely
  // shares the "law" interest (e.g. one also tagged debate/writing/service) must not
  // out-rank the idea that actually combines law + education + web-dev/leadership,
  // just because it racks up "related interest" credit from its own wide tagging.
  const studentAWithoutGoal = {
    interests: ["law"] as Interest[],
    causes: ["education"] as Cause[],
    skills: ["web-dev", "leadership"] as Skill[],
    goals: [] as string[],
  };
  const studentB = {
    interests: ["law", "ai"] as Interest[],
    causes: ["privacy"] as unknown as Cause[], // a custom "Other" cause, not a canonical id
    skills: ["python"] as Skill[],
    goals: ["research"],
  };
  const studentC = {
    interests: ["biology"] as Interest[],
    causes: ["health"] as Cause[],
    skills: ["research"] as Skill[],
    goals: ["research"],
  };
  const studentD = {
    interests: ["cs", "entrepreneurship"] as Interest[],
    causes: ["education"] as Cause[],
    skills: [] as Skill[],
    goals: ["build"],
  };

  function topIdeasFor(student: { interests: Interest[]; causes: Cause[]; skills: Skill[]; goals: string[] }) {
    return matchPathfindIdeas(
      DEMO_PATHFIND_IDEAS,
      student.interests,
      student.causes,
      null,
      student.goals,
      student.skills,
    );
  }

  test("student A (law + education + web-dev + leadership) leads with the civic web project", () => {
    const ranked = topIdeasFor(studentA);
    expect(ranked[0]?.id).toBe("school-board-explainer-site");
  });

  test("student A still leads with the tailored idea with no goal selected (regression: broad tagging must not out-rank a real multi-signal match)", () => {
    const ranked = topIdeasFor(studentAWithoutGoal);
    expect(ranked[0]?.id).toBe("school-board-explainer-site");
  });

  test("student B (law + AI + python + privacy) leads with the AI privacy tracker", () => {
    const ranked = topIdeasFor(studentB);
    expect(ranked[0]?.id).toBe("ai-privacy-policy-tracker");
  });

  test("students A and B get materially different top picks despite sharing the 'law' interest", () => {
    const topA = topIdeasFor(studentA).slice(0, 3).map((idea) => idea.id);
    const topB = topIdeasFor(studentB).slice(0, 3).map((idea) => idea.id);
    expect(topA[0]).not.toBe(topB[0]);
    // Materially different, not necessarily zero-overlap — a shared "law" idea further
    // down a 3-item shortlist is fine as long as the top pick and overall set diverge.
    const overlap = topA.filter((id) => topB.includes(id));
    expect(overlap.length).toBeLessThan(topA.length);
  });

  test("students C and D (no shared interests, causes, or skills) get disjoint top-3 shortlists", () => {
    const topC = topIdeasFor(studentC).slice(0, 3).map((idea) => idea.id);
    const topD = topIdeasFor(studentD).slice(0, 3).map((idea) => idea.id);
    expect(topC.some((id) => topD.includes(id))).toBe(false);
  });

  test("grade, time, and profile combinations personalize the displayed project brief", () => {
    const base = DEMO_PATHFIND_IDEAS.find((idea) => idea.id === "school-board-explainer-site")!;
    const project = personalizeIdea(
      base,
      ["law", "education access", "leadership web rebuild"],
      ["education access"],
      ["build"],
      ["leadership"],
      9,
      "2-5 hrs/week",
    );
    expect(project.title).toBe(base.title);
    expect(project.summary).toContain("grade 9");
    expect(project.summary).toContain("2-5 hrs/week");
    expect(project.summary).toContain("build");
    expect(project.firstStep).toBe(base.firstStep);
    expect(base.title).toBe("A plain-language guide to your school board");
  });

  test("the personalized briefs for A–D are materially different", () => {
    const base = DEMO_PATHFIND_IDEAS.find((idea) => idea.id === "student-policy-brief")!;
    const projects = [
      personalizeIdea(base, ["law"], ["education access"], ["build"], ["leadership"], 9, "2-5 hrs/week"),
      personalizeIdea(base, ["law", "ai"], ["privacy"], ["research"], ["python"], 12, "5-10 hrs/week"),
      personalizeIdea(base, ["biology"], ["public health"], ["research"], ["research"], 11, "2-5 hrs/week"),
      personalizeIdea(base, ["cs", "entrepreneurship"], ["education access"], ["build"], ["python"], 10, "< 2 hrs/week"),
    ];
    expect(new Set(projects.map((project) => project.title)).size).toBe(1);
    expect(new Set(projects.map((project) => project.summary)).size).toBeGreaterThanOrEqual(3);
  });

  test("the match explanation for student A names their actual selections", () => {
    const idea = topIdeasFor(studentA)[0]!;
    const reason = describeIdeaMatch(idea, studentA.interests, studentA.causes, studentA.goals, studentA.skills);
    expect(reason).toContain("You selected");
    expect(reason).toMatch(/Law & Public Policy/);
    expect(reason).toMatch(/Education/);
    expect(reason).toMatch(/Web dev|Leadership/);
  });

  test("the match explanation for student B surfaces the custom 'privacy' cause verbatim", () => {
    const idea = topIdeasFor(studentB)[0]!;
    const reason = describeIdeaMatch(idea, studentB.interests, studentB.causes, studentB.goals, studentB.skills);
    expect(reason).toContain("You selected");
    expect(reason.toLowerCase()).toContain("privacy");
  });

  test("an unmatched custom cause does not appear in the explanation (never invented)", () => {
    const idea = topIdeasFor(studentA)[0]!;
    const reason = describeIdeaMatch(
      idea,
      studentA.interests,
      ["some-totally-unrelated-made-up-cause"] as unknown as Cause[],
      studentA.goals,
      studentA.skills,
    );
    expect(reason.toLowerCase()).not.toContain("totally-unrelated");
  });
});

describe("diversifyIdeas", () => {
  function idea(id: string, category: PathfindIdea["category"]): PathfindIdea {
    return {
      id,
      title: id,
      summary: "s",
      description: "A".repeat(200),
      category,
      matchesInterests: ["cs"],
      matchesCauses: [],
      difficulty: "beginner",
      weeklyHours: "1-2 hours",
      minWeeklyHours: 1,
      duration: "1 week",
      cost: "Free",
      skillsRequired: [],
      skillsYouWillLearn: [],
      firstStep: "Start.",
      roadmap: [],
      deliverables: [],
      potentialImpact: "impact",
      relatedOpportunityIds: [],
    };
  }

  test("spreads a top-3 shortlist across build, research, and community when the ranked list allows it", () => {
    const ranked = [
      idea("build-1", "build"),
      idea("build-2", "create"),
      idea("research-1", "research"),
      idea("teach-1", "teach"),
    ];
    const result = diversifyIdeas(ranked, 3);
    expect(result.map((i) => i.id)).toEqual(["build-1", "research-1", "teach-1"]);
  });

  test("never displaces the single best match to force variety", () => {
    const ranked = [idea("best", "build"), idea("second", "create"), idea("third", "build")];
    const result = diversifyIdeas(ranked, 2);
    expect(result[0]?.id).toBe("best");
  });

  test("falls back to rank order once every bucket is already covered", () => {
    const ranked = [
      idea("build-1", "build"),
      idea("research-1", "research"),
      idea("teach-1", "teach"),
      idea("build-2", "build"),
    ];
    const result = diversifyIdeas(ranked, 4);
    expect(result.map((i) => i.id)).toEqual(["build-1", "research-1", "teach-1", "build-2"]);
  });
});

describe("Pathfind idea catalog integrity", () => {
  test.each(DEMO_PATHFIND_IDEAS)(
    "$id has a substantive 2–3 sentence description",
    (idea) => {
      const sentences = idea.description
        .split(/(?<=[.!?])\s+/)
        .filter(Boolean);

      expect(idea.description).toBe(idea.description.trim());
      expect(sentences.length).toBeGreaterThanOrEqual(2);
      expect(sentences.length).toBeLessThanOrEqual(3);
      // Structured library ideas split the same substance across `problem`, `whoItHelps`, and
      // `portfolioValue` (all rendered on the card), so their description can be shorter.
      expect(idea.description.length).toBeGreaterThanOrEqual(idea.problem ? 110 : 180);
      expect(idea.description).not.toBe(idea.summary);
    },
  );

  test.each(DEMO_PATHFIND_IDEAS)(
    "$id description does not repeat a roadmap step",
    (idea) => {
      for (const step of idea.roadmap) {
        expect(idea.description).not.toContain(step);
      }
    },
  );
});

describe("structured idea library personalization", () => {
  const top = (ids: PathfindIdea[], n = 5) => ids.slice(0, n).map((idea) => idea.id);
  const sportsIds = new Set([
    "serve-trajectory-tracker",
    "jump-height-predictor",
    "team-stats-dashboard",
    "pose-estimation-form-feedback",
    "college-roster-analytics",
  ]);
  const financeIds = new Set([
    "news-sentiment-vs-price",
    "earnings-call-language",
    "portfolio-risk-dashboard",
    "factor-model-experiment",
    "transaction-anomaly-detection",
  ]);

  test("AI + a typed 'volleyball' interest surfaces volleyball analytics projects first", () => {
    const ranked = matchPathfindIdeas(DEMO_PATHFIND_IDEAS, ["ai", "volleyball" as Interest], ["sports"], null);
    expect(top(ranked).filter((id) => sportsIds.has(id)).length).toBeGreaterThanOrEqual(3);
  });

  test("AI + finance surfaces quant projects first", () => {
    const ranked = matchPathfindIdeas(DEMO_PATHFIND_IDEAS, ["ai", "finance"], [], null);
    expect(top(ranked).filter((id) => financeIds.has(id)).length).toBeGreaterThanOrEqual(3);
  });

  test("a typed 'Other' is not treated as a real interest", () => {
    const ranked = matchPathfindIdeas(DEMO_PATHFIND_IDEAS, ["Other" as Interest], [], null);
    expect(ranked).toEqual([]);
  });

  test("custom terms match at word starts only", () => {
    const idea = makeIdea({ id: "art-idea", title: "Start a club", summary: "Start something." });
    expect(matchPathfindIdeas([idea], ["art" as Interest], [], null)).toEqual([]);
  });

  test("a saved related opportunity lifts the idea that builds toward it", () => {
    const plain = matchPathfindIdeas(DEMO_PATHFIND_IDEAS, ["biology"], [], null);
    const target = plain.find((idea, i) => i >= 3 && idea.relatedOpportunityIds.includes("usabo"))!;
    const withSaved = matchPathfindIdeas(DEMO_PATHFIND_IDEAS, ["biology"], [], null, [], [], null, ["usabo"]);
    expect(withSaved.indexOf(target)).toBeLessThan(plain.indexOf(target));
  });

  test("9th graders without matching skills see finishable ideas before advanced ones", () => {
    const ranked = matchPathfindIdeas(DEMO_PATHFIND_IDEAS, ["ai"], [], null, [], [], 9);
    expect(ranked.slice(0, 3).every((idea) => idea.difficulty !== "advanced")).toBe(true);
  });
});
