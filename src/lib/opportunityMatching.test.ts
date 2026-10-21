import { describe, expect, test } from "vitest";
import { hasBroadInterest, isBroadInterest, rankOpportunities } from "./opportunityMatching";
import type { Opportunity } from "../data/types";

function makeOpportunity(overrides: Partial<Opportunity>): Opportunity {
  return {
    id: "test",
    title: "Test Opportunity",
    org: "Test Org",
    type: "Program",
    interests: ["law"],
    minGrade: 9,
    maxGrade: 12,
    description: "A test opportunity.",
    link: "https://example.com",
    free: true,
    location: "Remote",
    ...overrides,
  };
}

describe("opportunity matching", () => {
  test("recognizes unknown/custom interests as broad preferences", () => {
    expect(isBroadInterest("political science")).toBe(true);
    expect(hasBroadInterest(["political science"])).toBe(true);
    expect(hasBroadInterest(["law"])).toBe(false);
  });

  test("ranks a custom text match first", () => {
    const ranked = rankOpportunities(
      [
        makeOpportunity({ id: "generic", title: "General Program" }),
        makeOpportunity({ id: "policy", title: "Political Science Policy Lab", description: "Study government and political science." }),
      ],
      { interests: ["political science"] },
    );

    expect(ranked[0]?.id).toBe("policy");
  });

  test("uses grade, skill, cause, and location as ranking signals without requiring them", () => {
    const ranked = rankOpportunities(
      [
        makeOpportunity({ id: "generic", location: "Remote", description: "General program." }),
        makeOpportunity({ id: "fit", location: "In-Person", description: "Public policy research with data analysis for community health." }),
      ],
      {
        interests: ["political science"],
        grade: 10,
        skills: ["data"],
        causes: ["health"],
        location: "In-Person",
      },
    );

    expect(ranked[0]?.id).toBe("fit");
  });
});
