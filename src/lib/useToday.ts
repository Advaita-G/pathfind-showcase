import { useEffect, useState } from "react";

/**
 * Prerendered pages are written to disk at build time and served for weeks afterwards, so
 * anything derived from the current date — "42 days left" badges, which deadlines count as
 * upcoming — would disagree with the HTML React is hydrating (React error #418), and the
 * list order could differ from what a crawler read.
 *
 * The prerenderer therefore stamps the page with its build day, and pages render from that
 * stamp on the server *and* on the client's first pass. The effect below then re-reads the
 * real date, so a student always sees accurate counts and ordering a moment after load.
 */
const BUILD_DAY_META = 'meta[name="pathfind-build-day"]';

/** Local midnight for an ISO `YYYY-MM-DD` string; null when it isn't one. */
export function parseDay(value: string | null | undefined): Date | null {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** Set by the prerenderer before rendering, so the server and the client agree. */
let serverBuildDay: Date | null = null;

export function setServerBuildDay(value: string | null | undefined): void {
  serverBuildDay = parseDay(value);
}

/** The day the first render should use: the prerenderer's stamp when there is one. */
export function initialToday(): Date {
  if (serverBuildDay) return serverBuildDay;
  if (typeof document !== "undefined") {
    const fromMarkup = parseDay(document.querySelector(BUILD_DAY_META)?.getAttribute("content"));
    if (fromMarkup) return fromMarkup;
  }
  return new Date();
}

export function useToday(): Date {
  const [today, setToday] = useState<Date>(initialToday);

  useEffect(() => {
    setToday(new Date());
  }, []);

  return today;
}
