import { describe, expect, test } from "vitest";
import { calendarExport } from "./calendarExport";

const now = new Date("2026-10-12T12:00:00Z");
const opportunity = { id: "sample", title: "Sample program", deadline: "2026-12-31", link: "https://example.org/apply" };
const unfold = (value: string) => value.replace(/\r\n /g, "");

describe("calendarExport", () => {
  test("exports a one-day all-day event with a reminder and stable UID", () => {
    const content = calendarExport(opportunity, now)!;
    expect(content).toContain("DTSTART;VALUE=DATE:20261231\r\n");
    expect(content).toContain("DTEND;VALUE=DATE:20270101\r\n");
    expect(content).toContain("DTSTAMP:20261012T120000Z\r\n");
    expect(content).toContain("BEGIN:VALARM\r\nTRIGGER:-P1D\r\nACTION:DISPLAY");
    expect(content).toContain("UID:sample@getpathfind.com\r\n");
    expect(calendarExport({ ...opportunity, deadline: "2027-01-01" }, now)).toContain("UID:sample@getpathfind.com\r\n");
    expect(content.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(content.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });

  test("labels estimated deadlines in both title and description with the official link", () => {
    const content = unfold(calendarExport({ ...opportunity, deadlineConfirmed: false }, now)!);
    const warning = "estimated deadline - confirm on the official site";
    expect(content).toContain(`SUMMARY:Sample program - ${warning}\r\n`);
    expect(content).toContain(`DESCRIPTION:Sample program - ${warning}\\nOfficial site: ${opportunity.link}`);
  });

  test("rejects missing, invalid, and past dates but allows today", () => {
    for (const deadline of [undefined, "", "2026-02-30", "2026-13-01", "10/13/2026", "2026-10-11"]) {
      expect(calendarExport({ ...opportunity, deadline }, now)).toBeNull();
    }
    expect(calendarExport({ ...opportunity, deadline: "2026-10-12" }, now)).not.toBeNull();
    expect(calendarExport({ ...opportunity, deadline: "2028-02-29" }, now)).toContain("DTEND;VALUE=DATE:20280301");
  });

  test("escapes text and folds UTF-8 lines without splitting characters", () => {
    const content = calendarExport({ ...opportunity, title: "A\\B;C,D\r\nInjected: " + "🎓".repeat(40) }, now)!;
    expect(unfold(content)).toContain("SUMMARY:A\\\\B\\;C\\,D\\nInjected: ");
    expect(unfold(content)).toContain("🎓".repeat(40));
    for (const line of content.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
});
