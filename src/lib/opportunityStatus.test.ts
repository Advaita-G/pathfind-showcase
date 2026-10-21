import { describe, expect, test } from "vitest";
import type { Opportunity } from "../data/types";
import {
  deadlineNotice,
  expectedToReopen,
  getOpportunityStatus,
  isCurrentlyOpen,
  isRecommendable,
  statusLabel,
} from "./opportunityStatus";

function makeOpportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: "test",
    title: "Test Opportunity",
    org: "Test Org",
    type: "Program",
    interests: ["cs"],
    minGrade: 9,
    maxGrade: 12,
    description: "A test opportunity.",
    link: "https://example.com",
    free: true,
    location: "Remote",
    ...overrides,
  };
}

const TODAY = new Date(2026, 8, 18); // 2026-09-18

describe("opportunity lifecycle status", () => {
  test("is OPEN while the deadline is still ahead", () => {
    const opportunity = makeOpportunity({ deadline: "2026-10-01" });

    expect(getOpportunityStatus(opportunity, TODAY)).toBe("OPEN");
    expect(isCurrentlyOpen(opportunity, TODAY)).toBe(true);
    expect(statusLabel(opportunity, TODAY)).toBeNull();
  });

  test("treats the deadline day itself as still open", () => {
    expect(getOpportunityStatus(makeOpportunity({ deadline: "2026-09-18" }), TODAY)).toBe("OPEN");
  });

  test("reports a passed deadline as closed, not open", () => {
    const opportunity = makeOpportunity({ deadline: "2026-08-01" });

    expect(getOpportunityStatus(opportunity, TODAY)).toBe("DEADLINE_PASSED");
    expect(isCurrentlyOpen(opportunity, TODAY)).toBe(false);
    expect(statusLabel(opportunity, TODAY)).toContain("expected to reopen next cycle");
  });

  test("a passed deadline never hides or disables the record", () => {
    const opportunity = makeOpportunity({ deadline: "2020-01-01" });

    expect(isRecommendable(opportunity)).toBe(true);
    expect(expectedToReopen(opportunity)).toBe(true);
  });

  test("says a cycle has closed when the program is not expected to repeat", () => {
    const opportunity = makeOpportunity({ deadline: "2026-08-01", recurring: false });

    expect(expectedToReopen(opportunity)).toBe(false);
    expect(statusLabel(opportunity, TODAY)).toBe("This cycle has closed");
  });

  test("treats a record without a published cycle as awaiting its next date", () => {
    const opportunity = makeOpportunity({ recurring: true });

    expect(getOpportunityStatus(opportunity, TODAY)).toBe("UNKNOWN");
    expect(statusLabel(opportunity, TODAY)).toBe("Next cycle not yet published");
  });

  test("treats a record with no deadline and no annual cycle as rolling", () => {
    const opportunity = makeOpportunity();

    expect(getOpportunityStatus(opportunity, TODAY)).toBe("RECURRING");
    expect(isCurrentlyOpen(opportunity, TODAY)).toBe(true);
  });

  test("marks applications that have not opened yet as upcoming", () => {
    const opportunity = makeOpportunity({
      applicationOpenDate: "2026-12-01",
      deadline: "2027-02-01",
    });

    expect(getOpportunityStatus(opportunity, TODAY)).toBe("UPCOMING");
    expect(statusLabel(opportunity, TODAY)).toBe("Applications not open yet");
  });

  test("only raises a badge when the student needs to act differently", () => {
    expect(deadlineNotice(makeOpportunity({ deadline: "2026-10-01" }), TODAY)).toBeNull();
    expect(deadlineNotice(makeOpportunity(), TODAY)).toBeNull();
    expect(deadlineNotice(makeOpportunity({ deadline: "2026-08-01" }), TODAY)).toContain(
      "expected to reopen next cycle",
    );
    expect(deadlineNotice(makeOpportunity({ inactive: true }), TODAY)).toBe("No longer running");
  });

  test("excludes programs their own source marked as ended", () => {
    const opportunity = makeOpportunity({ inactive: true });

    expect(getOpportunityStatus(opportunity, TODAY)).toBe("INACTIVE");
    expect(isRecommendable(opportunity)).toBe(false);
    expect(statusLabel(opportunity, TODAY)).toBe("No longer running");
  });
});
