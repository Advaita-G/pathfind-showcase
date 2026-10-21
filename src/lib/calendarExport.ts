import type { Opportunity } from "../data/types";
import { daysUntil } from "./formatDeadline";

type CalendarOpportunity = Pick<Opportunity, "id" | "title" | "deadline" | "deadlineConfirmed" | "link">;

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

function foldLine(line: string): string {
  let result = "";
  let bytes = 0;
  for (const character of line) {
    const size = new TextEncoder().encode(character).length;
    if (bytes + size > 75) {
      result += "\r\n ";
      bytes = 1;
    }
    result += character;
    bytes += size;
  }
  return result;
}

export function calendarExport(opportunity: CalendarOpportunity, now = new Date()): string | null {
  const { deadline } = opportunity;
  if (!deadline || !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return null;
  const date = new Date(`${deadline}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== deadline || daysUntil(deadline, now) < 0) return null;
  const warning = "estimated deadline - confirm on the official site";
  const title = `${opportunity.title} - ${opportunity.deadlineConfirmed === false ? warning : "deadline"}`;
  const description = `${title}\nOfficial site: ${opportunity.link}`;
  date.setUTCDate(date.getUTCDate() + 1);
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Pathfind//Deadline Calendar//EN", "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${encodeURIComponent(opportunity.id)}@getpathfind.com`,
    `DTSTAMP:${now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    `DTSTART;VALUE=DATE:${deadline.replace(/-/g, "")}`,
    `DTEND;VALUE=DATE:${date.toISOString().slice(0, 10).replace(/-/g, "")}`,
    `SUMMARY:${escapeText(title)}`,
    `DESCRIPTION:${escapeText(description)}`,
    "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", `DESCRIPTION:${escapeText(title)}`,
    "END:VALARM", "END:VEVENT", "END:VCALENDAR", "",
  ].map(foldLine).join("\r\n");
}

export function downloadDeadlineCalendar(opportunity: CalendarOpportunity): void {
  const content = calendarExport(opportunity);
  if (!content) return;
  const url = URL.createObjectURL(new Blob([content], { type: "text/calendar;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${encodeURIComponent(opportunity.id)}-deadline.ics`;
  document.body.append(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    // Allow the browser to start reading the download before releasing its URL.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
