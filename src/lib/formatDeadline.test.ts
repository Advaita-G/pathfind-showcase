import { describe, expect, test } from "vitest";
import { formatDeadline, daysUntil } from "./formatDeadline";

describe("formatDeadline", () => {
  test("formats an ISO date as a readable month, day, and year", () => {
    expect(formatDeadline("2027-02-05")).toBe("Feb 5, 2027");
  });
});

describe("daysUntil", () => {
  test("returns the number of whole days between today and the deadline", () => {
    const today = new Date("2026-09-04T00:00:00");

    expect(daysUntil("2026-09-10", today)).toBe(6);
  });

  test("returns a negative number for a deadline that has already passed", () => {
    const today = new Date("2026-09-04T00:00:00");

    expect(daysUntil("2026-09-01", today)).toBe(-3);
  });
});
