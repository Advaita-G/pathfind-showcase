import { OPPORTUNITIES } from "../data/opportunities";
import { DEMO_PATHFIND_IDEAS } from "../data/pathfindIdeas";
import { ALL_CATEGORIES } from "./categories";
import { GUIDES } from "./guides";

export interface RouteEntry {
  path: string;
  priority: number;
  /**
   * App pages that need real HTML on a direct visit but must stay out of search results
   * (currently just /profile). Prerendered with noindex and excluded from the sitemap.
   */
  noindex?: boolean;
}

export function buildAllRoutes(): RouteEntry[] {
  const routes: RouteEntry[] = [
    { path: "/opportunities", priority: 0.9 },
    // The profile is a private app page: it needs a working direct-hit URL (a 404 on
    // refresh is what students would hit otherwise), but it must never be indexed or
    // listed in the sitemap.
    { path: "/profile", priority: 0.3, noindex: true },
    // Private planner and read-only shared view (token lives in the URL hash, never sent to the server).
    { path: "/plans", priority: 0.3, noindex: true },
    { path: "/shared", priority: 0.3, noindex: true },
  ];

  for (const category of ALL_CATEGORIES) {
    routes.push({ path: category.path, priority: 0.8 });
  }

  routes.push({ path: "/guides", priority: 0.8 });
  for (const guide of GUIDES) {
    routes.push({ path: guide.path, priority: 0.8 });
  }

  for (const opportunity of OPPORTUNITIES) {
    routes.push({ path: `/opportunities/${opportunity.id}`, priority: 0.6 });
  }

  // Pathfind ideas are AI-style suggestions, not verified programs: reachable by direct link, never indexed.
  for (const idea of DEMO_PATHFIND_IDEAS) {
    routes.push({ path: `/ideas/${idea.id}`, priority: 0.3, noindex: true });
  }

  return routes;
}
