import { afterEach, describe, expect, it } from "vitest";
import { initialToday, parseDay, setServerBuildDay } from "./useToday";
import { daysUntil, formatDeadline } from "./formatDeadline";

afterEach(() => {
  setServerBuildDay(null);
  delete (globalThis as { document?: unknown }).document;
});

function stubDocument(buildDay: string | null) {
  (globalThis as { document?: unknown }).document = {
    querySelector: (selector: string) =>
      selector.includes("pathfind-build-day") && buildDay
        ? { getAttribute: () => buildDay }
        : null,
  };
}

describe("parseDay", () => {
  it("reads an ISO day as local midnight", () => {
    const date = parseDay("2026-09-14")!;
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(8);
    expect(date.getDate()).toBe(14);
  });

  it("rejects anything that isn't a plain ISO day", () => {
    expect(parseDay("2026-09-14T10:00:00Z")).toBeNull();
    expect(parseDay("")).toBeNull();
    expect(parseDay(null)).toBeNull();
    expect(parseDay(undefined)).toBeNull();
  });
});

describe("initialToday", () => {
  it("uses the stamp the prerenderer passed to the server render", () => {
    setServerBuildDay("2026-11-01");
    expect(initialToday().getDate()).toBe(1);
    expect(initialToday().getMonth()).toBe(10);
  });

  it("uses the page's build-day stamp during client hydration", () => {
    stubDocument("2026-11-01");
    // No server stamp here — this is the browser's first pass over prerendered HTML.
    expect(initialToday().getDate()).toBe(1);
  });

  it("falls back to the real date when the page carries no stamp", () => {
    stubDocument(null);
    const today = initialToday();
    const now = new Date();
    expect(today.getDate()).toBe(now.getDate());
    expect(today.getMonth()).toBe(now.getMonth());
  });
});

describe("date-derived card UI", () => {
  it("measures against whichever day the render was given", () => {
    // Same inputs, different reference day — this is what keeps the prerendered HTML and the
    // first client render identical instead of tripping React's hydration check.
    const buildDay = parseDay("2026-11-01")!;
    expect(daysUntil("2026-11-05", buildDay)).toBe(4);
    expect(daysUntil("2026-11-05", parseDay("2026-11-04")!)).toBe(1);
    expect(formatDeadline("2026-11-05")).toBe("Nov 5, 2026");
  });
});
